import type { Course, Lab } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import type { JobProfile, LabJobCourseRow } from '../types/jobMap'
import { TYPE_LABELS } from '../types'
import { resolveLab } from './jobLink'

export interface LabIntegration {
  lab: Lab
  courses: Course[]
  faculty: FacultyTeacher[]
  vendorCourses: number
  facultyBySource: Record<string, number>
  matchLevel: 'good' | 'course-heavy' | 'faculty-heavy' | 'gap' | 'empty'
  matchLabel: string
  jobCount: number
  linkedJobs: string[]
  courseTypes: Record<string, number>
  /** 有明确可授教师（capable_courses 匹配）的课程占比 0–100 */
  strictCoveragePct: number
  /** 每门课平均可匹配师资数（本室内） */
  avgFacultyPerCourse: number
  vendorRatioPct: number
  sharedCourseCount: number
  courseFacultyRatio: number | null
}

function normText(s: string) {
  return s.trim().replace(/\s/g, '').toLowerCase()
}

function courseNameMatch(a: string, b: string) {
  const na = normText(a)
  const nb = normText(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

export function facultyCanTeachCourse(course: Course, teacher: FacultyTeacher): boolean {
  if (!teacher.lab_list.includes(course.lab_name)) return false
  if (!teacher.capable_courses?.trim()) return false
  const parts = teacher.capable_courses.split(/[,，、;/\n]+/).map((s) => s.trim()).filter(Boolean)
  return parts.some((p) => courseNameMatch(p, course.name))
}

export function computeStrictCoverage(courses: Course[], faculty: FacultyTeacher[]): {
  pct: number
  covered: number
  avgFacultyPerCourse: number
} {
  if (!courses.length) return { pct: 0, covered: 0, avgFacultyPerCourse: 0 }
  let covered = 0
  let facultyHits = 0
  for (const c of courses) {
    const matches = faculty.filter((t) => facultyCanTeachCourse(c, t))
    if (matches.length > 0) {
      covered += 1
      facultyHits += matches.length
    }
  }
  return {
    pct: Math.round((covered / courses.length) * 100),
    covered,
    avgFacultyPerCourse: Math.round((facultyHits / courses.length) * 10) / 10,
  }
}

export function buildLabJobIndex(jobs: JobProfile[], labs: Lab[]): Map<string, string[]> {
  const map = new Map<string, Set<string>>()
  for (const job of jobs) {
    for (const { lab } of job.labLinks) {
      const canonical = resolveLab(lab, labs)?.name ?? lab.trim()
      if (!canonical) continue
      if (!map.has(canonical)) map.set(canonical, new Set())
      map.get(canonical)!.add(job.name)
    }
    for (const skill of job.skills) {
      for (const lab of skill.labs) {
        const canonical = resolveLab(lab, labs)?.name ?? lab.trim()
        if (!canonical) continue
        if (!map.has(canonical)) map.set(canonical, new Set())
        map.get(canonical)!.add(job.name)
      }
    }
  }
  const result = new Map<string, string[]>()
  for (const [lab, set] of map) {
    result.set(lab, [...set].sort())
  }
  return result
}

export function buildSharedCourseIndex(courses: Course[]): Map<string, number> {
  const byName = new Map<string, Set<string>>()
  for (const c of courses) {
    if (!byName.has(c.name)) byName.set(c.name, new Set())
    byName.get(c.name)!.add(c.lab_name)
  }
  const shared = new Map<string, number>()
  for (const [name, labs] of byName) {
    if (labs.size >= 2) shared.set(name, labs.size)
  }
  return shared
}

export function buildLabIntegrations(
  labs: Lab[],
  courses: Course[],
  teachers: FacultyTeacher[],
  opts?: {
    jobs?: JobProfile[]
    sharedIndex?: Map<string, number>
  },
): LabIntegration[] {
  const jobIndex = opts?.jobs?.length ? buildLabJobIndex(opts.jobs, labs) : new Map<string, string[]>()
  const sharedIndex = opts?.sharedIndex ?? buildSharedCourseIndex(courses)

  return labs.map((lab) => {
    const labCourses = courses.filter((c) => c.lab_name === lab.name)
    const labFaculty = teachers.filter((t) => t.lab_list.includes(lab.name))
    const vendorCourses = labCourses.filter((c) => c.is_vendor).length

    const facultyBySource: Record<string, number> = {}
    for (const t of labFaculty) {
      const key = t.source || '未知'
      facultyBySource[key] = (facultyBySource[key] ?? 0) + 1
    }

    const courseTypes: Record<string, number> = {}
    for (const c of labCourses) {
      courseTypes[c.type] = (courseTypes[c.type] ?? 0) + 1
    }

    let sharedCourseCount = 0
    for (const c of labCourses) {
      if ((sharedIndex.get(c.name) ?? 0) >= 2) sharedCourseCount += 1
    }

    const coverage = computeStrictCoverage(labCourses, labFaculty)
    const linkedJobs = jobIndex.get(lab.name) ?? []

    const cc = labCourses.length
    const fc = labFaculty.length
    let matchLevel: LabIntegration['matchLevel'] = 'good'
    let matchLabel = '匹配良好'

    if (cc === 0 && fc === 0) {
      matchLevel = 'empty'
      matchLabel = '暂无数据'
    } else if (cc >= 10 && fc < 3) {
      matchLevel = 'gap'
      matchLabel = '师资缺口'
    } else if (cc >= 20 && fc < cc * 0.15) {
      matchLevel = 'course-heavy'
      matchLabel = '课程偏重'
    } else if (fc >= 10 && fc > cc * 0.8 && cc < fc) {
      matchLevel = 'faculty-heavy'
      matchLabel = '师资充裕'
    } else if (cc >= 5 && coverage.pct < 30) {
      matchLevel = 'gap'
      matchLabel = '课师映射弱'
    }

    return {
      lab,
      courses: labCourses,
      faculty: labFaculty,
      vendorCourses,
      facultyBySource,
      matchLevel,
      matchLabel,
      jobCount: linkedJobs.length,
      linkedJobs,
      courseTypes,
      strictCoveragePct: coverage.pct,
      avgFacultyPerCourse: coverage.avgFacultyPerCourse,
      vendorRatioPct: cc ? Math.round((vendorCourses / cc) * 100) : 0,
      sharedCourseCount,
      courseFacultyRatio: fc > 0 ? Math.round((cc / fc) * 10) / 10 : null,
    }
  })
}

export interface JobIntegrationRow {
  job: JobProfile
  labCount: number
  courseNames: number
  matchedCourses: number
  facultyCount: number
  labs: string[]
  completenessPct: number
}

export function buildJobIntegrationRows(
  jobs: JobProfile[],
  labCourseRows: LabJobCourseRow[],
  courses: Course[],
  teachers: FacultyTeacher[],
  labs: Lab[],
): JobIntegrationRow[] {
  return jobs.map((job) => {
    const labSet = new Set<string>()
    for (const { lab } of job.labLinks) {
      const canonical = resolveLab(lab, labs)?.name ?? lab
      if (canonical) labSet.add(canonical)
    }
    const courseNames = new Set<string>()
    for (const row of labCourseRows) {
      if (row.job !== job.name) continue
      for (const c of row.courses) if (c.trim()) courseNames.add(c.trim())
    }
    for (const skill of job.skills) {
      for (const c of skill.courses) if (c.trim()) courseNames.add(c.trim())
    }
    let matched = 0
    for (const name of courseNames) {
      const found = courses.some((c) => {
        if (!courseNameMatch(c.name, name)) return false
        if (labSet.size === 0) return true
        return labSet.has(c.lab_name)
      })
      if (found) matched += 1
    }
    const linkedLabs = [...labSet]
    const facultyCount = teachers.filter((t) => t.lab_list.some((l) => labSet.has(l))).length
    const total = courseNames.size || 1
    return {
      job,
      labCount: labSet.size,
      courseNames: courseNames.size,
      matchedCourses: matched,
      facultyCount,
      labs: linkedLabs,
      completenessPct: Math.round((matched / total) * 100),
    }
  }).sort((a, b) => b.completenessPct - a.completenessPct)
}

export function filterIntegrations(
  items: LabIntegration[],
  opts: {
    lab?: string
    courseType?: string
    facultySource?: string
    facultyLevel?: string
    matchLevel?: LabIntegration['matchLevel'] | ''
    q?: string
  },
): LabIntegration[] {
  let list = items
  if (opts.lab) list = list.filter((i) => i.lab.name === opts.lab)
  if (opts.matchLevel) list = list.filter((i) => i.matchLevel === opts.matchLevel)

  if (opts.courseType || opts.facultySource || opts.facultyLevel || opts.q) {
    list = list.map((item) => {
      let courses = item.courses
      let faculty = item.faculty
      if (opts.courseType) courses = courses.filter((c) => c.type === opts.courseType)
      if (opts.facultySource) faculty = faculty.filter((t) => t.source === opts.facultySource)
      if (opts.facultyLevel) faculty = faculty.filter((t) => t.level === opts.facultyLevel)
      if (opts.q) {
        const lower = opts.q.toLowerCase()
        courses = courses.filter(
          (c) =>
            c.name.toLowerCase().includes(lower) ||
            c.source.toLowerCase().includes(lower) ||
            (c.vendor?.toLowerCase().includes(lower) ?? false),
        )
        faculty = faculty.filter(
          (t) =>
            t.name.toLowerCase().includes(lower) ||
            t.field.toLowerCase().includes(lower) ||
            t.keywords.toLowerCase().includes(lower),
        )
      }
      return { ...item, courses, faculty }
    })
    if (opts.q || opts.courseType || opts.facultySource || opts.facultyLevel) {
      list = list.filter((i) => i.courses.length > 0 || i.faculty.length > 0)
    }
  }
  return list
}

export const MATCH_COLORS: Record<LabIntegration['matchLevel'], string> = {
  good: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  'course-heavy': 'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
  'faculty-heavy': 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  gap: 'bg-red-100 text-red-600 border-red-200',
  empty: 'bg-warm-200 text-warm-500 border-warm-300',
}

export const MATCH_LEVEL_OPTIONS: { value: LabIntegration['matchLevel'] | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'good', label: '匹配良好' },
  { value: 'faculty-heavy', label: '师资充裕' },
  { value: 'course-heavy', label: '课程偏重' },
  { value: 'gap', label: '待改善' },
  { value: 'empty', label: '暂无数据' },
]

export { TYPE_LABELS }
