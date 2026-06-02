import type { Course, Lab } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import type { JobProfile, LabJobCourseRow } from '../types/jobMap'
import type { CompCertData } from '../types/compCert'
import {
  collectJobCourseNames,
  facultyForJob,
  matchJobCourses,
  resolveCourse,
  resolveJobLabs,
  resolveLab,
} from './jobLink'
import { buildJobCertIndex, buildLabCertIndex } from './certLink'
import { buildLabJobIndex, facultyCanTeachCourse } from './integrate'

export type EntityKind = 'job' | 'lab' | 'course' | 'faculty' | 'competition' | 'certificate'

export interface EntityRef {
  kind: EntityKind
  id: string
  label: string
  subtitle?: string
}

export interface EntityBundle {
  focus: EntityRef
  jobs: EntityRef[]
  labs: EntityRef[]
  courses: EntityRef[]
  faculty: EntityRef[]
  competitions: EntityRef[]
  certificates: EntityRef[]
}

export interface EcosystemSources {
  labs: Lab[]
  courses: Course[]
  teachers: FacultyTeacher[]
  jobs: JobProfile[]
  labCourseRows: LabJobCourseRow[]
  compCert: CompCertData | null
}

export interface EcosystemIndexes {
  labToJobs: Map<string, string[]>
  labToCourses: Map<string, Course[]>
  labToFaculty: Map<string, FacultyTeacher[]>
  labCert: ReturnType<typeof buildLabCertIndex>
  jobCert: ReturnType<typeof buildJobCertIndex>
  courseToJobs: Map<number, JobProfile[]>
  jobCourseNames: Map<string, Set<string>>
}

