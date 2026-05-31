import * as XLSX from 'xlsx'

export function cellStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'number' && Number.isInteger(val)) return String(val)
  if (typeof val === 'number') return String(Math.trunc(val) === val ? Math.trunc(val) : val)
  return String(val).trim()
}

export async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer()
  return XLSX.read(buf, { type: 'array', cellDates: true })
}

export async function readWorkbookFromUrl(url: string): Promise<XLSX.WorkBook> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`无法加载文件 (${res.status}): ${url.split('?')[0]}`)
  const buf = await res.arrayBuffer()
  return XLSX.read(buf, { type: 'array', cellDates: true })
}

export function sheetRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}

export function findSheetName(wb: XLSX.WorkBook, test: (name: string) => boolean): string | undefined {
  return wb.SheetNames.find(test)
}

export function countDistribution(items: string[]): { label: string; count: number; ratio: number }[] {
  const counter = new Map<string, number>()
  for (const item of items) counter.set(item, (counter.get(item) ?? 0) + 1)
  const total = items.length || 1
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, ratio: Math.round((count / total) * 10000) / 10000 }))
}

export function findHeaderRow(rows: unknown[][], keywords: string[]): number {
  for (let i = 0; i < rows.length; i++) {
    const texts = rows[i].map(cellStr)
    if (texts.filter(Boolean).length >= 3 && texts.some((t) => keywords.some((k) => t.includes(k)))) return i
  }
  return 0
}
