import { getData, getFacultyData, uploadExcel, uploadFacultyExcel, reloadData, reloadFacultyData } from '../api'
import { parseCourseWorkbook, parseCourseWorkbookSync } from '../parsers/courseParser'
import { parseFacultyWorkbook, parseFacultyWorkbookSync, rebuildFacultyFromTeachers, normalizeLabName } from '../parsers/facultyParser'
import { readWorkbookFromUrl } from '../parsers/xlsxUtils'
import { loadDataConfig, resetDataConfigCache, resolveCloudUrl, cloudFileLabel, type DataConfig } from './cloudConfig'
import type { GraphData } from '../types'
import type { FacultyData } from '../types/faculty'

export type DataMode = 'server' | 'client' | 'cloud'

/** 仅缓存「后端可用」；不可用时不缓存，避免后端晚启动时永久误判 */
let backendOkCache = false
let backendOkAt = 0
const BACKEND_OK_TTL_MS = 30_000

export async function isBackendAvailable(): Promise<boolean> {
  if (backendOkCache && Date.now() - backendOkAt < BACKEND_OK_TTL_MS) {
    return true
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch('/api/health', { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      backendOkCache = true
      backendOkAt = Date.now()
      return true
    }
  } catch {
    // 不缓存 false，下次仍会重试
  }
  backendOkCache = false
  return false
}

export function resetBackendCache(): void {
  backendOkCache = false
  backendOkAt = 0
}

async function loadCourseFromCloud(config: DataConfig): Promise<GraphData> {
  if (!config.courseExcel) throw new Error('未配置 courseExcel')
  const url = resolveCloudUrl(config.courseExcel, config.cacheBust !== false)
  const wb = await readWorkbookFromUrl(url)
  return parseCourseWorkbookSync(wb)
}

async function loadFacultyFromCloud(config: DataConfig, canonicalLabs?: string[]): Promise<FacultyData> {
  if (!config.facultyExcel) throw new Error('未配置 facultyExcel')
  const url = resolveCloudUrl(config.facultyExcel, config.cacheBust !== false)
  const wb = await readWorkbookFromUrl(url)
  return parseFacultyWorkbookSync(wb, canonicalLabs, cloudFileLabel(config.facultyExcel))
}

async function tryLoadCourseFromCloud(): Promise<{ data: GraphData; mode: DataMode } | null> {
  const config = await loadDataConfig()
  if (!config?.courseExcel) return null
  try {
    return { data: await loadCourseFromCloud(config), mode: 'cloud' }
  } catch {
    return null
  }
}

async function tryLoadFacultyFromCloud(canonicalLabs?: string[]): Promise<{ data: FacultyData; mode: DataMode } | null> {
  const config = await loadDataConfig()
  if (!config?.facultyExcel) return null
  try {
    return { data: await loadFacultyFromCloud(config, canonicalLabs), mode: 'cloud' }
  } catch {
    return null
  }
}

export async function loadCourseData(): Promise<{ data: GraphData; mode: DataMode }> {
  if (await isBackendAvailable()) {
    try {
      return { data: await getData(), mode: 'server' }
    } catch {
      // 后端在但尚无数据 → 尝试云端/本地 public/data
      const cloud = await tryLoadCourseFromCloud()
      if (cloud) return cloud
      throw new Error('SERVER_NO_DATA')
    }
  }
  const cloud = await tryLoadCourseFromCloud()
  if (cloud) return cloud
  throw new Error('OFFLINE_NO_DATA')
}

export async function loadFacultyDataSafe(canonicalLabs?: string[]): Promise<{ data: FacultyData; mode: DataMode } | null> {
  if (await isBackendAvailable()) {
    try {
      return { data: await getFacultyData(), mode: 'server' }
    } catch {
      return tryLoadFacultyFromCloud(canonicalLabs)
    }
  }
  return tryLoadFacultyFromCloud(canonicalLabs)
}

export async function uploadCourseWithFallback(file: File): Promise<{ data: GraphData; mode: DataMode }> {
  if (await isBackendAvailable()) {
    try {
      await uploadExcel(file)
      resetBackendCache()
      return { data: await getData(), mode: 'server' }
    } catch {
      // 服务端上传/解析失败 → 本地解析
    }
  }
  return { data: await parseCourseWorkbook(file), mode: 'client' }
}

export async function uploadFacultyWithFallback(
  file: File,
  canonicalLabs?: string[],
): Promise<{ data: FacultyData; mode: DataMode }> {
  if (await isBackendAvailable()) {
    try {
      await uploadFacultyExcel(file)
      resetBackendCache()
      return { data: await getFacultyData(), mode: 'server' }
    } catch {
      // fallback
    }
  }
  return { data: await parseFacultyWorkbook(file, canonicalLabs), mode: 'client' }
}

export async function reloadAllFromServer(): Promise<{
  course: GraphData | null
  faculty: FacultyData | null
  mode: DataMode
}> {
  resetBackendCache()
  resetDataConfigCache()

  if (await isBackendAvailable()) {
    let course: GraphData | null = null
    let faculty: FacultyData | null = null
    try {
      await reloadData()
      course = await getData()
    } catch {
      course = (await tryLoadCourseFromCloud())?.data ?? null
    }
    try {
      await reloadFacultyData()
      faculty = await getFacultyData()
    } catch {
      faculty = (await tryLoadFacultyFromCloud(course?.labs.map((l) => l.name)))?.data ?? null
    }
    const mode: DataMode = course || faculty ? 'server' : 'client'
    return { course, faculty, mode }
  }

  const config = await loadDataConfig(true)
  if (!config) {
    return { course: null, faculty: null, mode: 'client' }
  }

  let course: GraphData | null = null
  let faculty: FacultyData | null = null
  try {
    if (config.courseExcel) course = await loadCourseFromCloud(config)
  } catch { /* ignore */ }
  try {
    if (config.facultyExcel) {
      faculty = await loadFacultyFromCloud(config, course?.labs.map((l) => l.name))
    }
  } catch { /* ignore */ }
  return { course, faculty, mode: 'cloud' }
}

/** 纯前端模式：课程更新后重新归一化师资实训室名称 */
export function renormalizeFaculty(faculty: FacultyData, courseData: GraphData): FacultyData {
  const canonicalLabs = courseData.labs.map((l) => l.name)
  const teachers = faculty.teachers.map((t) => {
    const raw = t.lab_list.length ? t.lab_list : t.matched_labs.split(/\n+/)
    const labList = [...new Set(raw.map((lab) => normalizeLabName(lab, canonicalLabs)).filter(Boolean))]
    return { ...t, lab_list: labList, matched_labs: labList.join('\n'), matched_lab_count: labList.length }
  })
  return rebuildFacultyFromTeachers(teachers, canonicalLabs, faculty.meta.source_file, faculty.top_priority)
}
