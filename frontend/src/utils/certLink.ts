import type { CompCertData, CompetitionItem, CertificateItem } from '../types/compCert'
import type { Course, Lab } from '../types'
import type { JobProfile } from '../types/jobMap'
import { resolveLab } from './jobLink'

export interface LabCertSummary {
  competitions: string[]
  certificates: string[]
  competitionCount: number
  certificateCount: number
}

export interface JobCertSummary {
  competitions: string[]
  competitionCount: number
}

function splitNames(text: string): string[] {
  if (!text?.trim()) return []
  return text.split(/[,，、;；/\n]+/).map((s) => s.trim()).filter((s) => s.length > 1)
}

function resolveLabName(name: string, labs: Lab[]): string | null {
  const lab = resolveLab(name, labs) ?? labs.find((l) => l.name === name)
  return lab?.name ?? null
}

function textMentionsLab(text: string, canonicalLab: string, labs: Lab[]): boolean {
  if (!text) return false
  const lab = labs.find((l) => l.name === canonicalLab)
  if (!lab) return text.includes(canonicalLab)
  const variants = new Set([
    lab.name,
    lab.name.replace('实训室', ''),
    lab.name.replace('实验室', ''),
    lab.original_name ?? '',
  ])
  for (const v of variants) {
    if (v && text.includes(v)) return true
  }
  return false
}

function matchJobName(ref: string, jobs: JobProfile[]): JobProfile | null {
  const r = ref.trim()
  if (!r) return null
  const exact = jobs.find((j) => j.name === r)
  if (exact) return exact
  const partial = jobs.filter((j) => j.name.includes(r) || r.includes(j.name))
  if (partial.length === 1) return partial[0]
  return null
}

export function buildLabCertIndex(data: CompCertData, labs: Lab[]): Map<string, LabCertSummary> {
  const map = new Map<string, { comp: Set<string>; cert: Set<string> }>()
  for (const lab of labs) {
    map.set(lab.name, { comp: new Set(), cert: new Set() })
  }

  for (const row of data.labCompetitions) {
    const canonical = resolveLabName(row.lab, labs)
    if (!canonical) continue
    const entry = map.get(canonical)!
    for (const name of splitNames(row.competitionText)) entry.comp.add(name)
  }

  for (const comp of data.competitions) {
    for (const labRef of comp.labs) {
      const canonical = resolveLabName(labRef, labs)
      if (canonical) map.get(canonical)?.comp.add(comp.name)
    }
  }

  for (const cert of data.certificates) {
    for (const labRef of cert.labs) {
      const canonical = resolveLabName(labRef, labs)
      if (canonical) map.get(canonical)?.cert.add(cert.shortName || cert.fullName)
    }
  }

  const result = new Map<string, LabCertSummary>()
  for (const [labName, { comp, cert }] of map) {
    result.set(labName, {
      competitions: [...comp],
      certificates: [...cert],
      competitionCount: comp.size,
      certificateCount: cert.size,
    })
  }
  return result
}

export function buildJobCertIndex(data: CompCertData, jobs: JobProfile[]): Map<string, JobCertSummary> {
  const map = new Map<string, Set<string>>()
  for (const job of jobs) map.set(job.name, new Set())

  for (const row of data.jobCompetitions) {
    if (row.isCategory) continue
    const job = matchJobName(row.label, jobs)
    if (!job) continue
    for (const name of splitNames(row.competitionText)) map.get(job.name)?.add(name)
  }

  for (const comp of data.competitions) {
    for (const jobRef of comp.jobs) {
      const job = matchJobName(jobRef, jobs)
      if (job) map.get(job.name)?.add(comp.name)
    }
  }

  const result = new Map<string, JobCertSummary>()
  for (const [jobName, set] of map) {
    result.set(jobName, { competitions: [...set], competitionCount: set.size })
  }
  return result
}

export function certForLab(labName: string, data: CompCertData | null | undefined, labs: Lab[]): LabCertSummary {
  if (!data) return { competitions: [], certificates: [], competitionCount: 0, certificateCount: 0 }
  const index = buildLabCertIndex(data, labs)
  const canonical = resolveLabName(labName, labs) ?? labName
  return index.get(canonical) ?? { competitions: [], certificates: [], competitionCount: 0, certificateCount: 0 }
}

