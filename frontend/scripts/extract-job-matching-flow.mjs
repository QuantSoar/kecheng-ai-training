import fs from 'fs'

const src = 'D:/Code/Kecheng/frontend/src/pages/JobSkillMap.tsx'
const dst = 'D:/Code/Kecheng/frontend/src/components/JobMatchingFlow.tsx'
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/)

const imports = `import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, BookOpen, Users, Building2, Search, CheckCircle2, Trophy, Award, ChevronRight, ExternalLink,
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

const helpers = lines.slice(46, 1269).join('\n')
let main = lines.slice(1271, 1953).join('\n')
main = main.replace('export default function JobSkillMap()', 'export default function JobMatchingFlow()')

// Remove SkillMapInfographic import usage - strip infographic block from return
const infographicStart = main.indexOf('      <SkillMapInfographic')
const infographicEnd = main.indexOf('      <JobInfographicLinkage', infographicStart)
if (infographicStart >= 0 && infographicEnd >= 0) {
  main = main.slice(0, infographicStart) + main.slice(infographicEnd)
}

// Remove JobInfographicLinkage block
const linkageStart = main.indexOf('      <JobInfographicLinkage')
const linkageEnd = main.indexOf('      {/* 培养资源匹配流程', linkageStart)
if (linkageStart >= 0 && linkageEnd >= 0) {
  main = main.slice(0, linkageStart) + main.slice(linkageEnd)
}

// Remove JobSelectorToolbar from return (matching has sidebar)
const toolbarStart = main.indexOf('      <JobSelectorToolbar')
const toolbarEnd = main.indexOf('      {!selectedJob ?', toolbarStart)
if (toolbarStart >= 0 && toolbarEnd >= 0) {
  main = main.slice(0, toolbarStart) + main.slice(toolbarEnd)
}

// Remove unused imports from main - handled by not importing SkillMapInfographic etc.

fs.writeFileSync(dst, imports + '\n' + helpers + '\n\n' + main + '\n')
console.log('Wrote', dst)
