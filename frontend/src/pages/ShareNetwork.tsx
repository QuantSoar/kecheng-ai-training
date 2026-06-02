import { useCallback, useMemo, useState, useEffect } from 'react'

import { Link } from 'react-router-dom'

import {

  Briefcase,

  Building2,

  BookOpen,

  Users,

  ExternalLink,

  Network,

  Circle,

  GitBranch,

  Trophy,

  Award,

} from 'lucide-react'

import { useData } from '../context/DataContext'

import { useJobMap } from '../context/JobMapContext'

import { useFaculty } from '../context/FacultyContext'

import { useCompCert } from '../context/CompCertContext'

import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'

import CourseDetailDrawer from '../components/CourseDetailDrawer'

import { EcosystemBadges } from '../components/CrossLinkStrip'

import { selectClass } from '../styles/form'

import { useCrossNavState, buildCrossNavUrl } from '../utils/crossNav'
import { certForLab, certForJob, detailedCompetitionsForJob, detailedCompetitionsForLab, detailedCertificatesForLab } from '../utils/certLink'
import { useEcosystem } from '../context/EcosystemContext'

import type { Course, Lab } from '../types'

import type { FacultyTeacher } from '../types/faculty'

import type { JobProfile, LabJobCourseRow } from '../types/jobMap'

import type { CompCertData } from '../types/compCert'

import {
  resolveCourse,
  resolveJobLabs,
  resolveLab,
  facultyForJob,
  matchJobCourses,
  collectJobCourseNames,
  jobLinkedLabNames,
} from '../utils/jobLink'

import { JOB_CATEGORY_COLORS } from '../types/jobMap'



type LayoutMode = 'force' | 'circular' | 'sankey'



const CATEGORY_META = [

  { name: '岗位', color: WARM_CHART.nodeJob, icon: Briefcase },

  { name: '实训室', color: WARM_CHART.nodeLab, icon: Building2 },

  { name: '课程', color: WARM_CHART.nodeCourse, icon: BookOpen },

  { name: '师资', color: '#5b7fa5', icon: Users },

  { name: '竞赛', color: '#e65100', icon: Trophy },

  { name: '证书', color: '#00897b', icon: Award },

] as const



interface GraphNode {

  id: string

  name: string

  symbolSize: number

  category: number

  itemStyle: Record<string, unknown>

  label: Record<string, unknown>

  _fullName?: string

  _category?: string

  _labId?: number

  _courseId?: number

  _teacherId?: number

  _entity?: 'job' | 'lab' | 'course' | 'teacher' | 'competition' | 'certificate'

}



function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function computeEcosystemStats(
  courses: Course[],
  labs: Lab[],
  teachers: FacultyTeacher[],
  jobs: JobProfile[],
  labCourseRows: LabJobCourseRow[],
) {
  const linkedLabNames = new Set<string>()
  const jobCourseNames = new Set<string>()
  const matchedCourseIds = new Set<number>()

  for (const job of jobs) {
    for (const name of collectJobCourseNames(job, labCourseRows)) {
      jobCourseNames.add(name)
      const matched = resolveCourse(name, courses)
      if (matched) matchedCourseIds.add(matched.id)
    }
    for (const labName of jobLinkedLabNames(job)) {
      const lab = resolveLab(labName, labs)
      if (lab) linkedLabNames.add(lab.name)
    }
  }

  const labsWithCourses = new Set(courses.map((c) => c.lab_name))
  const teachersLinked = teachers.filter((t) =>
    t.lab_list.some((lab) => labsWithCourses.has(lab)),
  ).length

  const integratedLabs = labs.filter((lab) => {
    const hasCourses = courses.some((c) => c.lab_name === lab.name)
    const hasFaculty = teachers.some((t) => t.lab_list.includes(lab.name))
    return hasCourses && hasFaculty
  }).length

  return {
    jobs: jobs.length,
    labs: labs.length,
    courses: courses.length,
    teachers: teachers.length,
    jobLinkedLabs: linkedLabNames.size,
    jobMappedCourses: jobCourseNames.size,
    matchedCourses: matchedCourseIds.size,
    teachersLinked,
    integratedLabs,
  }
}

interface GraphFilters {
  jobCategory: string
  filterLab: string
  filterJob: string
  maxJobs: number
}

function jobTouchesLab(job: JobProfile, labCourseRows: LabJobCourseRow[], labName: string) {
  if (job.labLinks.some((l) => l.lab === labName)) return true
  if (job.skills.some((s) => s.labs.includes(labName))) return true
  return labCourseRows.some((r) => r.job === job.name && r.lab === labName)
}

function filterJobList(jobs: JobProfile[], labCourseRows: LabJobCourseRow[], filters: GraphFilters) {
  let list = jobs.filter(
    (j) =>
      j.labLinks.length > 0 ||
      j.skills.some((s) => s.labs.length > 0 || s.courses.some((c) => c.trim())) ||
      labCourseRows.some((r) => r.job === j.name),
  )
  if (filters.jobCategory) list = list.filter((j) => j.category === filters.jobCategory)
  if (filters.filterJob) list = list.filter((j) => j.name === filters.filterJob)
  if (filters.filterLab) list = list.filter((j) => jobTouchesLab(j, labCourseRows, filters.filterLab))
  if (filters.maxJobs > 0) list = list.slice(0, filters.maxJobs)
  return list
}

