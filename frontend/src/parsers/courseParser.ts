import type { GraphData, Course, Lab, SharedCourse, VendorDetail, TypeStat, VendorStat } from '../types'
import { cellStr, sheetRows, findHeaderRow, countDistribution, readWorkbookFromFile } from './xlsxUtils'
import type * as XLSX from 'xlsx'

const TYPE_MAP: Record<string, Course['type']> = {
  通识课程: 'general',
  专业基础课: 'foundation',
  专业核心课: 'core',
  专业实践课: 'practice',
}

const VENDOR_ALIASES: Record<string, string> = { 华清: '华清智言' }

function normalizeVendorName(name: string): string {
  return VENDOR_ALIASES[name.trim()] ?? name.trim()
}

function normalizeSource(source: string): string {
  if (!source) return source
  return source.replace(/厂商课程\/华清(?!智言)/g, '厂商课程/华清智言')
}

function isVendorSource(source: string): boolean {
  if (!source) return false
  const keywords = ['厂商', '华为', '软通', '讯飞', '科大讯飞', '优必选', '乐聚', '智元', '星海图', '华清智言', '华清', 'AIGC厂商', '国投智能']
  return keywords.some((k) => source.includes(k))
}

function parseHours(val: unknown): number | string | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return Math.trunc(val)
  const s = String(val).trim()
  return /^\d+$/.test(s) ? parseInt(s, 10) : s
}

function buildVendorDistribution(vendorCourses: VendorDetail[]): VendorStat[] {
  const counts = new Map<string, { count: number; labs: Set<string> }>()
  for (const v of vendorCourses) {
    const name = (v.vendor || '').trim()
    if (!name) continue
    if (!counts.has(name)) counts.set(name, { count: 0, labs: new Set() })
    const e = counts.get(name)!
    e.count += 1
    if (v.lab_name) e.labs.add(v.lab_name)
  }
  const total = [...counts.values()].reduce((s, x) => s + x.count, 0) || 1
  return [...counts.entries()]
    .map(([vendor, { count, labs }]) => ({
      vendor,
      count,
      ratio: count / total,
      lab_count: labs.size,
    }))
    .sort((a, b) => b.count - a.count)
}

function buildTypeDistribution(courses: Course[]): TypeStat[] {
  const labels: Record<string, string> = {
    general: '通识课程',
    foundation: '专业基础课',
    core: '专业核心课',
    practice: '专业实践课',
    other: '其他',
  }
  const counter = new Map<string, number>()
  for (const c of courses) counter.set(c.type, (counter.get(c.type) ?? 0) + 1)
  const total = courses.length || 1
  const order: Course['type'][] = ['general', 'foundation', 'core', 'practice', 'other']
  return order
    .filter((t) => (counter.get(t) ?? 0) > 0)
    .map((t) => ({
      label: labels[t] ?? t,
      type: t,
      count: counter.get(t)!,
      ratio: counter.get(t)! / total,
    }))
}

function applyVendorNormalization(courses: Course[], vendorCourses: VendorDetail[]): void {
  for (const c of courses) {
    c.source = normalizeSource(c.source)
    if (c.vendor) c.vendor = normalizeVendorName(c.vendor)
    else {
      const m = c.source.match(/厂商课程\/(.+)/)
      if (m) c.vendor = normalizeVendorName(m[1].trim())
    }
    if (c.vendor_detail?.vendor) c.vendor_detail.vendor = normalizeVendorName(c.vendor_detail.vendor)
  }
  for (const v of vendorCourses) v.vendor = normalizeVendorName(v.vendor || '')
}

function parseLabNames(wb: XLSX.WorkBook): { id: unknown; name: string; original_name: string }[] {
  const name = wb.SheetNames.find((n) => n.includes('实训室名称'))
  if (!name) return []
  const rows = sheetRows(wb, name)
  const headerIdx = findHeaderRow(rows, ['实训室名称', '序号'])
  const headers = rows[headerIdx].map(cellStr)
  const result: { id: unknown; name: string; original_name: string }[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row.some((c) => cellStr(c))) continue
    const item: Record<string, unknown> = {}
    headers.forEach((h, i) => { if (h) item[h] = row[i] })
    const labName = cellStr(item['实训室名称'])
    if (!labName) continue
    result.push({
      id: item['序号'],
      name: labName,
      original_name: cellStr(item['原Excel中名称']),
    })
  }
  return result
}

