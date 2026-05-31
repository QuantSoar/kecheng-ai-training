import { getJobMapData, uploadJobMapExcel, reloadJobMapData } from '../api'
import { parseJobMapWorkbook, parseJobMapWorkbookSync } from '../parsers/jobMapParser'
import { readWorkbookFromUrl } from '../parsers/xlsxUtils'
import { loadDataConfig, resetDataConfigCache, resolveCloudUrl, cloudFileLabel } from './cloudConfig'
import { isBackendAvailable, resetBackendCache } from './dataSource'
import type { JobMapData } from '../types/jobMap'
import type { DataMode } from './dataSource'

async function loadJobFromCloud(): Promise<{ data: JobMapData; mode: DataMode } | null> {
  const config = await loadDataConfig()
  if (!config?.jobExcel) return null
  try {
    const url = resolveCloudUrl(config.jobExcel, config.cacheBust !== false)
    const wb = await readWorkbookFromUrl(url)
    return { data: parseJobMapWorkbookSync(wb, cloudFileLabel(config.jobExcel)), mode: 'cloud' }
  } catch {
    return null
  }
}

export async function loadJobMapData(): Promise<{ data: JobMapData; mode: DataMode } | null> {
  if (await isBackendAvailable()) {
    try {
      return { data: await getJobMapData(), mode: 'server' }
    } catch {
      return loadJobFromCloud()
    }
  }
  return loadJobFromCloud()
}

export async function uploadJobMapWithFallback(file: File): Promise<{ data: JobMapData; mode: DataMode }> {
  if (await isBackendAvailable()) {
    try {
      await uploadJobMapExcel(file)
      resetBackendCache()
      return { data: await getJobMapData(), mode: 'server' }
    } catch {
      // fallback to client parse
    }
  }
  return { data: await parseJobMapWorkbook(file), mode: 'client' }
}

export async function reloadJobMapWithFallback(): Promise<{ data: JobMapData; mode: DataMode } | null> {
  resetDataConfigCache()
  if (await isBackendAvailable()) {
    try {
      await reloadJobMapData()
      return { data: await getJobMapData(), mode: 'server' }
    } catch {
      return loadJobFromCloud()
    }
  }
  return loadJobFromCloud()
}

/** @deprecated use reloadJobMapWithFallback */
export async function reloadJobMapFromCloud(): Promise<JobMapData | null> {
  const result = await reloadJobMapWithFallback()
  return result?.data ?? null
}
