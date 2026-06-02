import { parseCurriculumDesignWorkbookSync, parseCurriculumDesignWorkbook } from '../parsers/curriculumDesignParser'
import { readWorkbookFromUrl } from '../parsers/xlsxUtils'
import { loadDataConfig, resolveCloudUrl, cloudFileLabel } from './cloudConfig'
import type { CurriculumDesignData } from '../types/curriculumDesign'
import type { DataMode } from './dataSource'

async function loadFromCloud(): Promise<{ data: CurriculumDesignData; mode: DataMode } | null> {
  const config = await loadDataConfig()
  if (!config?.curriculumExcel) return null
  try {
    const url = resolveCloudUrl(config.curriculumExcel, config.cacheBust !== false)
    const wb = await readWorkbookFromUrl(url)
    return {
      data: parseCurriculumDesignWorkbookSync(wb, cloudFileLabel(config.curriculumExcel)),
      mode: 'cloud',
    }
  } catch {
    return null
  }
}

export async function loadCurriculumDesignData(): Promise<{ data: CurriculumDesignData; mode: DataMode } | null> {
  return loadFromCloud()
}

export async function uploadCurriculumDesignWithFallback(
  file: File,
): Promise<{ data: CurriculumDesignData; mode: DataMode }> {
  return { data: await parseCurriculumDesignWorkbook(file), mode: 'client' }
}
