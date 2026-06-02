import type { Course, Lab } from '../types'
import type { CurriculumDesignData, CurriculumTrackCourse, TrainingTrack } from '../types/curriculumDesign'
import type { CurriculumTierId } from '../types/curriculumTier'
import type { JobProfile, LabLinkLevel } from '../types/jobMap'
import { resolveCourse, resolveLab } from './jobLink'

function norm(s: string) {
  return s.trim().replace(/\s/g, '').toLowerCase()
}

function courseKey(lab: string, courseName: string) {
  return `${norm(lab)}|${norm(courseName)}`
}

export function buildDesignJobIndex(links: CurriculumDesignData['courseJobLinks']) {
  const byCourseLab = new Map<string, { jobName: string; level: LabLinkLevel }[]>()
  const byCourseName = new Map<string, { jobName: string; level: LabLinkLevel }[]>()

  for (const link of links) {
    const kl = courseKey(link.lab, link.courseName)
    if (!byCourseLab.has(kl)) byCourseLab.set(kl, [])
    const kn = norm(link.courseName)
    if (!byCourseName.has(kn)) byCourseName.set(kn, [])

    for (const j of link.jobs) {
      const push = (m: Map<string, { jobName: string; level: LabLinkLevel }[]>, key: string) => {
        const arr = m.get(key)!
        if (!arr.some((x) => x.jobName === j.jobName)) arr.push(j)
      }
      push(byCourseLab, kl)
      push(byCourseName, kn)
    }
  }
  return { byCourseLab, byCourseName }
}

export function jobsForCourseFromDesign(
  course: Course,
  design: CurriculumDesignData | null,
  jobs: JobProfile[],
  labs: Lab[],
  index?: ReturnType<typeof buildDesignJobIndex>,
): JobProfile[] {
  if (!design) return []
  const idx = index ?? buildDesignJobIndex(design.courseJobLinks)
  const labCanonical = resolveLab(course.lab_name, labs)?.name ?? course.lab_name
  const matched = new Map<string, JobProfile>()

  const attach = (entries: { jobName: string; level: LabLinkLevel }[]) => {
    for (const { jobName } of entries) {
      const job = jobs.find((j) => j.name === jobName)
      if (job) matched.set(job.name, job)
    }
  }

  attach(idx.byCourseLab.get(courseKey(labCanonical, course.name)) ?? [])
  attach(idx.byCourseName.get(norm(course.name)) ?? [])

  return [...matched.values()]
}

export function mergeJobLists(...lists: JobProfile[][]): JobProfile[] {
  const m = new Map<string, JobProfile>()
  for (const list of lists) {
    for (const j of list) m.set(j.name, j)
  }
  return [...m.values()]
}

export function coursesForJobTrack(
  design: CurriculumDesignData,
  jobName: string,
  labCanonical: string | null,
  track: TrainingTrack,
): CurriculumTrackCourse[] {
  const allowed = new Set<string>()
  for (const link of design.courseJobLinks) {
    if (!link.jobs.some((j) => j.jobName === jobName)) continue
    if (labCanonical && link.lab !== labCanonical) continue
    allowed.add(norm(link.courseName))
  }
  return design.trackCourses.filter(
    (c) =>
      c.track === track &&
      allowed.has(norm(c.courseName)) &&
      (!labCanonical || c.lab === labCanonical),
  )
}

export function trackCoursesForCourse(
  course: Course,
  design: CurriculumDesignData | null,
  labs: Lab[],
): CurriculumTrackCourse[] {
  if (!design) return []
  const labCanonical = resolveLab(course.lab_name, labs)?.name ?? course.lab_name
  const n = norm(course.name)
  return design.trackCourses.filter(
    (c) => c.lab === labCanonical && norm(c.courseName) === n,
  )
}

export function resolveDesignCourse(
  name: string,
  lab: string,
  courses: Course[],
  labs: Lab[],
): Course | null {
  const canonical = resolveLab(lab, labs)?.name ?? lab
  const matched = resolveCourse(name, courses.filter((c) => c.lab_name === canonical))
  return matched ?? resolveCourse(name, courses)
}

export function tierIdToTrack(tierId: CurriculumTierId): TrainingTrack {
  return tierId === 'academy' ? 'industry' : tierId
}

export function trackCoursesForLabTier(
  design: CurriculumDesignData,
  labName: string,
  tierId: CurriculumTierId,
): CurriculumTrackCourse[] {
  const canonical = labName.trim()
  const track = tierIdToTrack(tierId)
  return design.trackCourses.filter((c) => c.lab === canonical && c.track === track)
}

export function designCourseTypeToCourseType(courseType: string): Course['type'] {
  if (courseType.includes('通识')) return 'general'
  if (courseType.includes('基础')) return 'foundation'
  if (courseType.includes('实践')) return 'practice'
  if (courseType.includes('核心')) return 'core'
  return 'other'
}

export function parseDesignHours(hours: string): number {
  const n = parseInt(hours.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function sumDesignTrackHours(entries: CurriculumTrackCourse[]): number {
  return entries.reduce((s, e) => s + parseDesignHours(e.hours), 0)
}

export function designTrackCourseToDisplay(
  entry: CurriculumTrackCourse,
  labName: string,
  matched: Course | null,
  seqId: number,
): Course {
  const designMeta = [
    entry.objective && `培养目标：${entry.objective}`,
    entry.project && `项目任务：${entry.project}`,
    entry.exam && `考核方式：${entry.exam}`,
    entry.materials && `配套资料：${entry.materials}`,
  ].filter(Boolean).join('\n')

  if (matched) {
    return {
      ...matched,
      type: designCourseTypeToCourseType(entry.courseType) || matched.type,
      type_label: entry.courseType || matched.type_label,
      hours: entry.hours || matched.hours,
      source: matched.source || '实训室课程体系设计',
      description: designMeta || matched.description,
    }
  }

  return {
    id: -(1_000_000 + seqId),
    lab_name: labName,
    type: designCourseTypeToCourseType(entry.courseType),
    type_label: entry.courseType,
    name: entry.courseName,
    hours: entry.hours,
    source: '实训室课程体系设计',
    is_vendor: false,
    description: designMeta || undefined,
  }
}