function uniqRefs(items: EntityRef[]): EntityRef[] {
  const seen = new Set<string>()
  return items.filter((x) => {
    const k = `${x.kind}:${x.id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function jobRef(j: JobProfile): EntityRef {
  return { kind: 'job', id: j.name, label: j.name, subtitle: j.category }
}

function labRef(l: Lab): EntityRef {
  return { kind: 'lab', id: l.name, label: l.name, subtitle: `${l.course_counts.total} 门课` }
}

function courseRef(c: Course): EntityRef {
  return { kind: 'course', id: String(c.id), label: c.name, subtitle: c.lab_name.replace('实训室', '') }
}

function facultyRef(t: FacultyTeacher): EntityRef {
  return { kind: 'faculty', id: String(t.id), label: t.name, subtitle: t.level || t.source }
}

function competitionRef(name: string, sub?: string): EntityRef {
  return { kind: 'competition', id: name, label: name, subtitle: sub }
}

function certificateRef(name: string, sub?: string): EntityRef {
  return { kind: 'certificate', id: name, label: name, subtitle: sub }
}

export function buildEcosystemIndexes(sources: EcosystemSources): EcosystemIndexes {
  const { labs, courses, teachers, jobs, labCourseRows, compCert } = sources

  const labToJobs = buildLabJobIndex(jobs, labs)
  const labToCourses = new Map<string, Course[]>()
  const labToFaculty = new Map<string, FacultyTeacher[]>()
  const courseToJobs = new Map<number, JobProfile[]>()
  const jobCourseNames = new Map<string, Set<string>>()

  for (const lab of labs) {
    labToCourses.set(lab.name, courses.filter((c) => c.lab_name === lab.name))
    labToFaculty.set(lab.name, teachers.filter((t) => t.lab_list.includes(lab.name)))
  }

  for (const job of jobs) {
    const names = new Set(collectJobCourseNames(job, labCourseRows))
    jobCourseNames.set(job.name, names)
    for (const name of names) {
      const matched = resolveCourse(name, courses)
      if (!matched) continue
      if (!courseToJobs.has(matched.id)) courseToJobs.set(matched.id, [])
      courseToJobs.get(matched.id)!.push(job)
    }
  }

  return {
    labToJobs,
    labToCourses,
    labToFaculty,
    labCert: compCert ? buildLabCertIndex(compCert, labs) : new Map(),
    jobCert: compCert ? buildJobCertIndex(compCert, jobs) : new Map(),
    courseToJobs,
    jobCourseNames,
  }
}

function labsFromNames(names: Iterable<string>, labs: Lab[]): EntityRef[] {
  const out: EntityRef[] = []
  for (const name of names) {
    const lab = resolveLab(name, labs) ?? labs.find((l) => l.name === name)
    if (lab) out.push(labRef(lab))
  }
  return out
}

function compsForLabs(labNames: string[], idx: EcosystemIndexes): EntityRef[] {
  const comps: EntityRef[] = []
  for (const lab of labNames) {
    const s = idx.labCert.get(lab)
    if (s) comps.push(...s.competitions.map((n) => competitionRef(n)))
  }
  return uniqRefs(comps)
}

function certsForLabs(labNames: string[], idx: EcosystemIndexes): EntityRef[] {
  const certs: EntityRef[] = []
  for (const lab of labNames) {
    const s = idx.labCert.get(lab)
    if (s) certs.push(...s.certificates.map((n) => certificateRef(n)))
  }
  return uniqRefs(certs)
}

function bundleForJob(job: JobProfile, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = jobRef(job)
  const linkedLabs = resolveJobLabs(job, sources.labs)
  const labNames = linkedLabs.map((l) => l.name)
  const matchedCourses = matchJobCourses(job, sources.labCourseRows, sources.courses)
  const faculty = facultyForJob(job, sources.teachers, sources.labs)
  const jc = idx.jobCert.get(job.name)

  return {
    focus,
    jobs: [focus],
    labs: linkedLabs.map(labRef),
    courses: matchedCourses.map(courseRef),
    faculty: faculty.map(facultyRef),
    competitions: (jc?.competitions ?? []).map((n) => competitionRef(n)),
    certificates: certsForLabs(labNames, idx),
  }
}

function bundleForLab(lab: Lab, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = labRef(lab)
  const jobNames = idx.labToJobs.get(lab.name) ?? []
  const jobs = sources.jobs.filter((j) => jobNames.includes(j.name)).map(jobRef)
  const cs = idx.labToCourses.get(lab.name) ?? []
  const fs = idx.labToFaculty.get(lab.name) ?? []
  const cert = idx.labCert.get(lab.name)

  return {
    focus,
    jobs,
    labs: [focus],
    courses: cs.map(courseRef),
    faculty: fs.map(facultyRef),
    competitions: (cert?.competitions ?? []).map((n) => competitionRef(n)),
    certificates: (cert?.certificates ?? []).map((n) => certificateRef(n)),
  }
}

function bundleForCourse(course: Course, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = courseRef(course)
  const lab = sources.labs.find((l) => l.name === course.lab_name)
  const jobs = (idx.courseToJobs.get(course.id) ?? []).map(jobRef)
  const faculty = sources.teachers.filter((t) => facultyCanTeachCourse(course, t))
  const labNames = lab ? [lab.name] : [course.lab_name]

  return {
    focus,
    jobs,
    labs: lab ? [labRef(lab)] : labsFromNames(labNames, sources.labs),
    courses: [focus],
    faculty: faculty.map(facultyRef),
    competitions: compsForLabs(labNames, idx),
    certificates: certsForLabs(labNames, idx),
  }
}

function bundleForFaculty(teacher: FacultyTeacher, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = facultyRef(teacher)
  const labs = sources.labs.filter((l) => teacher.lab_list.includes(l.name))
  const labNames = labs.map((l) => l.name)
  const courses: EntityRef[] = []
  for (const lab of labNames) {
    for (const c of idx.labToCourses.get(lab) ?? []) {
      if (facultyCanTeachCourse(c, teacher)) courses.push(courseRef(c))
    }
  }
  const jobSet = new Map<string, JobProfile>()
  for (const lab of labNames) {
    for (const jn of idx.labToJobs.get(lab) ?? []) {
      const j = sources.jobs.find((x) => x.name === jn)
      if (j) jobSet.set(j.name, j)
    }
  }

  return {
    focus,
    jobs: [...jobSet.values()].map(jobRef),
    labs: labs.map(labRef),
    courses: uniqRefs(courses),
    faculty: [focus],
    competitions: compsForLabs(labNames, idx),
    certificates: certsForLabs(labNames, idx),
  }
}

function bundleForCompetition(name: string, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = competitionRef(name)
  const comp = sources.compCert?.competitions.find((c) => c.name === name)
  const labNames = comp?.labs ?? []
  const jobNames = comp?.jobs ?? []

  return {
    focus,
    jobs: sources.jobs.filter((j) => jobNames.some((n) => j.name.includes(n) || n.includes(j.name))).map(jobRef),
    labs: labsFromNames(labNames, sources.labs),
    courses: labNames.flatMap((ln) => (idx.labToCourses.get(resolveLab(ln, sources.labs)?.name ?? ln) ?? []).slice(0, 12)).map(courseRef),
    faculty: labNames.flatMap((ln) => idx.labToFaculty.get(resolveLab(ln, sources.labs)?.name ?? ln) ?? []).slice(0, 12).map(facultyRef),
    competitions: [focus],
    certificates: certsForLabs(labNames.map((n) => resolveLab(n, sources.labs)?.name ?? n), idx),
  }
}

function bundleForCertificate(name: string, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  const focus = certificateRef(name)
  const cert = sources.compCert?.certificates.find((c) => c.fullName === name || c.shortName === name)
  const labNames = cert?.labs ?? []

  return {
    focus,
    jobs: labNames.flatMap((ln) => {
      const canonical = resolveLab(ln, sources.labs)?.name ?? ln
      return (idx.labToJobs.get(canonical) ?? []).map((jn) => sources.jobs.find((j) => j.name === jn)).filter(Boolean) as JobProfile[]
    }).map(jobRef).slice(0, 20),
    labs: labsFromNames(labNames, sources.labs),
    courses: labNames.flatMap((ln) => (idx.labToCourses.get(resolveLab(ln, sources.labs)?.name ?? ln) ?? []).slice(0, 10)).map(courseRef),
    faculty: labNames.flatMap((ln) => idx.labToFaculty.get(resolveLab(ln, sources.labs)?.name ?? ln) ?? []).slice(0, 10).map(facultyRef),
    competitions: compsForLabs(labNames.map((n) => resolveLab(n, sources.labs)?.name ?? n), idx),
    certificates: [focus],
  }
}

export function queryRelations(focus: EntityRef, sources: EcosystemSources, idx: EcosystemIndexes): EntityBundle {
  switch (focus.kind) {
    case 'job': {
      const job = sources.jobs.find((j) => j.name === focus.id)
      if (!job) return emptyBundle(focus)
      return bundleForJob(job, sources, idx)
    }
    case 'lab': {
      const lab = resolveLab(focus.id, sources.labs) ?? sources.labs.find((l) => l.name === focus.id)
      if (!lab) return emptyBundle(focus)
      return bundleForLab(lab, sources, idx)
    }
    case 'course': {
      const course = sources.courses.find((c) => String(c.id) === focus.id)
      if (!course) return emptyBundle(focus)
      return bundleForCourse(course, sources, idx)
    }
    case 'faculty': {
      const teacher = sources.teachers.find((t) => String(t.id) === focus.id)
      if (!teacher) return emptyBundle(focus)
      return bundleForFaculty(teacher, sources, idx)
    }
    case 'competition':
      return bundleForCompetition(focus.id, sources, idx)
    case 'certificate':
      return bundleForCertificate(focus.id, sources, idx)
    default:
      return emptyBundle(focus)
  }
}

function emptyBundle(focus: EntityRef): EntityBundle {
  return { focus, jobs: [], labs: [], courses: [], faculty: [], competitions: [], certificates: [] }
}

export function searchEntities(q: string, sources: EcosystemSources, limit = 20): EntityRef[] {
  if (!q.trim()) return []
  const lower = q.toLowerCase()
  const out: EntityRef[] = []

  for (const j of sources.jobs) {
    if (j.name.toLowerCase().includes(lower)) out.push(jobRef(j))
  }
  for (const l of sources.labs) {
    if (l.name.toLowerCase().includes(lower)) out.push(labRef(l))
  }
  for (const c of sources.courses) {
    if (c.name.toLowerCase().includes(lower)) out.push(courseRef(c))
  }
  for (const t of sources.teachers) {
    if (t.name.toLowerCase().includes(lower) || t.keywords.toLowerCase().includes(lower)) out.push(facultyRef(t))
  }
  if (sources.compCert) {
    for (const c of sources.compCert.competitions) {
      if (c.name.toLowerCase().includes(lower)) out.push(competitionRef(c.name, c.category))
    }
    for (const c of sources.compCert.certificates) {
      const label = c.shortName || c.fullName
      if (label.toLowerCase().includes(lower) || c.fullName.toLowerCase().includes(lower)) {
        out.push(certificateRef(c.fullName, c.org))
      }
    }
  }
  return uniqRefs(out).slice(0, limit)
}

export const ENTITY_KIND_META: Record<EntityKind, { label: string; color: string }> = {
  job: { label: '岗位', color: '#c45c26' },
  lab: { label: '实训室', color: '#9a7b5f' },
  course: { label: '课程', color: '#b8860b' },
  faculty: { label: '师资', color: '#5b7fa5' },
  competition: { label: '竞赛', color: '#e65100' },
  certificate: { label: '证书', color: '#00796b' },
}

export function bundleCounts(b: EntityBundle) {
  return {
    jobs: b.jobs.length,
    labs: b.labs.length,
    courses: b.courses.length,
    faculty: b.faculty.length,
    competitions: b.competitions.length,
    certificates: b.certificates.length,
  }
}
