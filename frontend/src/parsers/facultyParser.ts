import type { FacultyData, FacultyTeacher, FacultyTopItem } from '../types/faculty'
import { cellStr, sheetRows, readWorkbookFromFile, countDistribution } from './xlsxUtils'
import type * as XLSX from 'xlsx'

const MAIN_COLUMNS = [
  'seq', 'name', 'gender', 'education', 'university', 'major', 'title_level',
  'source', 'title_dim', 'level', 'experience', 'cert_category', 'availability',
  'ability', 'field', 'keywords', 'matched_labs', 'matched_lab_count',
  'teaching_mgmt', 'cooperation_mode', 'fee_level', 'priority', 'recommender_type',
  'recommender', 'tech_direction', 'vendor_cert', 'bio', 'capable_courses',
  'teacher_cert', 'note',
] as const

export const FACULTY_DIMENSIONS: Record<string, string> = {
  source: '来源维度',
  title_dim: '职称维度',
  level: '级别维度',
  education: '学历',
  gender: '性别',
  cert_category: '厂商认证',
  availability: '可用性',
  fee_level: '费用等级',
  recommender_type: '推荐方类型',
  recommender: '推荐方',
}

export const LAB_ALIASES: Record<string, string> = {
  'AI4S实训室': 'AI for science实训室',
  '空天地一体实训室[虚仿实训室]': '空天地一体实训室',
}

export function normalizeLabName(name: string, canonicalLabs?: string[]): string {
  let n = name.trim()
  if (!n) return n
  if (LAB_ALIASES[n]) n = LAB_ALIASES[n]
  if (!canonicalLabs?.length) return n
  if (canonicalLabs.includes(n)) return n
  const simplified = n.replace(/\[.*?\]/g, '').trim()
  if (canonicalLabs.includes(simplified)) return simplified
  for (const lab of canonicalLabs) {
    if (lab === simplified || lab.startsWith(simplified) || simplified.includes(lab) || lab.includes(simplified)) return lab
  }
  return n
}

function splitMulti(text: string): string[] {
  if (!text) return []
  return text.split(/[、,，/;；\n]+/).map((p) => p.trim()).filter(Boolean)
}

function parsePriorityScore(text: string): number | null {
  const m = text.match(/(\d+)\s*分/)
  return m ? parseInt(m[1], 10) : null
}

function parsePriorityLabel(text: string): string {
  if (!text) return '待评估'
  if (text.includes('强烈推荐')) return '强烈推荐'
  if (text.includes('可考虑')) return '可考虑'
  if (text.includes('待评估')) return '待评估'
  return text.includes('-') ? text.split('-').pop()!.trim() : text
}

function simplifyExperience(text: string): string {
  if (!text) return '未知'
  let head = text.split('|')[0].trim()
  if (head.includes('（')) head = head.split('（')[0].trim()
  return head || '未知'
}

function findFacultyHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cells = rows[i].map(cellStr)
    if (cells.includes('姓名') && cells.join('').includes('来源维度')) return i
  }
  return 3
}

function parseMainSheet(rows: unknown[][]): FacultyTeacher[] {
  const headerRow = findFacultyHeaderRow(rows)
  const teachers: FacultyTeacher[] = []
  for (const row of rows.slice(headerRow + 1)) {
    if (!cellStr(row[1])) continue
    const record: Record<string, string | number | null | string[]> = { id: teachers.length + 1 }
    MAIN_COLUMNS.forEach((key, idx) => {
      ;(record as Record<string, unknown>)[key] = cellStr(row[idx])
    })
    const t = record as unknown as FacultyTeacher
    const mc = parseFloat(String(t.matched_lab_count || 0))
    t.matched_lab_count = Number.isFinite(mc) ? Math.trunc(mc) : splitMulti(t.matched_labs).length
    t.priority_score = parsePriorityScore(t.priority)
    t.priority_label = parsePriorityLabel(t.priority)
    t.experience_simple = simplifyExperience(t.experience)
    t.field_tags = splitMulti(t.field)
    t.lab_list = splitMulti(t.matched_labs)
    teachers.push(t)
  }
  return teachers
}

function normalizeTeacherLabs(teachers: FacultyTeacher[], canonicalLabs?: string[]): void {
  for (const t of teachers) {
    const normalized: string[] = []
    const seen = new Set<string>()
    for (const lab of splitMulti(t.matched_labs)) {
      const n = normalizeLabName(lab, canonicalLabs)
      if (n && !seen.has(n)) {
        seen.add(n)
        normalized.push(n)
      }
    }
    t.lab_list = normalized
    t.matched_labs = normalized.join('\n')
    t.matched_lab_count = normalized.length
  }
}

function buildFieldStats(teachers: FacultyTeacher[]) {
  const tags: string[] = []
  for (const t of teachers) tags.push(...(t.field_tags || []))
  return countDistribution(tags)
}

function buildLabStats(teachers: FacultyTeacher[], canonicalLabs?: string[]) {
  const counter = new Map<string, number>()
  for (const t of teachers) for (const lab of t.lab_list || []) counter.set(lab, (counter.get(lab) ?? 0) + 1)
  const total = teachers.length || 1
  let items: [string, number][]
  if (canonicalLabs?.length) {
    items = canonicalLabs.map((lab) => [lab, counter.get(lab) ?? 0] as [string, number])
    items.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  } else {
    items = [...counter.entries()].sort((a, b) => b[1] - a[1])
  }
  return items.map(([lab, count]) => ({ lab, count, ratio: Math.round((count / total) * 10000) / 10000 }))
}

