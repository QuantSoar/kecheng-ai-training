import type {
  CategoryStatRow,
  CertificateItem,
  CompCertData,
  CompetitionItem,
  JobCompetitionRow,
  LabCompetitionRow,
} from '../types/compCert'
import { cellStr, findHeaderRow, findSheetName, readWorkbookFromFile, sheetRows } from './xlsxUtils'
import type * as XLSX from 'xlsx'

function splitList(text: string): string[] {
  if (!text) return []
  return text.split(/[,，、/;；\n]+/).map((s) => s.trim()).filter(Boolean)
}

function numVal(val: unknown): number {
  const n = parseInt(cellStr(val), 10)
  return Number.isFinite(n) ? n : 0
}

function parseCompetitions(wb: XLSX.WorkBook): CompetitionItem[] {
  const sheetName = findSheetName(wb, (n) => n.includes('竞赛总览'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const hi = findHeaderRow(rows, ['序号', '竞赛名称'])
  const headers = rows[hi].map(cellStr)
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { if (h) idx[h] = i })
  const out: CompetitionItem[] = []
  for (const row of rows.slice(hi + 1)) {
    const name = cellStr(row[idx['竞赛名称'] ?? 1])
    if (!name) continue
    out.push({
      id: out.length + 1,
      name,
      category: cellStr(row[idx['竞赛类别'] ?? 2]),
      organizer: cellStr(row[idx['主办/承办单位'] ?? 3]),
      level: cellStr(row[idx['竞赛级别'] ?? 4]),
      official: cellStr(row[idx['官方/非官方'] ?? 5]),
      rating: cellStr(row[idx['价值评级'] ?? 6]),
      labs: splitList(cellStr(row[idx['对应实训室'] ?? 7])),
      jobs: splitList(cellStr(row[idx['对应岗位'] ?? 8])),
      summary: cellStr(row[idx['竞赛简介'] ?? 9]),
      audience: cellStr(row[idx['适用层次'] ?? 10]),
    })
  }
  return out
}

function parseLabCompetitions(wb: XLSX.WorkBook): LabCompetitionRow[] {
  const sheetName = findSheetName(wb, (n) => n.includes('实训室-竞赛'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const hi = findHeaderRow(rows, ['实训室名称'])
  const out: LabCompetitionRow[] = []
  for (const row of rows.slice(hi + 1)) {
    const lab = cellStr(row[1])
    if (!lab || lab.startsWith('【')) continue
    out.push({
      lab,
      count: numVal(row[2]),
      competitionText: cellStr(row[3]),
      audience: cellStr(row[4]),
    })
  }
  return out
}

function parseJobCompetitions(wb: XLSX.WorkBook): JobCompetitionRow[] {
  const sheetName = findSheetName(wb, (n) => n.includes('岗位-竞赛'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const hi = findHeaderRow(rows, ['岗位'])
  const out: JobCompetitionRow[] = []
  for (const row of rows.slice(hi + 1)) {
    const label = cellStr(row[1])
    if (!label) continue
    const isCategory = label.startsWith('【') && label.endsWith('】')
    if (isCategory) {
      out.push({ label, isCategory: true, count: 0, competitionText: '', audience: '' })
      continue
    }
    out.push({
      label,
      isCategory: false,
      count: numVal(row[2]),
      competitionText: cellStr(row[3]),
      audience: cellStr(row[4]),
    })
  }
  return out
}

function parseCategoryStats(wb: XLSX.WorkBook): CategoryStatRow[] {
  const sheetName = findSheetName(wb, (n) => n.includes('竞赛分类统计'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const hi = findHeaderRow(rows, ['竞赛类别'])
  const out: CategoryStatRow[] = []
  for (const row of rows.slice(hi + 1)) {
    const category = cellStr(row[0])
    if (!category) continue
    out.push({
      category,
      count: numVal(row[1]),
      star5: numVal(row[2]),
      star4: numVal(row[3]),
      star3: numVal(row[4]),
      examples: cellStr(row[5]),
      audience: cellStr(row[6]),
    })
  }
  return out
}

function parseCertificates(wb: XLSX.WorkBook): CertificateItem[] {
  const sheetName = findSheetName(wb, (n) => n.includes('证书总表'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const hi = findHeaderRow(rows, ['序号', '证书'])
  const headers = rows[hi].map(cellStr)
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { if (h) idx[h] = i })
  const out: CertificateItem[] = []
  for (const row of rows.slice(hi + 1)) {
    const full = cellStr(row[idx['证书全称'] ?? 3])
    const short = cellStr(row[idx['证书简称'] ?? 4])
    if (!full && !short) continue
    out.push({
      id: out.length + 1,
      category: cellStr(row[idx['认证类别'] ?? 1]),
      org: cellStr(row[idx['认证机构'] ?? 2]),
      fullName: full,
      shortName: short,
      level: cellStr(row[idx['认证等级/级别'] ?? 5]),
      field: cellStr(row[idx['认证方向/领域'] ?? 6]),
      labs: splitList(cellStr(row[idx['适用实训室'] ?? 7])),
      examForm: cellStr(row[idx['考试形式'] ?? 8]),
      recognition: cellStr(row[idx['含金量/行业认可'] ?? 9]),
      note: cellStr(row[idx['备注'] ?? 10]),
    })
  }
  return out
}

function parseRecommendations(wb: XLSX.WorkBook): string[] {
  const sheetName = findSheetName(wb, (n) => n.includes('参赛建议'))
  if (!sheetName) return []
  const rows = sheetRows(wb, sheetName)
  const lines: string[] = []
  for (const row of rows) {
    const text = cellStr(row[0])
    if (text && text.length > 4) lines.push(text)
  }
  return lines.slice(0, 40)
}

export function parseCompCertWorkbookSync(wb: XLSX.WorkBook, sourceFile = ''): CompCertData {
  const competitions = parseCompetitions(wb)
  const certificates = parseCertificates(wb)
  const labCompetitions = parseLabCompetitions(wb)
  const jobCompetitions = parseJobCompetitions(wb)
  const categoryStats = parseCategoryStats(wb)
  const recommendations = parseRecommendations(wb)
  return {
    meta: {
      total_competitions: competitions.length,
      total_certificates: certificates.length,
      total_labs_mapped: labCompetitions.length,
      source_file: sourceFile,
    },
    competitions,
    certificates,
    labCompetitions,
    jobCompetitions,
    categoryStats,
    recommendations,
  }
}

export async function parseCompCertWorkbook(file: File): Promise<CompCertData> {
  const wb = await readWorkbookFromFile(file)
  return parseCompCertWorkbookSync(wb, file.name)
}