function parseAllCourses(wb: XLSX.WorkBook): Course[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('全部课程明细'))
  if (!sheetName) throw new Error('未找到 Sheet「全部课程明细」')
  const rows = sheetRows(wb, sheetName)
  const courses: Course[] = []
  let seq = 0
  for (const row of rows.slice(4)) {
    if (!row.some((c) => cellStr(c))) continue
    const first = row[0]
    if (typeof first === 'string' && first.includes('实训室') && row[1] == null) continue
    const lab = cellStr(row[1])
    const name = cellStr(row[3])
    if (!lab || !name) continue
    seq += 1
    const courseTypeCn = cellStr(row[2])
    const source = normalizeSource(cellStr(row[7]))
    courses.push({
      id: seq,
      lab_name: lab,
      type: TYPE_MAP[courseTypeCn] ?? 'other',
      type_label: courseTypeCn || '其他',
      name,
      hours: parseHours(row[4]),
      textbook: cellStr(row[5]),
      platform: cellStr(row[6]),
      source,
      note: cellStr(row[8]),
      is_vendor: isVendorSource(source),
    })
  }
  return courses
}

function parseVendorCourses(wb: XLSX.WorkBook): VendorDetail[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('各个厂商课程体系'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['课程名称', '所属厂商'])
  const headers = rows[headerIdx].map(cellStr)
  const result: VendorDetail[] = []
  let vid = 0
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row.some((c) => cellStr(c))) continue
    const item: Record<string, unknown> = {}
    headers.forEach((h, i) => { if (h) item[h] = row[i] })
    const courseName = cellStr(item['课程名称'])
    if (!courseName) continue
    vid += 1
    result.push({
      id: vid,
      lab_name: cellStr(item['归属实训室（标准）']),
      original_lab_name: cellStr(item['原始实训室名称']),
      name: courseName,
      description: cellStr(item['课程描述']),
      type: TYPE_MAP[cellStr(item['课程类型（标准）'])] ?? 'other',
      type_label: cellStr(item['课程类型（标准）']),
      original_type: cellStr(item['原始课程类型']),
      hardware_bound: cellStr(item['是否绑定硬件']) === '是',
      hardware: cellStr(item['配套硬件']),
      hours_total: parseHours(item['参考课时（总）']),
      hours_theory: parseHours(item['参考课时（理论）']),
      hours_practice: parseHours(item['参考课时（实训）']),
      vendor: normalizeVendorName(cellStr(item['所属厂商'])),
      capability: cellStr(item['培养能力']),
      jobs: cellStr(item['岗位辐射']),
    })
  }
  return result
}

function parseOverview(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('课程体系总览'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['实训室名称', '课程总数'])
  const headers = rows[headerIdx].map(cellStr)
  const result: Record<string, unknown>[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row.some((c) => cellStr(c))) continue
    const item: Record<string, unknown> = {}
    headers.forEach((h, i) => { if (h) item[h] = row[i] })
    const lab = cellStr(item['实训室名称'])
    if (!lab || lab === '合计' || lab === '24个实训室') continue
    result.push({
      id: item['序号'],
      lab_name: lab,
      general: parseInt(String(item['通识课程'] ?? 0), 10) || 0,
      foundation: parseInt(String(item['专业基础课'] ?? 0), 10) || 0,
      core: parseInt(String(item['专业核心课'] ?? 0), 10) || 0,
      practice: parseInt(String(item['专业实践课'] ?? 0), 10) || 0,
      total: parseInt(String(item['课程总数'] ?? 0), 10) || 0,
      note: cellStr(item['备注']),
    })
  }
  return result
}

