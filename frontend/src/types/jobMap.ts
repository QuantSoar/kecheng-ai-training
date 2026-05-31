export type LabLinkLevel = 'core' | 'important' | 'basic' | 'none'

export interface JobSkillItem {
  domain: string
  junior: string
  mid: string
  senior: string
  labs: string[]
  courses: string[]
}

export interface JobProfile {
  id: number
  name: string
  category: string
  keywords: string
  heat: string
  skills: JobSkillItem[]
  labLinks: { lab: string; level: LabLinkLevel }[]
}

export interface LabJobCourseRow {
  lab: string
  domainGroup: string
  job: string
  courses: string[]
  courseType: string
  linkLevel: LabLinkLevel
  capability: string
  jobCategory: string
}

export interface JobGapItem {
  category: string
  description: string
  scope: string
  severity: string
  suggestion: string
}

export interface JobMapData {
  meta: {
    total_jobs: number
    total_skills: number
    total_lab_links: number
    source_file: string
  }
  jobs: JobProfile[]
  labCourseRows: LabJobCourseRow[]
  gaps: JobGapItem[]
  labColumns: string[]
}

export const JOB_CATEGORY_COLORS: Record<string, string> = {
  '基础设施类': '#546e7a',
  '数据类': '#6d4c41',
  '核心技术类': '#1565c0',
  '产品/交付类': '#c45c26',
  '应用开发类': '#00838f',
}

export const LEVEL_LABELS = ['初级', '中级', '高级'] as const

export const LEVEL_PERSONA_SUFFIX = ['执行者', '规划者', '战略家'] as const
