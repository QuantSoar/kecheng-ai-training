export interface FacultyTeacher {
  id: number
  name: string
  gender: string
  education: string
  university: string
  major: string
  title_level: string
  source: string
  title_dim: string
  level: string
  experience: string
  experience_simple: string
  cert_category: string
  availability: string
  ability: string
  field: string
  field_tags: string[]
  keywords: string
  matched_labs: string
  matched_lab_count: number
  lab_list: string[]
  teaching_mgmt: string
  cooperation_mode: string
  fee_level: string
  priority: string
  priority_score: number | null
  priority_label: string
  recommender_type: string
  recommender: string
  tech_direction: string
  vendor_cert: string
  bio: string
  capable_courses: string
  teacher_cert: string
  note: string
}

export interface FacultyStatItem {
  label: string
  count: number
  ratio: number
  detail?: string
  type?: string
}

export interface FacultyLabStat {
  lab: string
  count: number
  ratio: number
}

export interface FacultyTopItem {
  rank: number
  name: string
  priority: string
  priority_score: number | null
  title_dim: string
  source: string
  recommender_type: string
  matched_labs: string
  keywords: string
}

export interface FacultyData {
  meta: {
    total_teachers: number
    total_labs: number
    source_file: string
    canonical_labs?: string[]
  }
  teachers: FacultyTeacher[]
  stats: Record<string, FacultyStatItem[] | FacultyLabStat[]>
  dimensions: Record<string, string>
  top_priority: FacultyTopItem[]
  lab_recommender_matrix: {
    headers: string[]
    rows: string[][]
  }
}

export const FACULTY_DIM_OPTIONS: { key: string; label: string }[] = [
  { key: 'source', label: '来源维度' },
  { key: 'title_dim', label: '职称维度' },
  { key: 'level', label: '级别维度' },
  { key: 'education', label: '学历' },
  { key: 'gender', label: '性别' },
  { key: 'experience', label: '经验维度' },
  { key: 'cert_category', label: '厂商认证' },
  { key: 'availability', label: '可用性' },
  { key: 'field', label: '专业领域' },
  { key: 'fee_level', label: '费用等级' },
  { key: 'recommender_type', label: '推荐方类型' },
  { key: 'recommender', label: '推荐方' },
  { key: 'priority_bucket', label: '推荐优先级' },
]

export const FACULTY_CHART_COLORS = [
  '#c45c26', '#d97706', '#b8860b', '#6b8f3c', '#5b7fa5',
  '#9a7b5f', '#e85d04', '#8b6914', '#4a7c59', '#7a6555',
  '#a0522d', '#cd853f',
]