function mergeVendorIntoCourses(courses: Course[], vendorCourses: VendorDetail[]): void {
  const index = new Map<string, VendorDetail>()
  for (const v of vendorCourses) index.set(`${v.lab_name}\0${v.name}`, v)
  for (const c of courses) {
    const v = index.get(`${c.lab_name}\0${c.name}`)
    if (!v) continue
    c.vendor_detail = v
    c.is_vendor = true
    if (v.description) c.description = v.description
    if (v.hardware) c.hardware = v.hardware
    if (v.vendor) c.vendor = v.vendor
  }
}

function buildSharedCourses(courses: Course[]): SharedCourse[] {
  const byName = new Map<string, string[]>()
  for (const c of courses) {
    const list = byName.get(c.name) ?? []
    list.push(c.lab_name)
    byName.set(c.name, list)
  }
  const shared: SharedCourse[] = []
  for (const [name, labs] of byName) {
    const unique = [...new Set(labs)].sort()
    if (unique.length >= 2) {
      shared.push({
        name,
        lab_count: unique.length,
        labs: unique,
        course_ids: courses.filter((c) => c.name === name).map((c) => c.id),
      })
    }
  }
  shared.sort((a, b) => b.lab_count - a.lab_count)
  return shared
}

function buildLabs(courses: Course[], overview: Record<string, unknown>[], labMapping: { id: unknown; name: string; original_name: string }[]): Lab[] {
  const overviewByName = new Map(overview.map((o) => [cellStr(o.lab_name), o]))
  const mappingByName = new Map(labMapping.map((m) => [m.name, m]))
  const labNames = [...new Set(courses.map((c) => c.lab_name))].sort()
  const labs: Lab[] = []
  labNames.forEach((name, i) => {
    const labCourses = courses.filter((c) => c.lab_name === name)
    const ov = overviewByName.get(name) ?? {}
    const mp = mappingByName.get(name) ?? { id: i + 1, name, original_name: '' }
    let counts = {
      general: labCourses.filter((c) => c.type === 'general').length,
      foundation: labCourses.filter((c) => c.type === 'foundation').length,
      core: labCourses.filter((c) => c.type === 'core').length,
      practice: labCourses.filter((c) => c.type === 'practice').length,
      total: labCourses.length,
    }
    if (ov.total) {
      counts = {
        general: Number(ov.general ?? counts.general),
        foundation: Number(ov.foundation ?? counts.foundation),
        core: Number(ov.core ?? counts.core),
        practice: Number(ov.practice ?? counts.practice),
        total: Number(ov.total ?? counts.total),
      }
    }
    labs.push({
      id: Number(ov.id ?? mp.id ?? i + 1),
      name,
      original_name: mp.original_name || '',
      course_counts: counts,
      vendor_course_count: labCourses.filter((c) => c.is_vendor).length,
      course_ids: labCourses.map((c) => c.id),
    })
  })
  labs.sort((a, b) => b.course_counts.total - a.course_counts.total)
  return labs
}

export async function parseCourseWorkbook(file: File): Promise<GraphData> {
  const wb = await readWorkbookFromFile(file)
  return parseCourseWorkbookSync(wb)
}

export function parseCourseWorkbookSync(wb: XLSX.WorkBook): GraphData {
  const labMapping = parseLabNames(wb)
  const courses = parseAllCourses(wb)
  const vendorCourses = parseVendorCourses(wb)
  const overview = parseOverview(wb)
  mergeVendorIntoCourses(courses, vendorCourses)
  applyVendorNormalization(courses, vendorCourses)
  const shared = buildSharedCourses(courses)
  const labs = buildLabs(courses, overview, labMapping)
  return {
    meta: {
      total_courses: courses.length,
      total_labs: labs.length,
      total_vendor_courses: vendorCourses.length,
      vendor_count: new Set(vendorCourses.map((v) => v.vendor).filter(Boolean)).size,
      shared_course_count: shared.length,
    },
    labs,
    courses,
    vendor_courses: vendorCourses,
    overview,
    stats: {
      type_distribution: buildTypeDistribution(courses),
      vendor_distribution: buildVendorDistribution(vendorCourses),
    },
    shared_courses: shared,
  }
}
