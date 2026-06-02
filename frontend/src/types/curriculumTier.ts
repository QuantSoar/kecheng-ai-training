import type { Course } from '../types'

export type CurriculumTierId = 'enterprise' | 'internship' | 'academy'

export interface CurriculumTier {
  id: CurriculumTierId
  label: string
  shortLabel: string
  period: string
  hours: string
  hourRange: [number, number]
  format: string
  faculty: string
  frequency: string
  materials: string
  color: string
}

export const CURRICULUM_TIERS: CurriculumTier[] = [
  {
    id: 'enterprise',
    label: '企业培训课程体系',
    shortLabel: '企业培训',
    period: '1–7 天',
    hours: '8–56 学时',
    hourRange: [8, 56],
    format: '线上 + 线下',
    faculty: '企业、社培',
    frequency: '高',
    materials: '视频(PPT) + 文档 + 案例',
    color: '#c45c26',
  },
  {
    id: 'internship',
    label: '实习实训课程体系',
    shortLabel: '实习实训',
    period: '1–4 周',
    hours: '56–160 学时',
    hourRange: [56, 160],
    format: '线下',
    faculty: '企业、高校',
    frequency: '中',
    materials: '实训指导书、PPT、讲义、案例',
    color: '#1565c0',
  },
  {
    id: 'academy',
    label: '产业学院课程体系',
    shortLabel: '产业学院',
    period: '1–4 月',
    hours: '160–640 学时',
    hourRange: [160, 640],
    format: '线下',
    faculty: '企业、高校',
    frequency: '低',
    materials: '教学大纲、讲义、教案、PPT、实训指导书、案例、习题',
    color: '#6b8f3c',
  },
]

export const CURRICULUM_PRINCIPLES = [
  {
    no: '01',
    title: '按周期分三层体系',
    text: '每个实训室模块均应具备短、中、长三种课程版本，覆盖不同学习周期与培养目标。',
  },
  {
    no: '02',
    title: '完整一体化方案',
    text: '每层体系均包含培养目标、学时分配、项目任务、考核方式与配套资源，可独立交付。',
  },
  {
    no: '03',
    title: '与师资动态匹配',
    text: '同一套课程可适配不同专长师资；也可按企业定制需求匹配相应讲师与模块组合。',
  },
  {
    no: '04',
    title: '高校灵活适配',
    text: '高校实习采用基地标准参考方案，再由校内教师按本校标准二次优化调整。',
  },
]

export const TIER_BY_ID = Object.fromEntries(
  CURRICULUM_TIERS.map((t) => [t.id, t]),
) as Record<CurriculumTierId, CurriculumTier>

const TYPE_ORDER: Record<string, number> = {
  general: 0,
  foundation: 1,
  core: 2,
  practice: 3,
  other: 4,
}

export function parseCourseHours(hours: Course['hours']): number {
  if (hours == null || hours === '') return 0
  if (typeof hours === 'number' && Number.isFinite(hours)) return hours
  const n = parseInt(String(hours).replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function sumCourseHours(courses: Course[]): number {
  return courses.reduce((s, c) => s + parseCourseHours(c.hours), 0)
}

export type TierFitStatus = 'fit' | 'partial' | 'exceed'

/** 根据实训室现有课程总学时，判断与某层体系的匹配程度 */
export function tierFitStatus(totalHours: number, tier: CurriculumTier): TierFitStatus {
  const [min, max] = tier.hourRange
  if (totalHours >= min && totalHours <= max) return 'fit'
  if (totalHours < min) return 'partial'
  return 'exceed'
}

export const TIER_FIT_LABEL: Record<TierFitStatus, string> = {
  fit: '学时匹配',
  partial: '内容可扩展',
  exceed: '可裁剪组合',
}

/** 按课程类型与学时，为某层体系推荐一组教学模块 */
export function selectCoursesForTier(courses: Course[], tier: CurriculumTier): Course[] {
  const sorted = [...courses].sort((a, b) => {
    const ta = TYPE_ORDER[a.type] ?? 9
    const tb = TYPE_ORDER[b.type] ?? 9
    if (ta !== tb) return ta - tb
    return parseCourseHours(b.hours) - parseCourseHours(a.hours)
  })
  const [min, max] = tier.hourRange
  const selected: Course[] = []
  let sum = 0
  for (const c of sorted) {
    const h = parseCourseHours(c.hours) || 4
    if (sum >= min && sum <= max) break
    if (sum + h > max && sum >= min) break
    selected.push(c)
    sum += h
  }
  if (!selected.length && sorted.length) {
    return sorted.slice(0, Math.min(6, sorted.length))
  }
  return selected
}

export function tierStatsForLabs(
  labs: { id: number; name: string; course_ids: number[] }[],
  courses: Course[],
): { tier: CurriculumTier; labCount: number }[] {
  const courseByLab = new Map<string, Course[]>()
  for (const c of courses) {
    const list = courseByLab.get(c.lab_name) ?? []
    list.push(c)
    courseByLab.set(c.lab_name, list)
  }
  return CURRICULUM_TIERS.map((tier) => {
    let labCount = 0
    for (const lab of labs) {
      const labCourses = courses.filter((c) => lab.course_ids.includes(c.id))
      const total = sumCourseHours(labCourses)
      const status = tierFitStatus(total, tier)
      if (status === 'fit' || status === 'exceed') labCount += 1
    }
    return { tier, labCount }
  })
}