/** 当前筛选条件下的关联规模（三表综合，不受图谱节点展示上限影响） */
function computeScopeStats(
  jobList: JobProfile[],
  labCourseRows: LabJobCourseRow[],
  courses: Course[],
  labs: Lab[],
  teachers: FacultyTeacher[],
  filterLab: string,
) {
  const labNames = new Set<string>()
  const matchedCourseIds = new Set<number>()
  const teacherIds = new Set<number>()

  for (const job of jobList) {
    for (const name of collectJobCourseNames(job, labCourseRows)) {
      const matched = resolveCourse(name, courses)
      if (matched) matchedCourseIds.add(matched.id)
    }
    for (const labName of jobLinkedLabNames(job)) {
      if (filterLab && labName !== filterLab) continue
      const lab = resolveLab(labName, labs)
      if (lab) labNames.add(lab.name)
    }
    for (const t of facultyForJob(job, teachers, labs)) {
      if (filterLab && !t.lab_list.includes(filterLab)) continue
      teacherIds.add(t.id)
    }
  }

  if (filterLab) {
    labNames.clear()
    labNames.add(filterLab)
    for (const t of teachers) {
      if (t.lab_list.includes(filterLab)) teacherIds.add(t.id)
    }
    for (const c of courses) {
      if (c.lab_name === filterLab) matchedCourseIds.add(c.id)
    }
  }

  return {
    jobs: jobList.length,
    labs: labNames.size,
    courses: matchedCourseIds.size,
    teachers: teacherIds.size,
  }
}

function buildUnifiedGraph(
  jobs: JobProfile[],
  labCourseRows: LabJobCourseRow[],
  courses: Course[],
  labs: Lab[],
  teachers: FacultyTeacher[],
  filters: GraphFilters,
  maxTeachers: number,
  compCert: CompCertData | null,
) {
  const list = filterJobList(jobs, labCourseRows, filters)
  const includeLab = (labName: string) => !filters.filterLab || labName === filters.filterLab

  const nodes: GraphNode[] = []

  const links: { source: string; target: string }[] = []

  const linkSet = new Set<string>()

  const courseSet = new Set<string>()

  const labSet = new Set<string>()

  const teacherSet = new Set<number>()

  const compSources = new Map<string, Set<string>>()

  const certSources = new Map<string, Set<string>>()

  const noteComp = (name: string, sourceId: string) => {
    if (!name.trim()) return
    if (!compSources.has(name)) compSources.set(name, new Set())
    compSources.get(name)!.add(sourceId)
  }

  const noteCert = (name: string, sourceId: string) => {
    if (!name.trim()) return
    if (!certSources.has(name)) certSources.set(name, new Set())
    certSources.get(name)!.add(sourceId)
  }



  const categories = CATEGORY_META.map((c) => ({

    name: c.name,

    itemStyle: { color: c.color },

  }))



  const addLink = (source: string, target: string) => {

    const key = `${source}|${target}`

    if (linkSet.has(key)) return

    linkSet.add(key)

    links.push({ source, target })

  }



  const baseLabel = (fontSize: number, show = true) => ({

    show,

    position: 'right' as const,

    fontSize,

    color: WARM_CHART.text,

    backgroundColor: 'rgba(255, 253, 249, 0.95)',

    borderColor: '#e8dcc8',

    borderWidth: 1,

    borderRadius: 4,

    padding: [2, 5] as [number, number],

  })



  for (const job of list) {

    const jobId = `j:${job.name}`

    const accent = JOB_CATEGORY_COLORS[job.category] ?? WARM_CHART.nodeJob

    const jobFaculty = facultyForJob(job, teachers, labs)



    nodes.push({

      id: jobId,

      name: job.name.length > 9 ? `${job.name.slice(0, 9)}…` : job.name,

      symbolSize: Math.min(30 + job.labLinks.length * 2, 50),

      category: 0,

      itemStyle: {

        color: accent,

        borderColor: '#fffdf9',

        borderWidth: 2,

        shadowBlur: 6,

        shadowColor: 'rgba(196, 92, 38, 0.3)',

      },

      label: baseLabel(10),

      _fullName: job.name,

      _category: job.category,

      _entity: 'job',

    })



    for (const { lab } of job.labLinks) {
      if (!includeLab(lab)) continue
      labSet.add(lab)
      addLink(jobId, `l:${lab}`)
    }

    for (const row of labCourseRows) {
      if (row.job !== job.name) continue
      if (!includeLab(row.lab)) continue
      labSet.add(row.lab)

      addLink(jobId, `l:${row.lab}`)

      for (const cName of row.courses) {

        if (!cName.trim()) continue

        courseSet.add(cName.trim())

        addLink(`l:${row.lab}`, `c:${cName.trim()}`)

        addLink(jobId, `c:${cName.trim()}`)

      }

    }



    for (const skill of job.skills) {

      for (const cName of skill.courses) {

        if (!cName.trim()) continue

        courseSet.add(cName.trim())

        addLink(jobId, `c:${cName.trim()}`)

      }

      for (const lab of skill.labs) {
        if (!includeLab(lab)) continue
        labSet.add(lab)

        addLink(jobId, `l:${lab}`)

        for (const cName of skill.courses) {

          if (!cName.trim()) continue

          addLink(`l:${lab}`, `c:${cName.trim()}`)

        }

      }

    }



    for (const t of jobFaculty.slice(0, 8)) {

      teacherSet.add(t.id)

      addLink(jobId, `t:${t.id}`)

    }

    if (compCert) {
      for (const comp of detailedCompetitionsForJob(job.name, compCert, jobs).slice(0, 8)) {
        noteComp(comp.name, jobId)
      }
      for (const { lab } of job.labLinks) {
        if (!includeLab(lab)) continue
        for (const cert of detailedCertificatesForLab(lab, compCert, labs).slice(0, 5)) {
          const certName = cert.shortName || cert.fullName
          noteCert(certName, jobId)
        }
      }
    }

  }



  labSet.forEach((lab) => {
    if (filters.filterLab && lab !== filters.filterLab) return

    const labObj = labs.find((l) => l.name === lab)

    const short = shortLab(lab)

    nodes.push({

      id: `l:${lab}`,

      name: short.length > 7 ? `${short.slice(0, 7)}…` : short,

      symbolSize: 20,

      category: 1,

      itemStyle: {

        color: WARM_CHART.nodeLab,

        borderColor: '#fffdf9',

        borderWidth: 2,

      },

      label: baseLabel(9),

      _fullName: lab,

      _labId: labObj?.id,

      _entity: 'lab',

    })



    for (const t of teachers) {

      if (!t.lab_list.includes(lab)) continue

      if (teacherSet.size >= maxTeachers && !teacherSet.has(t.id)) continue

      teacherSet.add(t.id)

      addLink(`t:${t.id}`, `l:${lab}`)

    }

    if (compCert) {
      for (const comp of detailedCompetitionsForLab(lab, compCert, labs).slice(0, 6)) {
        noteComp(comp.name, `l:${lab}`)
      }
      for (const cert of detailedCertificatesForLab(lab, compCert, labs).slice(0, 6)) {
        noteCert(cert.shortName || cert.fullName, `l:${lab}`)
      }
    }

  })



  const courseLimit = filters.filterJob || filters.filterLab ? 80 : 40
  const courseList = [...courseSet].slice(0, courseLimit)

  courseList.forEach((cName) => {

    const matched = resolveCourse(cName, courses)

    nodes.push({

      id: `c:${cName}`,

      name: cName.length > 10 ? `${cName.slice(0, 10)}…` : cName,

      symbolSize: matched?.is_vendor ? 14 : 12,

      category: 2,

      itemStyle: { color: WARM_CHART.nodeCourse, borderColor: '#fffdf9', borderWidth: 1 },

      label: baseLabel(8, false),

      _fullName: cName,

      _courseId: matched?.id,

      _entity: 'course',

    })

  })



  const teacherCap = filters.filterJob || filters.filterLab ? 999 : maxTeachers
  const teacherList = teachers
    .filter((t) => teacherSet.has(t.id))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .slice(0, teacherCap)



  for (const t of teacherList) {

    nodes.push({

      id: `t:${t.id}`,

      name: t.name,

      symbolSize: 14,

      category: 3,

      itemStyle: { color: '#5b7fa5', borderColor: '#fffdf9', borderWidth: 1 },

      label: baseLabel(9),

      _fullName: t.name,

      _teacherId: t.id,

      _entity: 'teacher',

    })

  }



  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const scoped = Boolean(filters.filterJob || filters.filterLab || filters.jobCategory)
  const compLimit = scoped ? 45 : 30
  const certLimit = scoped ? 40 : 25

  const pickTopLinked = (m: Map<string, Set<string>>, limit: number) =>
    [...m.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'zh-CN'))
      .slice(0, limit)

  for (const [compName, sources] of pickTopLinked(compSources, compLimit)) {
    const id = `cmp:${compName}`
    nodes.push({
      id,
      name: compName.length > 9 ? `${compName.slice(0, 9)}…` : compName,
      symbolSize: scoped ? 20 : 18,
      category: 4,
      itemStyle: { color: '#e65100', borderColor: '#fffdf9', borderWidth: 2 },
      label: baseLabel(8, scoped || sources.size >= 2),
      _fullName: compName,
      _entity: 'competition',
    })
    nodeIdSet.add(id)
    for (const src of sources) {
      if (nodeIdSet.has(src)) addLink(src, id)
    }
  }

  for (const [certName, sources] of pickTopLinked(certSources, certLimit)) {
    const id = `cert:${certName}`
    nodes.push({
      id,
      name: certName.length > 9 ? `${certName.slice(0, 9)}…` : certName,
      symbolSize: scoped ? 18 : 16,
      category: 5,
      itemStyle: { color: '#00897b', borderColor: '#fffdf9', borderWidth: 2 },
      label: baseLabel(8, scoped || sources.size >= 2),
      _fullName: certName,
      _entity: 'certificate',
    })
    nodeIdSet.add(id)
    for (const src of sources) {
      if (nodeIdSet.has(src)) addLink(src, id)
    }
  }

  return {
    nodes,
    links,
    categories,
  }
}

