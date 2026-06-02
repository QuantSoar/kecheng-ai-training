import type { LabLinkLevel } from './jobMap'

export type TrainingTrack = 'enterprise' | 'internship' | 'industry'

export const TRAINING_TRACK_LABELS: Record<TrainingTrack, string> = {
  enterprise: '企业培训',
  internship: '实习实训',
  industry: '产业学院',
}

export const TRAINING_TRACK_META: Record<
  TrainingTrack,
  { period: string; hours: string; form: string }
> = {
  enterprise: { period: '1-7天', hours: '8-56课时', form: '线上+线下' },
  internship: { period: '1-4周', hours: '56-160课时', form: '线下实训' },
  industry: { period: '1-4月', hours: '160-640课时', form: '线下全日制' },
}

export interface CurriculumTrackCourse {
  lab: string
  track: TrainingTrack
  courseType: string
  courseName: string
  hours: string
  objective: string
  project: string
  exam: string
  materials: string
}

export interface CourseJobLinkIndex {
  lab: string
  courseType: string
  courseName: string
  jobs: { jobName: string; level: LabLinkLevel }[]
}

export interface LabCurriculumSummary {
  lab: string
  totalCourses: number
  enterpriseCount: number
  internshipCount: number
  industryCount: number
  coreJobs: string[]
  importantJobs: string[]
  basicJobs: string[]
}

export interface CurriculumDesignData {
  meta: {
    source_file: string
    total_track_courses: number
    total_job_links: number
    total_labs: number
  }
  labSummaries: LabCurriculumSummary[]
  trackCourses: CurriculumTrackCourse[]
  courseJobLinks: CourseJobLinkIndex[]
}
