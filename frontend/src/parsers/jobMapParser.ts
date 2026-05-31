import type { JobGapItem, JobMapData, JobProfile, JobSkillItem, LabJobCourseRow, LabLinkLevel } from '../types/jobMap'
import { STANDARD_LABS } from '../templates/spec'
import { cellStr, sheetRows, readWorkbookFromFile, findHeaderRow } from './xlsxUtils'
import type * as XLSX from 'xlsx'

const LINK_MAP: Record<string, LabLinkLevel> = {
  '●': 'core',
  '◐': 'important',
  '○': 'basic',
}

function parseLink(val: unknown): LabLinkLevel {
  const s = cellStr(val)
  return LINK_MAP[s] ?? 'none'
}

function splitList(text: string): string[] {
  if (!text) return []
  return text.split(/[,，、/;；\n]+/).map((s) => s.trim()).filter(Boolean)
}

export function normalizeMatrixLabName(short: string): string {
  const s = short.trim()
  if (!s) return s
  for (const lab of STANDARD_LABS) {
    if (lab === s || lab.startsWith(s)) return lab
    const base = lab.replace(/实训室$/, '').replace(/实验室$/, '')
    if (s === base || lab.includes(s)) return lab
  }
  if (!s.endsWith('实训室') && !s.endsWith('实验室')) return `${s}实训室`
  return s
}

function parseMatrixSheet(wb: XLSX.WorkBook): { jobs: Map<string, JobProfile>; labColumns: string[] } {
  const sheetName = wb.SheetNames.find((n) => n.includes('映射矩阵'))
  if (!sheetName) return { jobs: new Map(), labColumns: [] }
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['岗位名称', '岗位大类'])
  const headers = rows[headerIdx].map(cellStr)
  const labStart = headers.findIndex((h) => h.includes('应用开发') || h.includes('智算') || h === '人工智能应用开发')
  const startCol = labStart >= 5 ? labStart : 5
  const labColumns = headers.slice(startCol).filter(Boolean)
  const jobs = new Map<string, JobProfile>()

  for (const row of rows.slice(headerIdx + 1)) {
    const name = cellStr(row[2])
    if (!name) continue
    const labLinks = labColumns
      .map((lab, i) => ({
        lab: normalizeMatrixLabName(lab),
        level: parseLink(row[startCol + i]),
      }))
      .filter((x) => x.level !== 'none')

    jobs.set(name, {
      id: parseInt(cellStr(row[0]), 10) || jobs.size + 1,
      name,
      category: cellStr(row[1]),
      keywords: cellStr(row[3]),
      heat: cellStr(row[4]),
      skills: [],
      labLinks,
    })
  }
  return { jobs, labColumns }
}

function parseSkillsSheet(wb: XLSX.WorkBook, jobs: Map<string, JobProfile>): void {
  const sheetName = wb.SheetNames.find((n) => n.includes('能力分层'))
  if (!sheetName) return
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['岗位名称', '能力域'])

  for (const row of rows.slice(headerIdx + 1)) {
    const name = cellStr(row[1])
    if (!name) continue
    const skill: JobSkillItem = {
      domain: cellStr(row[3]),
      junior: cellStr(row[4]),
      mid: cellStr(row[5]),
      senior: cellStr(row[6]),
      labs: splitList(cellStr(row[7])),
      courses: splitList(cellStr(row[8])),
    }
    if (!skill.domain) continue

    const existing = jobs.get(name)
    if (existing) {
      existing.skills.push(skill)
      if (!existing.category) existing.category = cellStr(row[2])
    } else {
      jobs.set(name, {
        id: parseInt(cellStr(row[0]), 10) || jobs.size + 1,
        name,
        category: cellStr(row[2]),
        keywords: '',
        heat: '',
        skills: [skill],
        labLinks: [],
      })
    }
  }
}

function parseLabCourseSheet(wb: XLSX.WorkBook): LabJobCourseRow[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('课程对照') || n.includes('三对照'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['实训室名称', '辐射岗位'])
  const result: LabJobCourseRow[] = []

  for (const row of rows.slice(headerIdx + 1)) {
    const lab = cellStr(row[1])
    const job = cellStr(row[3])
    if (!lab || !job) continue
    result.push({
      lab,
      domainGroup: cellStr(row[2]),
      job,
      courses: splitList(cellStr(row[4])),
      courseType: cellStr(row[5]),
      linkLevel: parseLink(row[6]),
      capability: cellStr(row[7]),
      jobCategory: cellStr(row[8]),
    })
  }
  return result
}

function parseGapsSheet(wb: XLSX.WorkBook): JobGapItem[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('信息缺口') || n.includes('补充建议'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const headerIdx = findHeaderRow(rows, ['缺口类别', '缺口描述'])
  const result: JobGapItem[] = []

  for (const row of rows.slice(headerIdx + 1)) {
    const category = cellStr(row[1])
    const description = cellStr(row[2])
    if (!category || !description) continue
    result.push({
      category,
      description,
      scope: cellStr(row[3]),
      severity: cellStr(row[4]),
      suggestion: cellStr(row[5]),
    })
  }
  return result
}

export function parseJobMapWorkbookSync(wb: XLSX.WorkBook, fileName = ''): JobMapData {
  const { jobs, labColumns } = parseMatrixSheet(wb)
  parseSkillsSheet(wb, jobs)
  const jobList = [...jobs.values()].sort((a, b) => a.id - b.id)

  return {
    meta: {
      total_jobs: jobList.length,
      total_skills: jobList.reduce((s, j) => s + j.skills.length, 0),
      total_lab_links: jobList.reduce((s, j) => s + j.labLinks.length, 0),
      source_file: fileName || 'upload.xlsx',
    },
    jobs: jobList,
    labCourseRows: parseLabCourseSheet(wb),
    gaps: parseGapsSheet(wb),
    labColumns,
  }
}

export async function parseJobMapWorkbook(file: File): Promise<JobMapData> {
  const wb = await readWorkbookFromFile(file)
  return parseJobMapWorkbookSync(wb, file.name)
}
