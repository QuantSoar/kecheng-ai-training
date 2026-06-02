import type {
  CurriculumDesignData,
  CurriculumTrackCourse,
  CourseJobLinkIndex,
  LabCurriculumSummary,
  TrainingTrack,
} from '../types/curriculumDesign'
import type { LabLinkLevel } from '../types/jobMap'
import { normalizeMatrixLabName } from './jobMapParser'
import { cellStr, sheetRows, readWorkbookFromFile, findHeaderRow } from './xlsxUtils'
import type * as XLSX from 'xlsx'

const LINK_MAP: Record<string, LabLinkLevel> = {
  '●': 'core',
  '◐': 'important',
  '○': 'basic',
}

function parseLink(val: string): LabLinkLevel {
  return LINK_MAP[val.trim()] ?? 'important'
}

function splitSlashList(text: string): string[] {
  return text.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)
}

function parseLabHeader(text: string): string {
  const m = text.match(/^\d+\.\s*(.+?)(?:\s*[—\-]|$)/)
  if (!m) return ''
  return normalizeMatrixLabName(m[1].trim())
}

function parseTrackSheet(wb: XLSX.WorkBook, sheetName: string, track: TrainingTrack): CurriculumTrackCourse[] {
  const rows = sheetRows(wb, sheetName)
  let currentLab = ''
  const result: CurriculumTrackCourse[] = []

  for (const row of rows) {
    const raw0 = row[0]
    const text0 = cellStr(raw0)
    if (text0.includes('实训室') && /^\d+\./.test(text0)) {
      currentLab = parseLabHeader(text0)
      continue
    }
    if (text0 === '序号' || text0.includes('课程类型')) continue
    const seq = parseInt(text0, 10)
    const courseName = cellStr(row[2])
    if (!Number.isFinite(seq) || seq <= 0 || !courseName) continue
    if (!currentLab) continue

    result.push({
      lab: currentLab,
      track,
      courseType: cellStr(row[1]),
      courseName,
      hours: cellStr(row[3]),
      objective: cellStr(row[4]),
      project: cellStr(row[5]),
      exam: cellStr(row[6]),
      materials: cellStr(row[7]),
    })
  }
  return result
}

function parseOverviewSheet(wb: XLSX.WorkBook): LabCurriculumSummary[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('汇总'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['实训室名称', '课程总数'])
  const result: LabCurriculumSummary[] = []

  for (const row of rows.slice(headerIdx + 1)) {
    const lab = normalizeMatrixLabName(cellStr(row[1]))
    if (!lab) continue
    result.push({
      lab,
      totalCourses: parseInt(cellStr(row[2]), 10) || 0,
      enterpriseCount: parseInt(cellStr(row[3]), 10) || 0,
      internshipCount: parseInt(cellStr(row[4]), 10) || 0,
      industryCount: parseInt(cellStr(row[5]), 10) || 0,
      coreJobs: splitSlashList(cellStr(row[6])),
      importantJobs: splitSlashList(cellStr(row[7])),
      basicJobs: splitSlashList(cellStr(row[8])),
    })
  }
  return result
}

function parseCourseJobIndex(wb: XLSX.WorkBook): CourseJobLinkIndex[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('课程-岗位') || n.includes('岗位关联'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['实训室名称', '课程名称', '适用岗位'])
  const result: CourseJobLinkIndex[] = []

  for (const row of rows.slice(headerIdx + 1)) {
    const lab = normalizeMatrixLabName(cellStr(row[0]))
    const courseName = cellStr(row[2])
    if (!lab || !courseName) continue
    const jobNames = splitSlashList(cellStr(row[3]))
    const levels = splitSlashList(cellStr(row[4])).map(parseLink)
    const jobs = jobNames.map((jobName, i) => ({
      jobName,
      level: levels[i] ?? 'important',
    }))
    result.push({
      lab,
      courseType: cellStr(row[1]),
      courseName,
      jobs,
    })
  }
  return result
}

export function parseCurriculumDesignWorkbookSync(wb: XLSX.WorkBook, fileName = ''): CurriculumDesignData {
  const trackCourses = [
    ...parseTrackSheet(wb, '企业培训课程体系', 'enterprise'),
    ...parseTrackSheet(wb, '实习实训课程体系', 'internship'),
    ...parseTrackSheet(wb, '产业学院课程体系', 'industry'),
  ]
  const courseJobLinks = parseCourseJobIndex(wb)
  const labSummaries = parseOverviewSheet(wb)

  return {
    meta: {
      source_file: fileName || 'curriculum-design.xlsx',
      total_track_courses: trackCourses.length,
      total_job_links: courseJobLinks.length,
      total_labs: labSummaries.length,
    },
    labSummaries,
    trackCourses,
    courseJobLinks,
  }
}

export async function parseCurriculumDesignWorkbook(file: File): Promise<CurriculumDesignData> {
  const wb = await readWorkbookFromFile(file)
  return parseCurriculumDesignWorkbookSync(wb, file.name)
}
