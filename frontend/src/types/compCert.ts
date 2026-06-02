export interface CompetitionItem {
  id: number
  name: string
  category: string
  organizer: string
  level: string
  official: string
  rating: string
  labs: string[]
  jobs: string[]
  summary: string
  audience: string
}

export interface CertificateItem {
  id: number
  category: string
  org: string
  fullName: string
  shortName: string
  level: string
  field: string
  labs: string[]
  examForm: string
  recognition: string
  note: string
}

export interface LabCompetitionRow {
  lab: string
  count: number
  competitionText: string
  audience: string
}

export interface JobCompetitionRow {
  label: string
  isCategory: boolean
  count: number
  competitionText: string
  audience: string
}

export interface CategoryStatRow {
  category: string
  count: number
  star5: number
  star4: number
  star3: number
  examples: string
  audience: string
}

export interface CompCertData {
  meta: {
    total_competitions: number
    total_certificates: number
    total_labs_mapped: number
    source_file: string
  }
  competitions: CompetitionItem[]
  certificates: CertificateItem[]
  labCompetitions: LabCompetitionRow[]
  jobCompetitions: JobCompetitionRow[]
  categoryStats: CategoryStatRow[]
  recommendations: string[]
}

export const RATING_COLORS: Record<string, string> = {
  '★★★★★': '#c45c26',
  '★★★★☆': '#1565c0',
  '★★★☆☆': '#546e7a',
  '★★☆☆☆': '#9e9e9e',
}
