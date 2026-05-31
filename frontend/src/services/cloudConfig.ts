export interface DataConfig {
  enabled?: boolean
  courseExcel?: string
  facultyExcel?: string
  jobExcel?: string
  cacheBust?: boolean
}

let cachedConfig: DataConfig | null | undefined

export function resetDataConfigCache(): void {
  cachedConfig = undefined
}

export async function loadDataConfig(force = false): Promise<DataConfig | null> {
  if (!force && cachedConfig !== undefined) return cachedConfig
  try {
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}data/data-config.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) {
      cachedConfig = null
      return null
    }
    const config = (await res.json()) as DataConfig
    if (config.enabled === false || (!config.courseExcel && !config.facultyExcel && !config.jobExcel)) {
      cachedConfig = null
      return null
    }
    cachedConfig = config
    return config
  } catch {
    cachedConfig = null
    return null
  }
}

export function resolveCloudUrl(path: string, cacheBust = true): string {
  let url = path.trim()
  if (!/^https?:\/\//i.test(url)) {
    const base = import.meta.env.BASE_URL
    url = `${base}${url.replace(/^\.\//, '')}`
  }
  if (cacheBust) {
    url += `${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
  }
  return url
}

export function cloudFileLabel(url: string): string {
  try {
    if (/^https?:\/\//i.test(url)) return new URL(url).pathname.split('/').pop() ?? url
    return url.split('/').pop() ?? url
  } catch {
    return url
  }
}