function sankeyNodeLabel(prefix: string, text: string, max = 14) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const short = trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
  return `${prefix}·${short}`
}

function sankeyNodeColor(name: string) {
  if (name.startsWith('岗位·')) return WARM_CHART.nodeJob
  if (name.startsWith('实训室·')) return WARM_CHART.nodeLab
  if (name.startsWith('课程·')) return WARM_CHART.nodeCourse
  if (name.startsWith('竞赛·')) return '#e65100'
  if (name.startsWith('证书·')) return '#00897b'
  return WARM_CHART.muted
}

function buildSankeyData(
  jobs: JobProfile[],
  labCourseRows: LabJobCourseRow[],
  filters: GraphFilters,
  compCert: CompCertData | null,
  labs: Lab[],
) {
  const list = filterJobList(jobs, labCourseRows, filters)
  const includeLab = (labName: string) => !filters.filterLab || labName === filters.filterLab

  const links: { source: string; target: string; value: number }[] = []
  const linkMap = new Map<string, number>()
  const nodeSet = new Set<string>()

  const bump = (source: string, target: string, value = 1) => {
    if (!source || !target) return
    nodeSet.add(source)
    nodeSet.add(target)
    const key = `${source}\0${target}`
    linkMap.set(key, (linkMap.get(key) ?? 0) + value)
  }

  for (const job of list) {
    const jobNode = `岗位·${job.name}`
    const jobLabs = new Set(job.labLinks.map((l) => l.lab))

    for (const row of labCourseRows) {
      if (row.job !== job.name) continue
      if (!includeLab(row.lab)) continue
      jobLabs.add(row.lab)
      const labNode = `实训室·${shortLab(row.lab)}`
      bump(jobNode, labNode)
      for (const c of row.courses) {
        if (!c.trim()) continue
        bump(labNode, sankeyNodeLabel('课程', c))
      }
    }

    for (const skill of job.skills) {
      for (const lab of skill.labs) {
        if (!includeLab(lab)) continue
        jobLabs.add(lab)
        const labNode = `实训室·${shortLab(lab)}`
        bump(jobNode, labNode)
        for (const c of skill.courses) {
          if (!c.trim()) continue
          bump(labNode, sankeyNodeLabel('课程', c))
        }
      }
    }

    if (jobLabs.size && !labCourseRows.some((r) => r.job === job.name) && !job.skills.some((s) => s.labs.length)) {
      for (const lab of jobLabs) {
        if (!includeLab(lab)) continue
        bump(jobNode, `实训室·${shortLab(lab)}`)
      }
    }

    if (compCert) {
      for (const comp of detailedCompetitionsForJob(job.name, compCert, jobs).slice(0, 6)) {
        bump(jobNode, sankeyNodeLabel('竞赛', comp.name))
      }
      const certSeen = new Set<number>()
      for (const { lab } of job.labLinks) {
        if (!includeLab(lab)) continue
        const labNode = `实训室·${shortLab(lab)}`
        for (const comp of detailedCompetitionsForLab(lab, compCert, labs).slice(0, 4)) {
          bump(labNode, sankeyNodeLabel('竞赛', comp.name))
        }
        for (const cert of detailedCertificatesForLab(lab, compCert, labs).slice(0, 4)) {
          if (certSeen.has(cert.id)) continue
          certSeen.add(cert.id)
          bump(labNode, sankeyNodeLabel('证书', cert.shortName || cert.fullName))
          bump(jobNode, sankeyNodeLabel('证书', cert.shortName || cert.fullName))
        }
      }
    }
  }

  for (const [key, value] of linkMap) {
    const [source, target] = key.split('\0')
    links.push({ source, target, value })
  }

  return {
    nodes: [...nodeSet].map((name) => ({ name, itemStyle: { color: sankeyNodeColor(name) } })),
    links,
  }
}



