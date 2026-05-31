import type { Course, Lab } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import type { JobProfile, LabJobCourseRow } from '../types/jobMap'
import { normalizeLabName } from '../parsers/facultyParser'

function norm(s: string): string {
  return s.trim().replace(/\s/g, '').toLowerCase()
}

/** 按课程名在课程库中模糊匹配 */
export function resolveCourse(name: string, courses: Course[]): Course | null {
  const raw = name.trim()
  if (!raw || !courses.length) return null

  const n = norm(raw)
  const exact = courses.find((c) => norm(c.name) === n)
  if (exact) return exact

  const partial = courses.filter(
    (c) => norm(c.name).includes(n) || n.includes(norm(c.name)),
  )
  if (partial.length === 1) return partial[0]
  if (partial.length > 1) {
    partial.sort((a, b) => Math.abs(a.name.length - raw.length) - Math.abs(b.name.length - raw.length))
    return partial[0]
  }
  return null
}

export function resolveLab(name: string, labs: Lab[]): Lab | null {
  if (!name.trim() || !labs.length) return null
  const canonical = labs.map((l) => l.name)
  const normalized = normalizeLabName(name.trim(), canonical)
  return labs.find((l) => l.name === normalized) ?? null
}

export function collectJobCourseNames(job: JobProfile, labCourseRows: LabJobCourseRow[]): string[] {
  const names = new Set<string>()
  for (const skill of job.skills) {
    for (const c of skill.courses) if (c.trim()) names.add(c.trim())
  }
  for (const row of labCourseRows) {
    if (row.job !== job.name) continue
    for (const c of row.courses) if (c.trim()) names.add(c.trim())
  }
  return [...names]
}

export function matchJobCourses(job: JobProfile, labCourseRows: LabJobCourseRow[], courses: Course[]): Course[] {
  const names = collectJobCourseNames(job, labCourseRows)
  const matched: Course[] = []
  const seen = new Set<number>()
  for (const name of names) {
    const c = resolveCourse(name, courses)
    if (c && !seen.has(c.id)) {
      seen.add(c.id)
      matched.push(c)
    }
  }
  return matched
}

export function jobLinkedLabNames(job: JobProfile): string[] {
  const names = new Set<string>()
  for (const { lab } of job.labLinks) if (lab.trim()) names.add(lab.trim())
  for (const skill of job.skills) {
    for (const lab of skill.labs) if (lab.trim()) names.add(lab.trim())
  }
  return [...names]
}

export function resolveJobLabs(job: JobProfile, labs: Lab[]): Lab[] {
  const canonical = labs.map((l) => l.name)
  const resolved = new Map<number, Lab>()
  for (const name of jobLinkedLabNames(job)) {
    const lab = resolveLab(name, labs)
    if (lab) resolved.set(lab.id, lab)
  }
  return [...resolved.values()]
}

export function facultyForJob(job: JobProfile, teachers: FacultyTeacher[], labs: Lab[]): FacultyTeacher[] {
  const linkedLabs = new Set(resolveJobLabs(job, labs).map((l) => l.name))
  if (!linkedLabs.size) return []
  return teachers.filter((t) => t.lab_list.some((lab) => linkedLabs.has(lab)))
}

export interface JobLinkStats {
  courseNames: number
  matchedCourses: number
  linkedLabs: number
  faculty: number
}

export function jobLinkStats(
  job: JobProfile,
  labCourseRows: LabJobCourseRow[],
  courses: Course[],
  teachers: FacultyTeacher[],
  labs: Lab[],
): JobLinkStats {
  const names = collectJobCourseNames(job, labCourseRows)
  return {
    courseNames: names.length,
    matchedCourses: matchJobCourses(job, labCourseRows, courses).length,
    linkedLabs: resolveJobLabs(job, labs).length,
    faculty: facultyForJob(job, teachers, labs).length,
  }
}