export function certForJob(jobName: string, data: CompCertData | null | undefined, jobs: JobProfile[]): JobCertSummary {
  if (!data) return { competitions: [], competitionCount: 0 }
  const index = buildJobCertIndex(data, jobs)
  return index.get(jobName) ?? { competitions: [], competitionCount: 0 }
}

function uniqCompetitions(items: CompetitionItem[]): CompetitionItem[] {
  const seen = new Set<number>()
  return items.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

function competitionsByNames(names: string[], data: CompCertData): CompetitionItem[] {
  const set = new Set(names)
  return data.competitions.filter((c) => set.has(c.name))
}

/** 岗位关联竞赛（含 Excel 映射 + 竞赛表 jobs 字段） */
export function detailedCompetitionsForJob(
  jobName: string,
  data: CompCertData,
  jobs: JobProfile[],
): CompetitionItem[] {
  const summary = certForJob(jobName, data, jobs)
  const fromIndex = competitionsByNames(summary.competitions, data)
  const fromRefs = data.competitions.filter((c) =>
    c.jobs.some((j) => matchJobName(j, jobs)?.name === jobName),
  )
  return uniqCompetitions([...fromIndex, ...fromRefs])
}

/** 实训室关联竞赛 */
export function detailedCompetitionsForLab(
  labName: string,
  data: CompCertData,
  labs: Lab[],
): CompetitionItem[] {
  const summary = certForLab(labName, data, labs)
  const fromIndex = competitionsByNames(summary.competitions, data)
  const canonical = resolveLabName(labName, labs) ?? labName
  const fromRefs = data.competitions.filter((c) =>
    c.labs.some((l) => resolveLabName(l, labs) === canonical),
  )
  return uniqCompetitions([...fromIndex, ...fromRefs])
}

/** 实训室关联证书 */
export function detailedCertificatesForLab(
  labName: string,
  data: CompCertData,
  labs: Lab[],
): CertificateItem[] {
  const summary = certForLab(labName, data, labs)
  const certNames = new Set(summary.certificates)
  const canonical = resolveLabName(labName, labs) ?? labName
  const seen = new Set<number>()
  return data.certificates.filter((c) => {
    if (seen.has(c.id)) return false
    const hit =
      certNames.has(c.shortName) ||
      certNames.has(c.fullName) ||
      c.labs.some((l) => resolveLabName(l, labs) === canonical)
    if (hit) seen.add(c.id)
    return hit
  })
}

/** 课程维度：聚合所属实训室 + 关联岗位的竞赛与证书 */
export function compCertForCourse(
  course: Course,
  matchedJobs: JobProfile[],
  data: CompCertData,
  labs: Lab[],
  allJobs: JobProfile[],
): { competitions: CompetitionItem[]; certificates: CertificateItem[] } {
  const compSeen = new Set<number>()
  const certSeen = new Set<number>()
  const competitions: CompetitionItem[] = []
  const certificates: CertificateItem[] = []

  const pushComp = (item: CompetitionItem) => {
    if (compSeen.has(item.id)) return
    compSeen.add(item.id)
    competitions.push(item)
  }
  const pushCert = (item: CertificateItem) => {
    if (certSeen.has(item.id)) return
    certSeen.add(item.id)
    certificates.push(item)
  }

  const labCanonical = resolveLab(course.lab_name, labs)?.name ?? course.lab_name
  for (const item of detailedCompetitionsForLab(labCanonical, data, labs)) pushComp(item)
  for (const item of detailedCertificatesForLab(labCanonical, data, labs)) pushCert(item)

  for (const job of matchedJobs) {
    for (const item of detailedCompetitionsForJob(job.name, data, allJobs)) pushComp(item)
    for (const { lab } of job.labLinks) {
      const canonical = resolveLab(lab, labs)?.name ?? lab
      if (canonical !== labCanonical && lab !== course.lab_name) continue
      for (const item of detailedCertificatesForLab(canonical, data, labs)) pushCert(item)
    }
  }

  return {
    competitions: competitions.slice(0, 8),
    certificates: certificates.slice(0, 8),
  }
}

export function ecosystemReadiness(opts: {
  coursesLoaded: boolean
  facultyLoaded: boolean
  jobsLoaded: boolean
  certsLoaded: boolean
}) {
  const { coursesLoaded, facultyLoaded, jobsLoaded, certsLoaded } = opts
  const count = [coursesLoaded, facultyLoaded, jobsLoaded, certsLoaded].filter(Boolean).length
  return { count, total: 4, ready: count === 4 }
}
