import fs from 'fs'

const src = 'D:/Code/Kecheng/frontend/src/pages/JobSkillMap.tsx'
const flowDst = 'D:/Code/Kecheng/frontend/src/components/JobMatchingFlow.tsx'
const mapDst = 'D:/Code/Kecheng/frontend/src/pages/JobSkillMap.tsx'
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/)

const flowImports = `import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, BookOpen, Users, Building2, Search, CheckCircle2, Trophy, Award, ChevronRight, ExternalLink, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useJobMap } from '../context/JobMapContext'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useCompCert } from '../context/CompCertContext'
import CourseDetailDrawer from './CourseDetailDrawer'
import { JOB_CATEGORY_COLORS, type JobProfile, type LabJobCourseRow, type LabLinkLevel, type JobSkillItem } from '../types/jobMap'
import type { Course, Lab } from '../types'
import { TYPE_COLORS } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import { selectClass } from '../styles/form'
import {
  resolveCourse, resolveLab, facultyForJob, jobLinkStats, collectJobCourseNames,
} from '../utils/jobLink'
import { buildLabIntegrations, type LabIntegration } from '../utils/integrate'
import {
  detailedCompetitionsForJob, detailedCompetitionsForLab, detailedCertificatesForLab,
} from '../utils/certLink'
import {
  CompetitionCard, CertificateRow, JobLabContextChips, CertificateDetailPanel, CompetitionDetailPanel,
} from './JobCompCertLinkage'
import type { CertificateItem, CompetitionItem } from '../types/compCert'
import { useEcosystem } from '../context/EcosystemContext'
import { useCrossNavState, buildCrossNavUrl } from '../utils/crossNav'
import {
  CURRICULUM_TIERS, selectCoursesForTier, sumCourseHours, tierFitStatus, TIER_FIT_LABEL, type CurriculumTierId,
} from '../types/curriculumTier'
`

// helpers for matching: shortLab through splitCapability (lines 52-1269, 1-indexed)
const flowHelpers = lines.slice(51, 1269).join('\n')

let flowMain = lines.slice(1270, 1953).join('\n')
flowMain = flowMain.replace('export default function JobSkillMap()', 'export default function JobMatchingFlow()')

