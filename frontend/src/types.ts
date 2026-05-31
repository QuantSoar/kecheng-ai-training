export interface CourseCounts {
  general: number
  foundation: number
  core: number
  practice: number
  total: number
}

export interface Lab {
  id: number
  name: string
  original_name?: string
  course_counts: CourseCounts
  vendor_course_count: number
  course_ids: number[]
}

export interface VendorDetail {
  id: number
  lab_name: string
  original_lab_name?: string
  name: string
  description: string
  type: string
  type_label: string
  original_type?: string
  hardware_bound: boolean
  hardware: string
  hours_total?: number | string | null
  hours_theory?: number | string | null
  hours_practice?: number | string | null
  vendor: string
  capability?: string
  jobs?: string
}

export interface Course {
  id: number
  lab_name: string
  type: 'general' | 'foundation' | 'core' | 'practice' | 'other'
  type_label: string
  name: string
  hours?: number | string | null
  textbook?: string
  platform?: string
  source: string
  note?: string
  is_vendor: boolean
  vendor?: string
  description?: string
  hardware?: string
  vendor_detail?: VendorDetail
}

export interface SharedCourse {
  name: string
  lab_count: number
  labs: string[]
  course_ids: number[]
}

export interface TypeStat {
  label: string
  type: string
  count: number
  ratio: number
}

export interface VendorStat {
  vendor: string
  count: number
  ratio: number
  lab_count: number
}

export interface GraphData {
  meta: {
    total_courses: number
    total_labs: number
    total_vendor_courses: number
    vendor_count: number
    shared_course_count: number
  }
  labs: Lab[]
  courses: Course[]
  vendor_courses: VendorDetail[]
  overview: unknown[]
  stats: {
    type_distribution: TypeStat[]
    vendor_distribution: VendorStat[]
  }
  shared_courses: SharedCourse[]
}

export const TYPE_COLORS: Record<string, string> = {
  general: '#9a7b5f',
  foundation: '#5b7fa5',
  core: '#b8860b',
  practice: '#6b8f3c',
  other: '#c4a882',
}

export const TYPE_LABELS: Record<string, string> = {
  general: '通识课程',
  foundation: '专业基础课',
  core: '专业核心课',
  practice: '专业实践课',
}