function buildPriorityStats(teachers: FacultyTeacher[]) {
  const buckets: Record<string, number> = { '80+': 0, '60-79': 0, '40-59': 0, '20-39': 0, '0-19': 0, 未评分: 0 }
  for (const t of teachers) {
    const s = t.priority_score
    if (s == null) buckets['未评分'] += 1
    else if (s >= 80) buckets['80+'] += 1
    else if (s >= 60) buckets['60-79'] += 1
    else if (s >= 40) buckets['40-59'] += 1
    else if (s >= 20) buckets['20-39'] += 1
    else buckets['0-19'] += 1
  }
  const total = teachers.length || 1
  return ['80+', '60-79', '40-59', '20-39', '0-19', '未评分']
    .filter((k) => buckets[k] > 0)
    .map((k) => ({ label: k, count: buckets[k], ratio: Math.round((buckets[k] / total) * 10000) / 10000 }))
}

function buildDimensionStats(teachers: FacultyTeacher[], canonicalLabs?: string[]) {
  const stats: FacultyData['stats'] = {}
  for (const key of Object.keys(FACULTY_DIMENSIONS)) {
    const values = teachers.map((t) => {
      const v = t[key as keyof FacultyTeacher]
      return typeof v === 'string' && v ? v : '未知'
    })
    stats[key] = countDistribution(values)
  }
  stats.experience = countDistribution(teachers.map((t) => t.experience_simple || '未知'))
  stats.field = buildFieldStats(teachers)
  stats.priority_bucket = buildPriorityStats(teachers)
  stats.lab_match = buildLabStats(teachers, canonicalLabs)
  return stats
}

function buildTopFromTeachers(teachers: FacultyTeacher[], limit = 20): FacultyTopItem[] {
  const ranked = [...teachers].sort((a, b) => (b.priority_score ?? -1) - (a.priority_score ?? -1))
  return ranked.slice(0, limit).map((t, i) => ({
    rank: i + 1,
    name: t.name,
    priority: t.priority,
    title_dim: t.title_dim,
    source: t.source,
    recommender_type: t.recommender_type,
    matched_labs: t.matched_labs,
    keywords: t.keywords,
    priority_score: t.priority_score,
  }))
}

function parseTopPriority(rows: unknown[][]): FacultyTopItem[] {
  const items: FacultyTopItem[] = []
  let started = false
  for (const row of rows) {
    const cells = row.map(cellStr)
    if (!started) {
      if (cells[0] === '排名' || cells[1] === '姓名') started = true
      continue
    }
    if (!cells[1]) continue
    items.push({
      rank: /^\d+$/.test(cells[0]) ? parseInt(cells[0], 10) : items.length + 1,
      name: cells[1],
      priority: cells[2] ?? '',
      title_dim: cells[3] ?? '',
      source: cells[4] ?? '',
      recommender_type: cells[5] ?? '',
      matched_labs: cells[6] ?? '',
      keywords: cells[7] ?? '',
      priority_score: parsePriorityScore(cells[2] ?? ''),
    })
  }
  return items
}

export function rebuildFacultyFromTeachers(
  teachers: FacultyTeacher[],
  canonicalLabs: string[] | undefined,
  sourceFile: string,
  topPriority?: FacultyTopItem[],
): FacultyData {
  normalizeTeacherLabs(teachers, canonicalLabs)
  const stats = buildDimensionStats(teachers, canonicalLabs)
  const top = topPriority?.length ? topPriority : buildTopFromTeachers(teachers)
  const labSet = new Set<string>()
  for (const t of teachers) for (const l of t.lab_list) labSet.add(l)
  return {
    meta: {
      total_teachers: teachers.length,
      total_labs: canonicalLabs?.length ?? labSet.size,
      source_file: sourceFile,
      canonical_labs: canonicalLabs ?? [...labSet].sort(),
    },
    teachers,
    stats,
    dimensions: FACULTY_DIMENSIONS,
    top_priority: top,
    lab_recommender_matrix: { headers: [], rows: [] },
  }
}

export function parseFacultyWorkbookSync(wb: XLSX.WorkBook, canonicalLabs?: string[], fileName = ''): FacultyData {
  let teachers: FacultyTeacher[] = []
  let topPriority: FacultyTopItem[] = []

  for (const sheetName of wb.SheetNames) {
    const rows = sheetRows(wb, sheetName)
    if (sheetName.includes('总表') || sheetName === wb.SheetNames[0]) {
      teachers = parseMainSheet(rows)
    } else if (/TOP/i.test(sheetName) || sheetName.includes('优先级')) {
      topPriority = parseTopPriority(rows)
    }
  }

  if (!teachers.length) throw new Error('未找到师资数据，请确认 Excel 包含「师资多维分析总表」')
  return rebuildFacultyFromTeachers(teachers, canonicalLabs, fileName || 'upload.xlsx', topPriority)
}

export async function parseFacultyWorkbook(file: File, canonicalLabs?: string[]): Promise<FacultyData> {
  const wb = await readWorkbookFromFile(file)
  return parseFacultyWorkbookSync(wb, canonicalLabs, file.name)
}