export default function ShareNetwork() {

  const { data } = useData()

  const { data: jobMapData, loading: jobLoading } = useJobMap()

  const { data: facultyData } = useFaculty()

  const { data: compCertData } = useCompCert()

  const { params, setParams } = useCrossNavState()
  const { setFocus } = useEcosystem()

  const [jobCategory, setJobCategory] = useState('')
  const [filterLab, setFilterLab] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force')
  const [maxJobs, setMaxJobs] = useState(0)

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  useEffect(() => {
    if (params.lab) setFilterLab(params.lab)
    if (params.job) setFilterJob(params.job)
  }, [])

  useEffect(() => {
    if (filterLab !== params.lab || filterJob !== params.job) {
      setParams({ lab: filterLab || undefined, job: filterJob || undefined }, true)
    }
  }, [filterLab, filterJob])

  const certScope = useMemo(() => {
    if (!compCertData || !data) return { competitions: 0, certificates: 0 }
    if (filterLab) {
      const s = certForLab(filterLab, compCertData, data.labs)
      return { competitions: s.competitionCount, certificates: s.certificateCount }
    }
    if (filterJob && jobMapData) {
      const s = certForJob(filterJob, compCertData, jobMapData.jobs)
      const certNames = new Set<string>()
      const job = jobMapData.jobs.find((j) => j.name === filterJob)
      if (job && data) {
        for (const { lab } of job.labLinks) {
          for (const c of detailedCertificatesForLab(lab, compCertData, data.labs)) {
            certNames.add(c.shortName || c.fullName)
          }
        }
      }
      return { competitions: s.competitionCount, certificates: certNames.size }
    }
    return {
      competitions: compCertData.meta.total_competitions,
      certificates: compCertData.meta.total_certificates,
    }
  }, [compCertData, data, filterLab, filterJob, jobMapData])



  const jobCategories = useMemo(() => {

    if (!jobMapData) return []

    return [...new Set(jobMapData.jobs.map((j) => j.category).filter(Boolean))]

  }, [jobMapData])



  const graphFilters = useMemo(
    (): GraphFilters => ({ jobCategory, filterLab, filterJob, maxJobs }),
    [jobCategory, filterLab, filterJob, maxJobs],
  )

  const selectableJobs = useMemo(() => {
    if (!jobMapData) return []
    return filterJobList(jobMapData.jobs, jobMapData.labCourseRows, {
      ...graphFilters,
      filterJob: '',
      maxJobs: 0,
    })
  }, [jobMapData, graphFilters])

  const scopeStats = useMemo(() => {
    if (!jobMapData || !data) return null
    const jobList = filterJobList(jobMapData.jobs, jobMapData.labCourseRows, graphFilters)
    return computeScopeStats(
      jobList,
      jobMapData.labCourseRows,
      data.courses,
      data.labs,
      facultyData?.teachers ?? [],
      filterLab,
    )
  }, [jobMapData, data, facultyData, graphFilters, filterLab])

  const unifiedGraph = useMemo(() => {
    if (!jobMapData || !data) return null
    return buildUnifiedGraph(
      jobMapData.jobs,
      jobMapData.labCourseRows,
      data.courses,
      data.labs,
      facultyData?.teachers ?? [],
      graphFilters,
      48,
      compCertData,
    )
  }, [jobMapData, data, facultyData, graphFilters, compCertData])

  const graphEntityCounts = useMemo(() => {
    if (!unifiedGraph) return null
    const counts = { competition: 0, certificate: 0 }
    for (const n of unifiedGraph.nodes) {
      if (n._entity === 'competition') counts.competition += 1
      if (n._entity === 'certificate') counts.certificate += 1
    }
    return counts
  }, [unifiedGraph])

  const sankeyData = useMemo(() => {
    if (!jobMapData || !data) return null
    return buildSankeyData(
      jobMapData.jobs,
      jobMapData.labCourseRows,
      graphFilters,
      compCertData,
      data.labs,
    )
  }, [jobMapData, data, graphFilters, compCertData])



  const ecosystemStats = useMemo(() => {
    if (!data || !jobMapData) return null
    return computeEcosystemStats(
      data.courses,
      data.labs,
      facultyData?.teachers ?? [],
      jobMapData.jobs,
      jobMapData.labCourseRows,
    )
  }, [data, jobMapData, facultyData])

  const graphOption = useMemo(() => {

    if (!unifiedGraph || unifiedGraph.nodes.length === 0) return {}

    const { nodes, links, categories } = unifiedGraph

    const isCircular = layoutMode === 'circular'



    return {

      ...warmChartBase(),

      tooltip: {

        trigger: 'item',

        backgroundColor: 'rgba(255, 253, 249, 0.98)',

        borderColor: '#e8dcc8',

        textStyle: { color: WARM_CHART.text, fontSize: 12 },

        formatter: (params: { dataType?: string; data?: GraphNode }) => {

          if (params.dataType === 'edge') return ''

          const d = params.data

          if (!d) return ''

          if (d._entity === 'job') {

            return [`岗位：${d._fullName}`, d._category ? `大类：${d._category}` : ''].filter(Boolean).join('<br/>')

          }

          if (d._entity === 'lab') return `实训室：${d._fullName ?? d.name}`

          if (d._entity === 'course') return `课程：${d._fullName ?? d.name}`

          if (d._entity === 'teacher') return `师资：${d._fullName ?? d.name}`

          if (d._entity === 'competition') return `竞赛：${d._fullName ?? d.name}`

          if (d._entity === 'certificate') return `证书：${d._fullName ?? d.name}`

          return d.name

        },

      },

      legend: {

        data: categories.map((c) => c.name),

        bottom: 0,

        textStyle: { color: WARM_CHART.muted, fontSize: 11 },

      },

      series: [

        {

          type: 'graph',

          layout: isCircular ? 'circular' : 'force',

          circular: isCircular ? { rotateLabel: true } : undefined,

          roam: true,

          draggable: true,

          categories,

          data: nodes,

          links,

          labelLayout: { hideOverlap: true },

          force: isCircular

            ? undefined

            : { repulsion: 360, edgeLength: [90, 180], gravity: 0.08, friction: 0.6 },

          lineStyle: { color: 'rgba(196, 92, 38, 0.28)', width: 1.2, curveness: 0.1 },

          emphasis: {

            focus: 'adjacency',

            lineStyle: { width: 2.5, color: WARM_CHART.primary },

          },

        },

      ],

    }

  }, [unifiedGraph, layoutMode])



  const sankeyOption = useMemo(() => {

    if (!sankeyData || sankeyData.links.length === 0) return {}

    return {

      ...warmChartBase(),

      tooltip: { trigger: 'item', triggerOn: 'mousemove' },

      series: [

        {

          type: 'sankey',

          layout: 'none',

          emphasis: { focus: 'adjacency' },

          nodeAlign: 'justify',

          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },

          label: { color: WARM_CHART.text, fontSize: 10 },

          data: sankeyData.nodes,

          links: sankeyData.links,

          left: '2%',

          right: '14%',

          top: '4%',

          bottom: '4%',

        },

      ],

    }

  }, [sankeyData])



  const handleGraphClick = useCallback((params: unknown) => {
    const p = params as { dataType?: string; data?: GraphNode & { id?: string } }
    if (p.dataType === 'edge' || !p.data?._entity) return
    const node = p.data as GraphNode
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    const entity = node._entity
    if (entity === 'job' && node._fullName) {
      setFocus({ kind: 'job', id: node._fullName, label: node._fullName })
    } else if (entity === 'lab' && node._fullName) {
      setFocus({ kind: 'lab', id: node._fullName, label: node._fullName })
    } else if (entity === 'course' && node._courseId) {
      setFocus({ kind: 'course', id: String(node._courseId), label: node._fullName ?? node.name })
    } else if (entity === 'teacher' && node._teacherId) {
      setFocus({ kind: 'faculty', id: String(node._teacherId), label: node._fullName ?? node.name })
    } else if (entity === 'competition' && node._fullName) {
      setFocus({ kind: 'competition', id: node._fullName, label: node._fullName })
    } else if (entity === 'certificate' && node._fullName) {
      setFocus({ kind: 'certificate', id: node._fullName, label: node._fullName })
    }
  }, [setFocus])



  const selectedJob = useMemo(() => {

    if (!selectedNode || selectedNode._entity !== 'job' || !jobMapData) return null

    return jobMapData.jobs.find((j) => j.name === selectedNode._fullName) ?? null

  }, [selectedNode, jobMapData])



  const selectedTeacher = useMemo(() => {

    if (!selectedNode || selectedNode._entity !== 'teacher' || !facultyData) return null

    return facultyData.teachers.find((t) => t.id === selectedNode._teacherId) ?? null

  }, [selectedNode, facultyData])



  const selectedJobDetail = useMemo(() => {
    if (!selectedJob || !data || !jobMapData) return null

    const competitions = compCertData
      ? detailedCompetitionsForJob(selectedJob.name, compCertData, jobMapData.jobs)
      : []

    const certificates: { cert: import('../types/compCert').CertificateItem; lab: string }[] = []
    if (compCertData) {
      const seen = new Set<number>()
      for (const { lab } of selectedJob.labLinks) {
        const canonical = resolveLab(lab, data.labs)?.name ?? lab
        for (const cert of detailedCertificatesForLab(canonical, compCertData, data.labs)) {
          if (seen.has(cert.id)) continue
          seen.add(cert.id)
          certificates.push({ cert, lab: canonical })
        }
      }
    }

    return {
      courses: matchJobCourses(selectedJob, jobMapData.labCourseRows, data.courses),
      labs: resolveJobLabs(selectedJob, data.labs),
      faculty: facultyForJob(selectedJob, facultyData?.teachers ?? [], data.labs),
      competitions,
      certificates,
    }
  }, [selectedJob, data, jobMapData, facultyData, compCertData])

  const selectedLabDetail = useMemo(() => {
    if (!selectedNode || selectedNode._entity !== 'lab' || !data || !compCertData) return null
    const labName = selectedNode._fullName ?? ''
    return {
      competitions: detailedCompetitionsForLab(labName, compCertData, data.labs),
      certificates: detailedCertificatesForLab(labName, compCertData, data.labs),
    }
  }, [selectedNode, data, compCertData])



  if (!data) return null

  const graphViewStats = scopeStats
  const hasGraphFilter = Boolean(jobCategory || filterLab || filterJob || maxJobs > 0)

  return (

    <div className="space-y-6">

      <header className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-gradient">课程图谱</h1>

          <p className="text-warm-600 mt-1">
            六元培养关系网络 · 岗位 · 实训室 · 课程 · 师资 · 竞赛 · 证书
            {ecosystemStats && (
              <span className="text-warm-400">
                {' '}
                · 已匹配 {ecosystemStats.matchedCourses} 门课程 / {ecosystemStats.jobLinkedLabs} 个实训室
                {compCertData ? ` / ${certScope.competitions} 项竞赛` : ''}
              </span>
            )}
          </p>

        </div>

        <Link

          to={buildCrossNavUrl('/jobs', { job: filterJob || undefined, lab: filterLab || undefined })}

          className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20"

        >

          岗位技能分层详情 <ExternalLink size={12} />

        </Link>

      </header>

      {ecosystemStats && (
        <EcosystemBadges
          variant="compact"
          labs={ecosystemStats.labs}
          courses={ecosystemStats.courses}
          faculty={facultyData ? ecosystemStats.teachers : undefined}
          jobs={ecosystemStats.jobs}
          competitions={compCertData ? certScope.competitions : undefined}
          certificates={compCertData ? certScope.certificates : undefined}
          facultyLoaded={!!facultyData}
          jobsLoaded={!!jobMapData}
          certsLoaded={!!compCertData}
        />
      )}

      <div className="glass rounded-2xl p-4">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

          <div>

            <h3 className="text-sm font-medium text-warm-800">培养要素关系网络</h3>

            <p className="text-[11px] text-warm-500 mt-0.5">
              支持力导向、环形、桑基图 · 拖拽节点 · 点击查看详情
              {graphViewStats && (
                <span className={hasGraphFilter ? 'text-accent-primary' : 'text-warm-400'}>
                  {' '}
                  · 当前筛选 {graphViewStats.jobs} 岗位 / {graphViewStats.labs} 实训室 / {graphViewStats.courses} 课程 / {graphViewStats.teachers} 师资
                  {compCertData && graphEntityCounts && (
                    <>
                      {' '}/ {graphEntityCounts.competition} 竞赛节点 / {graphEntityCounts.certificate} 证书节点
                    </>
                  )}
                  {!compCertData && (
                    <span className="text-accent-orange"> · 未加载竞赛·证书表，赛/证节点不可用</span>
                  )}
                  {hasGraphFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobCategory('')
                        setFilterLab('')
                        setFilterJob('')
                        setMaxJobs(0)
                      }}
                      className="ml-2 text-accent-primary hover:underline"
                    >
                      重置筛选
                    </button>
                  )}
                </span>
              )}
            </p>

          </div>

          <div className="flex flex-wrap gap-2 items-center">

            {jobMapData && (

              <select

                value={jobCategory}

                onChange={(e) => setJobCategory(e.target.value)}

                className={`${selectClass} text-xs py-1.5`}

              >

                <option value="">全部岗位大类</option>

                {jobCategories.map((c) => (

                  <option key={c} value={c}>

                    {c}

                  </option>

                ))}

              </select>

            )}

            {data && (
              <select
                value={filterLab}
                onChange={(e) => {
                  setFilterLab(e.target.value)
                  setFilterJob('')
                }}
                className={`${selectClass} text-xs py-1.5 max-w-[140px]`}
              >
                <option value="">全部实训室</option>
                {data.labs.map((l) => (
                  <option key={l.id} value={l.name}>
                    {shortLab(l.name)}
                  </option>
                ))}
              </select>
            )}

            {selectableJobs.length > 0 && (
              <select
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className={`${selectClass} text-xs py-1.5 max-w-[160px]`}
              >
                <option value="">全部岗位</option>
                {selectableJobs.map((j) => (
                  <option key={j.id} value={j.name}>
                    {j.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={maxJobs}
              onChange={(e) => setMaxJobs(Number(e.target.value))}
              className={`${selectClass} text-xs py-1.5`}
            >
              <option value={0}>展示全部岗位</option>
              <option value={8}>最多 8 个岗位</option>
              <option value={12}>最多 12 个岗位</option>
              <option value={18}>最多 18 个岗位</option>
              <option value={26}>最多 26 个岗位</option>
            </select>

            <div className="flex rounded-lg border border-warm-300 overflow-hidden">

              {[

                { id: 'force' as const, label: '力导向', icon: Network },

                { id: 'circular' as const, label: '环形', icon: Circle },

                { id: 'sankey' as const, label: '桑基图', icon: GitBranch },

              ].map(({ id, label, icon: Icon }) => (

                <button

                  key={id}

                  type="button"

                  onClick={() => setLayoutMode(id)}

                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs transition ${

                    layoutMode === id

                      ? 'bg-accent-primary/15 text-accent-primary'

                      : 'bg-warm-50 text-warm-600 hover:bg-warm-100'

                  }`}

                >

                  <Icon size={12} />

                  {label}

                </button>

              ))}

            </div>

          </div>

        </div>



        {jobLoading && (

          <div className="flex items-center justify-center h-[520px] text-warm-500 text-sm">加载关系数据中...</div>

        )}



        {!jobLoading && !jobMapData?.jobs.length && (

          <div className="text-center py-16 text-warm-600">

            <Briefcase className="mx-auto text-warm-400 mb-3" size={40} />

            <p>暂无岗位映射数据，无法构建能力关系网络</p>

            <Link to="/data" className="text-sm text-accent-primary hover:underline mt-2 inline-block">

              前往数据管理上传岗位映射 Excel

            </Link>

          </div>

        )}



        {!jobLoading && jobMapData && layoutMode === 'sankey' && (

          <>

            {sankeyData && sankeyData.links.length > 0 ? (

              <Chart option={sankeyOption} height={560} />

            ) : (

              <div className="h-[520px] flex items-center justify-center text-sm text-warm-500">

                当前筛选下暂无岗位→实训室→课程流向数据

              </div>

            )}

            <p className="text-[11px] text-warm-400 mt-2">
              桑基图展示岗位经实训室到课程、竞赛、证书的培养路径；师资关联请切换至力导向或环形视图。
              {!compCertData && (
                <span className="text-accent-orange"> 未加载竞赛·证书表时，赛/证分支不可用。</span>
              )}
            </p>

          </>

        )}



        {!jobLoading && jobMapData && layoutMode !== 'sankey' && unifiedGraph && unifiedGraph.nodes.length > 0 && (

          <>

            <div className="flex flex-wrap gap-3 mb-3 text-xs text-warm-600">

              {CATEGORY_META.map(({ name, color }) => (

                <span key={name} className="inline-flex items-center gap-1">

                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />

                  {name}

                </span>

              ))}

            </div>

            <Chart option={graphOption} height={560} onEvents={{ click: handleGraphClick }} />

            <p className="text-[11px] text-warm-400 mt-2">
              岗位 · 实训室 · 课程 · 师资 · 竞赛 · 证书 六类节点；橙=岗位、棕=实训室、金=课程、蓝=师资、深橙=竞赛、青绿=证书。点击节点查看详情。
            </p>

          </>

        )}

      </div>

      {selectedNode && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedNode(null)}>
          <div className="absolute inset-0 bg-warm-900/15 backdrop-blur-[1px]" />
          <div
            className="relative w-full max-w-md h-full glass border-l border-warm-300 overflow-y-auto p-5 animate-fade-in-up scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-warm-400">节点详情</span>
                <p className="text-[11px] text-warm-500 mt-0.5">来自关系图谱点击，与上方筛选独立</p>
                <span className="inline-block text-xs text-warm-500 mt-2 px-2 py-0.5 rounded-full bg-warm-100">
                  {CATEGORY_META[selectedNode.category]?.name ?? '节点'}
                </span>
                <h3 className="text-lg font-bold mt-1 pr-2">{selectedNode._fullName ?? selectedNode.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-xs px-2.5 py-1 rounded-lg bg-warm-200 text-warm-700 hover:bg-warm-300 shrink-0"
              >
                关闭
              </button>
            </div>



          {selectedNode._entity === 'lab' && selectedNode._labId != null && (
            <Link
              to={`/labs/${selectedNode._labId}`}
              className="text-sm text-accent-primary hover:underline inline-flex items-center gap-1"
            >
              查看实训室详情 <ExternalLink size={12} />
            </Link>
          )}

          {selectedLabDetail && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <MiniStat label="关联竞赛" value={selectedLabDetail.competitions.length} />
                <MiniStat label="关联证书" value={selectedLabDetail.certificates.length} />
              </div>
              {selectedLabDetail.competitions.length > 0 && (
                <div>
                  <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <Trophy size={12} className="text-[#e65100]" />
                    关联竞赛（前 6 项）
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabDetail.competitions.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={buildCrossNavUrl('/labs/compcerts', { lab: selectedNode._fullName || undefined })}
                        className="px-2.5 py-1 rounded-lg bg-[#e65100]/10 text-xs text-[#bf360c] hover:bg-[#e65100]/20"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {selectedLabDetail.certificates.length > 0 && (
                <div>
                  <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <Award size={12} className="text-[#00897b]" />
                    关联证书（前 6 项）
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabDetail.certificates.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={buildCrossNavUrl('/labs/compcerts', { lab: selectedNode._fullName || undefined })}
                        className="px-2.5 py-1 rounded-lg bg-[#00897b]/10 text-xs text-[#00695c] hover:bg-[#00897b]/20"
                      >
                        {c.shortName || c.fullName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNode._entity === 'lab' && compCertData && selectedLabDetail
            && selectedLabDetail.competitions.length === 0
            && selectedLabDetail.certificates.length === 0 && (
            <p className="mt-3 text-xs text-warm-500">该实训室暂无关联竞赛或证书记录。</p>
          )}



          {selectedNode._entity === 'course' && (

            <button

              type="button"

              onClick={() => {

                const c = resolveCourse(selectedNode._fullName ?? '', data.courses)

                if (c) setSelectedCourse(c)

              }}

              className="text-sm text-accent-primary hover:underline"

            >

              查看课程详情

            </button>

          )}



          {(selectedNode._entity === 'competition' || selectedNode._entity === 'certificate') && (
            <Link
              to={buildCrossNavUrl('/labs/compcerts', {
                job: filterJob || undefined,
                lab: filterLab || undefined,
              })}
              className="text-sm text-accent-primary hover:underline inline-flex items-center gap-1 mt-2"
            >
              竞赛证书中心 <ExternalLink size={12} />
            </Link>
          )}



          {selectedJob && selectedJobDetail && (

            <div className="mt-4 space-y-4">

              <p className="text-sm text-warm-600">

                {selectedJob.category} · {selectedJob.heat}

                {selectedJob.keywords && ` · ${selectedJob.keywords}`}

              </p>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                <MiniStat label="关联实训室" value={selectedJobDetail.labs.length} />
                <MiniStat label="推荐课程" value={selectedJobDetail.courses.length} />
                <MiniStat label="匹配师资" value={selectedJobDetail.faculty.length} />
                {compCertData && (
                  <>
                    <MiniStat label="关联竞赛" value={selectedJobDetail.competitions.length} />
                    <MiniStat label="关联证书" value={selectedJobDetail.certificates.length} />
                  </>
                )}
              </div>

              {selectedJobDetail.labs.length > 0 && (

                <div>

                  <h4 className="text-xs text-warm-500 mb-2">实训室</h4>

                  <div className="flex flex-wrap gap-2">

                    {selectedJobDetail.labs.map((l) => (

                      <Link

                        key={l.id}

                        to={`/labs/${l.id}`}

                        className="px-2.5 py-1 rounded-lg bg-warm-100 text-xs text-warm-700 hover:bg-accent-primary/10 hover:text-accent-primary"

                      >

                        {shortLab(l.name)}

                      </Link>

                    ))}

                  </div>

                </div>

              )}

              {selectedJobDetail.courses.length > 0 && (

                <div>

                  <h4 className="text-xs text-warm-500 mb-2">推荐课程（前 8 门）</h4>

                  <div className="flex flex-wrap gap-2">

                    {selectedJobDetail.courses.slice(0, 8).map((c) => (

                      <button

                        key={c.id}

                        type="button"

                        onClick={() => setSelectedCourse(c)}

                        className="px-2.5 py-1 rounded-lg bg-accent-gold/10 text-xs text-warm-800 hover:bg-accent-gold/20"

                      >

                        {c.name}

                      </button>

                    ))}

                  </div>

                </div>

              )}

              {selectedJobDetail.faculty.length > 0 && (

                <div>

                  <h4 className="text-xs text-warm-500 mb-2">
                    匹配师资（{selectedJobDetail.faculty.length} 人，展示前 6）
                  </h4>

                  <div className="flex flex-wrap gap-2">

                    {selectedJobDetail.faculty.slice(0, 6).map((t) => (

                      <span

                        key={t.id}

                        className="px-2.5 py-1 rounded-lg bg-[#5b7fa5]/10 text-xs text-[#3d5a73]"

                      >

                        {t.name} · {t.title_dim || t.level}

                      </span>

                    ))}

                  </div>

                </div>

              )}

              {compCertData && selectedJobDetail.competitions.length > 0 && (
                <div>
                  <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <Trophy size={12} className="text-[#e65100]" />
                    关联竞赛（前 6 项）
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobDetail.competitions.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={buildCrossNavUrl('/labs/compcerts', { job: selectedJob.name })}
                        className="px-2.5 py-1 rounded-lg bg-[#e65100]/10 text-xs text-[#bf360c] hover:bg-[#e65100]/20"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {compCertData && selectedJobDetail.certificates.length > 0 && (
                <div>
                  <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <Award size={12} className="text-[#00897b]" />
                    关联证书（前 6 项）
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobDetail.certificates.slice(0, 6).map(({ cert, lab }) => (
                      <Link
                        key={cert.id}
                        to={buildCrossNavUrl('/labs/compcerts', { job: selectedJob.name, lab })}
                        className="px-2.5 py-1 rounded-lg bg-[#00897b]/10 text-xs text-[#00695c] hover:bg-[#00897b]/20"
                        title={lab}
                      >
                        {cert.shortName || cert.fullName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>

          )}



          {selectedTeacher && (

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

              <p><span className="text-warm-500">职称：</span>{selectedTeacher.title_dim || '—'}</p>

              <p><span className="text-warm-500">来源：</span>{selectedTeacher.source || '—'}</p>

              <p><span className="text-warm-500">专业领域：</span>{selectedTeacher.field || '—'}</p>

              <p><span className="text-warm-500">匹配实训室：</span>{selectedTeacher.matched_lab_count} 个</p>

              {selectedTeacher.keywords && (

                <p className="col-span-2"><span className="text-warm-500">关键词：</span>{selectedTeacher.keywords}</p>

              )}

            </div>
          )}

          </div>
        </div>
      )}

      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} />

    </div>

  )

}



function MiniStat({ label, value }: { label: string; value: number }) {

  return (

    <div className="p-3 rounded-xl bg-warm-100">

      <div className="text-xl font-bold text-accent-primary">{value}</div>

      <div className="text-[10px] text-warm-500">{label}</div>

    </div>

  )

}