// Remove page header
flowMain = flowMain.replace(
  /  return \(\s*\n    <div className="space-y-4">\s*\n      <header>[\s\S]*?<\/header>\s*\n\n/,
  '  return (\n    <div className="space-y-4">\n\n',
)

// Remove infographic block
flowMain = flowMain.replace(
  /\{selectedJob && \(\s*\n        <div className="rounded-2xl overflow-hidden shadow-xl[\s\S]*?\)\s*\n      \}\s*\n\n      \{selectedJob && \(/,
  '{selectedJob && (',
)

// Fix empty state title
flowMain = flowMain.replace('岗位技能图谱', '培养资源匹配')
flowMain = flowMain.replace(
  '<h1 className="text-xl font-bold text-warm-900">培养资源匹配</h1>',
  '<h2 className="text-lg font-bold text-warm-900">培养资源匹配流程</h2>',
)

fs.writeFileSync(flowDst, flowImports + '\n' + flowHelpers + '\n\n' + flowMain + '\n')

// --- Slim JobSkillMap ---
const mapImports = `import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Layers, Target, BookOpen, Cpu, Database, Shield,
  Palette, Bot, LineChart, Users, Wrench, Sparkles, ChevronRight, Clock, GraduationCap, ExternalLink,
  Building2, Search, Trophy, Award,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useJobMap } from '../context/JobMapContext'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useCompCert } from '../context/CompCertContext'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import {
  JOB_CATEGORY_COLORS,
  LEVEL_LABELS,
  type JobProfile,
  type JobSkillItem,
  type LabJobCourseRow,
  type LabLinkLevel,
} from '../types/jobMap'
import type { Course, Lab } from '../types'
import { resolveCourse, resolveLab } from '../utils/jobLink'
import {
  detailedCompetitionsForJob,
  detailedCertificatesForLab,
} from '../utils/certLink'
import { buildLabIntegrations } from '../utils/integrate'
import { useEcosystem } from '../context/EcosystemContext'
import { useCrossNavState } from '../utils/crossNav'
import { selectClass } from '../styles/form'
`

// shortLab, JobSelectorToolbar, sortLabLinks, MAP...SkillMapInfographic (lines 52-54, 239-958)
const mapParts = [
  lines.slice(51, 54).join('\n'),
  lines.slice(238, 357).join('\n'),
  lines.slice(358, 368).join('\n'),
  lines.slice(519, 958).join('\n'),
].join('\n\n')

const mapMain = `export default function JobSkillMap() {
  const { data, loading, error } = useJobMap()
  const { data: graphData } = useData()
  const { data: compCertData } = useCompCert()
  const { params, setParams } = useCrossNavState()
  const { setFocus } = useEcosystem()
  const [jobName, setJobName] = useState('')
  const [category, setCategory] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const courses = graphData?.courses ?? []
  const labs = graphData?.labs ?? []

  const resolveCourseByName = useCallback(
    (name: string) => resolveCourse(name, courses),
    [courses],
  )

  const handleCourseClick = useCallback((course: Course) => {
    setSelectedCourse(course)
    setFocus({ kind: 'course', id: String(course.id), label: course.name, subtitle: course.lab_name })
  }, [setFocus])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.jobs.map((j) => j.category).filter(Boolean))]
  }, [data])

  const filteredJobs = useMemo(() => {
    if (!data) return []
    return data.jobs.filter((j) => !category || j.category === category)
  }, [data, category])

  const selectedJob = useMemo(() => {
    if (!filteredJobs.length) return null
    const prefer = params.job || jobName
    if (prefer && filteredJobs.some((j) => j.name === prefer)) {
      return filteredJobs.find((j) => j.name === prefer) ?? filteredJobs[0]
    }
    return filteredJobs[0]
  }, [filteredJobs, jobName, params.job])

  useEffect(() => {
    if (params.job && params.job !== jobName) setJobName(params.job)
  }, [params.job])

  const labCourses = useMemo(() => {
    if (!data || !selectedJob) return []
    return data.labCourseRows.filter((r) => r.job === selectedJob.name)
  }, [data, selectedJob])

  const selectedLabCanonical = useMemo(() => {
    if (!selectedJob) return null
    if (params.lab) return resolveLab(params.lab, labs)?.name ?? params.lab
    const preferred =
      selectedJob.labLinks.find((l) => l.level === 'core') ??
      selectedJob.labLinks.find((l) => l.level === 'important') ??
      selectedJob.labLinks[0]
    return preferred ? (resolveLab(preferred.lab, labs)?.name ?? preferred.lab) : null
  }, [selectedJob, params.lab, labs])

  const handleSelectJob = useCallback((name: string) => {
    setJobName(name)
    setParams({ job: name, lab: params.lab })
    setFocus({ kind: 'job', id: name, label: name })
  }, [setParams, params.lab, setFocus])

  const handleSelectLab = useCallback((lab: string) => {
    setParams({ job: selectedJob?.name, lab })
    setFocus({ kind: 'lab', id: lab, label: lab })
  }, [setParams, selectedJob?.name, setFocus])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || !data.jobs.length) {
    return (
      <div className="text-center py-16">
        <Layers className="mx-auto text-accent-primary mb-4" size={48} />
        <h1 className="text-xl font-bold text-warm-900">岗位技能图谱</h1>
        <p className="text-warm-600 mt-2 max-w-md mx-auto">
          {error || '请前往「数据管理」上传岗位映射 Excel，或将 jobs.xlsx 放到 data/ 目录后重新加载'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gradient">岗位图谱</h1>
        <p className="text-warm-600 text-sm mt-1">
          {data.meta.total_jobs} 个岗位 · 技能矩阵与资源联动预览 · 完整匹配请前往
          <Link to="/integrated" className="text-accent-primary hover:underline mx-1">综合匹配</Link>
        </p>
      </header>

      {selectedJob ? (
        <div className="rounded-2xl overflow-hidden shadow-xl border border-warm-300 bg-warm-100">
          <JobSelectorToolbar
            embedded
            jobs={filteredJobs}
            categories={categories}
            category={category}
            onCategoryChange={(c) => { setCategory(c); setJobName('') }}
            selectedName={selectedJob.name}
            onSelect={handleSelectJob}
            search={jobSearch}
            onSearchChange={setJobSearch}
          />
          <SkillMapInfographic
            embedded
            job={selectedJob}
            labs={labs}
            labCourses={labCourses}
            compCertData={compCertData}
            allJobs={data.jobs}
            selectedLabCanonical={selectedLabCanonical}
            onSelectLab={handleSelectLab}
            onFocus={setFocus}
            resolveCourseByName={resolveCourseByName}
            onCourseClick={handleCourseClick}
          />
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 border border-warm-300 text-center text-warm-500 text-sm">
          请选择岗位大类或调整筛选条件
        </div>
      )}

      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
`

fs.writeFileSync(mapDst, mapImports + '\n' + mapParts + '\n\n' + mapMain + '\n')
console.log('Done')
