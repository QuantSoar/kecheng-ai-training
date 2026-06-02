import { getCompCertData, reloadCompCertData, uploadCompCertExcel } from '../api'
import { parseCompCertWorkbook, parseCompCertWorkbookSync } from '../parsers/compCertParser'
import { readWorkbookFromUrl } from '../parsers/xlsxUtils'
import { cloudFileLabel, loadDataConfig, resetDataConfigCache, resolveCloudUrl } from './cloudConfig'
import { isBackendAvailable, resetBackendCache } from './dataSource'
import type { CompCertData } from '../types/compCert'
import type { DataMode } from './dataSource'

async function loadCompCertFromCloud(): Promise<{ data: CompCertData; mode: DataMode } | null> {
  const config = await loadDataConfig()
  if (!config?.certExcel) return null
  try {
    const url = resolveCloudUrl(config.certExcel, config.cacheBust !== false)
    const wb = await readWorkbookFromUrl(url)
    return { data: parseCompCertWorkbookSync(wb, cloudFileLabel(config.certExcel)), mode: 'cloud' }
  } catch {
    return null
  }
}

export async function loadCompCertData(): Promise<{ data: CompCertData; mode: DataMode } | null> {
  if (await isBackendAvailable()) {
    try {
      return { data: await getCompCertData(), mode: 'server' }
    } catch {
      return loadCompCertFromCloud()
    }
  }
  return loadCompCertFromCloud()
}

export async function uploadCompCertWithFallback(file: File): Promise<{ data: CompCertData; mode: DataMode }> {
  if (await isBackendAvailable()) {
    try {
      await uploadCompCertExcel(file)
      resetBackendCache()
      return { data: await getCompCertData(), mode: 'server' }
    } catch {
      // fallback to client parse
    }
  }
  return { data: await parseCompCertWorkbook(file), mode: 'client' }
}

export async function reloadCompCertWithFallback(): Promise<{ data: CompCertData; mode: DataMode } | null> {
  resetDataConfigCache()
  if (await isBackendAvailable()) {
    try {
      await reloadCompCertData()
      return { data: await getCompCertData(), mode: 'server' }
    } catch {
      return loadCompCertFromCloud()
    }
  }
  return loadCompCertFromCloud()
}
