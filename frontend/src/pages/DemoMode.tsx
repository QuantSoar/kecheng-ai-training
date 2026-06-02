import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  X, ChevronLeft, ChevronRight, Pause, Play, Briefcase,
  Building2, BookOpen, Users, Target, Clock,
  Trophy, Award, GraduationCap, Layers, Sparkles,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import { useCompCert } from '../context/CompCertContext'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import type { EChartsOption } from 'echarts'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import { FACULTY_CHART_COLORS } from '../types/faculty'
import { JOB_CATEGORY_COLORS } from '../types/jobMap'
import type { FacultyStatItem, FacultyTeacher } from '../types/faculty'
import type { Lab } from '../types'
import type { JobProfile } from '../types/jobMap'
import { buildLabIntegrations, MATCH_COLORS } from '../utils/integrate'
import { facultyForJob } from '../utils/jobLink'
import { detailedCompetitionsForJob, detailedCertificatesForLab } from '../utils/certLink'
import { CURRICULUM_TIERS, tierStatsForLabs } from '../types/curriculumTier'

const SLIDE_INTERVAL = 11000
const BRAND_TITLE = '人工智能实训基地'

/** 图表随 Panel 剩余高度自适应 */
function FlexChart({ option }: { option: EChartsOption | Record<string, never> }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const h = Math.floor(el.getBoundingClientRect().height)
      if (h > 0) setHeight(h)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  if (!option || Object.keys(option).length === 0) {
    return <div ref={wrapRef} className="h-full min-h-[80px] w-full" />
  }

  return (
    <div ref={wrapRef} className="h-full min-h-[80px] w-full">
      {height > 0 && <Chart option={option as EChartsOption} height={height} />}
    </div>
  )
}

type SlideKind =
  | 'overview'
  | 'jobs'
  | 'labs-overview'
  | 'curriculum'
  | 'faculty'
  | 'competitions'
  | 'certificates'

interface Slide {
  kind: SlideKind
  title: string
  chapter: number
}

/** 培养资源叙事主线 */
const DEMO_FLOW = [
  { kind: 'overview' as const, label: '总览' },
  { kind: 'jobs' as const, label: '岗位', needsJobs: true },
  { kind: 'labs-overview' as const, label: '实训室' },
  { kind: 'curriculum' as const, label: '课程体系' },
  { kind: 'faculty' as const, label: '师资', needsFaculty: true },
  { kind: 'competitions' as const, label: '竞赛', needsCompCert: true },
  { kind: 'certificates' as const, label: '证书', needsCompCert: true },
]

function buildSlides(hasJobs: boolean, hasFaculty: boolean, hasCompCert: boolean): Slide[] {
  let chapter = 0
  return DEMO_FLOW.filter((step) => {
    if (step.needsJobs && !hasJobs) return false
    if (step.needsFaculty && !hasFaculty) return false
    if (step.needsCompCert && !hasCompCert) return false
    return true
  }).map((step) => {
    chapter += 1
    const titles: Record<SlideKind, string> = {
      overview: '培养资源总览',
      jobs: '岗位能力体系',
      'labs-overview': '实训室资源全景',
      curriculum: '三层课程体系',
      faculty: '师资队伍画像',
      competitions: '竞赛资源体系',
      certificates: '证书认证体系',
    }
    return { kind: step.kind, title: titles[step.kind], chapter }
  })
}

function SlideShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {children}
    </div>
  )
}

function SlideHeader({
  chapter,
  icon: Icon,
  title,
  subtitle,
  tint = 'from-accent-primary/15 to-accent-primary/5 text-accent-primary',
}: {
  chapter: number
  icon: typeof Briefcase
  title: string
  subtitle?: string
  tint?: string
}) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-white/70 shadow-sm bg-gradient-to-br ${tint}`}>
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-warm-400">第 {chapter} 章</span>
        <h2 className="text-lg font-bold text-gradient leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-warm-600 mt-0.5 line-clamp-1">{subtitle}</p>}
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  hint,
  accent = 'text-accent-primary',
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl px-3 py-2 bg-white/90 border border-warm-200/70 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${accent}`} />
      <div className={`text-xl font-bold tabular-nums leading-none ${accent}`}>{value}</div>
      <div className="text-[11px] font-semibold text-warm-800 mt-1">{label}</div>
      {hint && <div className="text-[9px] text-warm-500 truncate">{hint}</div>}
    </div>
  )
}

function Panel({
  title,
  hint,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={`rounded-xl p-3 bg-white/88 border border-warm-200/75 shadow-sm min-h-0 flex flex-col ${className}`}>
      {title && <h3 className="text-xs font-semibold text-warm-800 shrink-0">{title}</h3>}
      {hint && <p className="text-[9px] text-warm-500 mt-0.5 mb-1.5 shrink-0 line-clamp-1">{hint}</p>}
      {title && !hint && <div className="mb-1.5 shrink-0" />}
      <div className={`min-h-0 flex-1 flex flex-col ${bodyClassName}`}>{children}</div>
    </div>
  )
}

function pickFeaturedJob(jobs: JobProfile[]): JobProfile | null {
  if (!jobs.length) return null
  return [...jobs].sort((a, b) => b.skills.length - a.skills.length || b.labLinks.length - a.labLinks.length)[0]
}

function facultyCountForLab(teachers: { lab_list: string[] }[], labName: string) {
  return teachers.filter((t) => t.lab_list.includes(labName)).length
}

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

const TREEMAP_PALETTE = ['#c45c26', '#d97706', '#5b7fa5', '#8d6e63', '#a1887f', '#bcaaa4', '#d7ccc8']

function labFacultyRecommendations(teachers: FacultyTeacher[], labName: string, limit = 6) {
  return teachers
    .filter((t) => t.lab_list.includes(labName))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0) || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit)
}

function pickJobDecomposeExample(jobs: JobProfile[]): JobProfile | null {
  if (!jobs.length) return null
  return [...jobs].sort((a, b) => b.skills.length - a.skills.length || b.labLinks.length - a.labLinks.length)[0]
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleString('zh-CN', { hour12: false })
}

export default function DemoMode() {
  const { data, loading, error } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const { data: compCertData } = useCompCert()
  const { data: designData } = useCurriculumDesign()
  const navigate = useNavigate()
  const [slideIndex, setSlideIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const clock = useClock()

  const labs = data?.labs ?? []
  const hasCompCert = !!compCertData?.competitions.length
  const slides = useMemo(
    () => buildSlides(!!jobMapData?.jobs.length, !!facultyData?.teachers.length, hasCompCert),
    [jobMapData, facultyData, hasCompCert],
  )
  const slide = slides[slideIndex]

  const next = useCallback(() => {
    setSlideIndex((i) => (i + 1) % slides.length)
  }, [slides.length])

  const prev = useCallback(() => {
    setSlideIndex((i) => (i - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (!playing || !data || slides.length === 0) return
    const timer = setInterval(next, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [playing, next, data, slides.length])

  const featuredJob = useMemo(
    () => (jobMapData ? pickFeaturedJob(jobMapData.jobs) : null),
    [jobMapData],
  )

  const integrations = useMemo(() => {
    if (!data) return []
    return buildLabIntegrations(data.labs, data.courses, facultyData?.teachers ?? [], {
      jobs: jobMapData?.jobs,
      compCert: compCertData,
    })
  }, [data, facultyData, jobMapData, compCertData])

  const topLabs = useMemo(
    () => [...labs].sort((a, b) => b.course_counts.total - a.course_counts.total).slice(0, 12),
    [labs],
  )

  const tierLayerStats = useMemo(() => {
    if (!data) return []
    return CURRICULUM_TIERS.map((tier) => {
      if (designData?.labSummaries.length) {
        const field = tier.id === 'enterprise' ? 'enterpriseCount' as const : tier.id === 'internship' ? 'internshipCount' as const : 'industryCount'
        const track = tier.id === 'academy' ? 'industry' as const : tier.id
        return {
          tier,
          labCount: designData.labSummaries.filter((s) => s[field] > 0).length,
          courseCount: designData.trackCourses.filter((c) => c.track === track).length,
          fromDesign: true,
        }
      }
      const stat = tierStatsForLabs(data.labs, data.courses).find((s) => s.tier.id === tier.id)
      return { tier, labCount: stat?.labCount ?? 0, courseCount: undefined as number | undefined, fromDesign: false }
    })
  }, [data, designData])

  const gapItems = useMemo(
    () => integrations
      .filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy' || i.strictCoveragePct < 40)
      .sort((a, b) => a.strictCoveragePct - b.strictCoveragePct)
      .slice(0, 12),
    [integrations],
  )

  const featuredJobCerts = useMemo(() => {
    if (!featuredJob || !compCertData || !data) return { comps: [], certs: [] as ReturnType<typeof detailedCertificatesForLab> }
    const comps = detailedCompetitionsForJob(featuredJob.name, compCertData, jobMapData?.jobs ?? []).slice(0, 6)
    const certSeen = new Set<number>()
    const certs: ReturnType<typeof detailedCertificatesForLab> = []
    for (const { lab } of featuredJob.labLinks) {
      for (const c of detailedCertificatesForLab(lab, compCertData, data.labs)) {
        if (certSeen.has(c.id)) continue
        certSeen.add(c.id)
        certs.push(c)
        if (certs.length >= 6) break
      }
      if (certs.length >= 6) break
    }
    return { comps, certs }
  }, [featuredJob, compCertData, data, jobMapData?.jobs])

  const sixElementCompareChart = useMemo(() => {
    const items = integrations
      .filter((i) => i.courses.length > 0)
      .sort((a, b) => b.courses.length - a.courses.length)
      .slice(0, 8)
      .reverse()
    return {
      ...warmChartBase(),
      legend: { top: 0, textStyle: { fontSize: 10, color: WARM_CHART.muted } },
      grid: { left: 110, right: 16, top: 36, bottom: 20 },
      xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category' as const,
        data: items.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 10, color: WARM_CHART.muted },
      },
      series: [
        { name: '课程', type: 'bar' as const, stack: 'total', data: items.map((i) => i.courses.length), itemStyle: { color: WARM_CHART.primary } },
        { name: '师资', type: 'bar' as const, stack: 'total', data: items.map((i) => i.faculty.length), itemStyle: { color: WARM_CHART.nodeLab } },
        { name: '岗位', type: 'bar' as const, stack: 'total', data: items.map((i) => i.jobCount), itemStyle: { color: '#8d6e63' } },
        { name: '竞赛', type: 'bar' as const, stack: 'total', data: items.map((i) => i.competitionCount), itemStyle: { color: '#e65100' } },
        { name: '证书', type: 'bar' as const, stack: 'total', data: items.map((i) => i.certificateCount), itemStyle: { color: '#00897b' } },
      ],
    }
  }, [integrations])

  const integrationSummary = useMemo(() => {
    const counts = { good: 0, gap: 0, 'course-heavy': 0, 'faculty-heavy': 0, empty: 0 }
    for (const i of integrations) counts[i.matchLevel] += 1
    const avgCoverage = integrations.length
      ? Math.round(integrations.reduce((s, i) => s + i.strictCoveragePct, 0) / integrations.length)
      : 0
    return { counts, avgCoverage }
  }, [integrations])

  const featuredJobFaculty = useMemo(() => {
    if (!featuredJob || !facultyData || !data) return 0
    return facultyForJob(featuredJob, facultyData.teachers, data.labs).length
  }, [featuredJob, facultyData, data])

  const jobCategoryChart = useMemo(() => {
    if (!jobMapData?.jobs.length) return {}
    const counter = new Map<string, number>()
    for (const j of jobMapData.jobs) {
      const cat = j.category || '其他'
      counter.set(cat, (counter.get(cat) ?? 0) + 1)
    }
    const items = [...counter.entries()].sort((a, b) => b[1] - a[1])
    return {
      ...warmChartBase(),
      grid: { left: 50, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: 'category',
        data: items.map(([k]) => k.replace('类', '')),
        axisLabel: { rotate: 20, fontSize: 10, color: WARM_CHART.muted },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [{
        type: 'bar',
        data: items.map(([k, v]) => ({
          value: v,
          itemStyle: { color: JOB_CATEGORY_COLORS[k] ?? WARM_CHART.primary, borderRadius: [4, 4, 0, 0] },
        })),
      }],
    }
  }, [jobMapData])

  const topJobs = useMemo(() => {
    if (!jobMapData) return []
    return [...jobMapData.jobs]
      .sort((a, b) => b.labLinks.length - a.labLinks.length)
      .slice(0, 10)
  }, [jobMapData])

  const typeChart = useMemo(() => {
    if (!data) return {}
    return {
      ...warmChartBase(),
      series: [{
        type: 'pie' as const,
        radius: ['45%', '72%'],
        label: { show: true, fontSize: 11, color: WARM_CHART.muted },
        data: data.stats.type_distribution.map((t) => ({
          name: t.label,
          value: t.count,
          itemStyle: { color: TYPE_COLORS[t.type] },
        })),
      }],
    }
  }, [data])

  const labTreemapChart = useMemo(() => {
    if (!data) return {}
    const items = [...labs]
      .filter((l) => l.course_counts.total > 0)
      .sort((a, b) => b.course_counts.total - a.course_counts.total)
    const avg = items.length
      ? Math.round(items.reduce((s, l) => s + l.course_counts.total, 0) / items.length)
      : 0
    return {
      chart: {
        ...warmChartBase(),
        tooltip: {
          trigger: 'item' as const,
          formatter: '{b}: {c} 门',
        },
        series: [{
          type: 'treemap' as const,
          roam: false,
          nodeClick: false as const,
          breadcrumb: { show: false },
          left: 4,
          right: 4,
          top: 4,
          bottom: 4,
          label: {
            show: true,
            fontSize: 10,
            color: '#fff',
          },
          upperLabel: { show: false },
          itemStyle: { borderColor: '#f7f2eb', borderWidth: 2, gapWidth: 2 },
          data: items.map((l, i) => ({
            name: shortLab(l.name),
            value: l.course_counts.total,
            full: l.name,
            itemStyle: { color: TREEMAP_PALETTE[i % TREEMAP_PALETTE.length], opacity: 0.92 - (i % 3) * 0.06 },
          })),
        }],
      },
      avg,
      maxLab: items[0] ?? null,
      minLab: items[items.length - 1] ?? null,
    }
  }, [data, labs])

  const vendorInsights = useMemo(() => {
    if (!data) return null
    const vendors = data.stats.vendor_distribution
    const top = vendors[0]
    const labByVendor = new Map<string, Set<string>>()
    for (const c of data.courses) {
      if (!c.is_vendor || !c.vendor) continue
      if (!labByVendor.has(c.vendor)) labByVendor.set(c.vendor, new Set())
      labByVendor.get(c.vendor)!.add(c.lab_name)
    }
    const enriched = vendors.map((v) => ({
      ...v,
      labCount: labByVendor.get(v.vendor)?.size ?? 0,
    }))
    const avgPerVendor = vendors.length
      ? Math.round(data.meta.total_vendor_courses / vendors.length)
      : 0
    return { enriched, top, avgPerVendor }
  }, [data])

  const vendorPieChart = useMemo(() => {
    if (!data) return {}
    const items = data.stats.vendor_distribution.slice(0, 6)
    const rest = data.stats.vendor_distribution.slice(6).reduce((s, v) => s + v.count, 0)
    const pieData = [
      ...items.map((v, i) => ({
        name: v.vendor,
        value: v.count,
        itemStyle: { color: FACULTY_CHART_COLORS[i % FACULTY_CHART_COLORS.length] },
      })),
      ...(rest > 0 ? [{ name: '其他', value: rest, itemStyle: { color: WARM_CHART.splitLine } }] : []),
    ]
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} 门 ({d}%)' },
      legend: { show: false },
      series: [{
        type: 'pie' as const,
        radius: ['38%', '68%'],
        center: ['50%', '52%'],
        label: { fontSize: 10, color: WARM_CHART.muted, formatter: '{b}\n{d}%' },
        data: pieData,
      }],
    }
  }, [data])

  const vendorChart = useMemo(() => {
    if (!data) return {}
    const vendors = data.stats.vendor_distribution.slice(0, 8)
    return {
      ...warmChartBase(),
      grid: { left: 50, right: 20, top: 20, bottom: 70 },
      xAxis: {
        type: 'category' as const,
        data: vendors.map((v) => v.vendor),
        axisLabel: { rotate: 25, fontSize: 10, color: WARM_CHART.muted },
      },
      yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [{
        type: 'bar' as const,
        data: vendors.map((v, i) => ({
          value: v.count,
          itemStyle: {
            color: FACULTY_CHART_COLORS[i % FACULTY_CHART_COLORS.length],
            borderRadius: [4, 4, 0, 0],
          },
        })),
      }],
    }
  }, [data])

  const jobDecomposeExample = useMemo(
    () => (jobMapData ? pickJobDecomposeExample(jobMapData.jobs) : null),
    [jobMapData],
  )

  const facultySourceChart = useMemo(() => {
    if (!facultyData) return {}
    const items = (facultyData.stats.source as FacultyStatItem[] | undefined) ?? []
    return {
      ...warmChartBase(),
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        label: { fontSize: 11, color: WARM_CHART.muted },
        data: items.map((d, i) => ({
          name: d.label,
          value: d.count,
          itemStyle: { color: FACULTY_CHART_COLORS[i % FACULTY_CHART_COLORS.length] },
        })),
      }],
    }
  }, [facultyData])

  const facultyLabChart = useMemo(() => {
    if (!facultyData) return {}
    const raw = facultyData.stats.lab_match as { lab: string; count: number }[] | undefined
    const items = (raw ?? []).filter((d) => d.count > 0).slice(0, 12).reverse()
    return {
      ...warmChartBase(),
      grid: { left: 130, right: 20, top: 10, bottom: 20 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((d) => d.lab.replace('实训室', '').replace('实验室', '')),
        axisLabel: { fontSize: 10, color: WARM_CHART.muted },
      },
      series: [{
        type: 'bar',
        data: items.map((d) => d.count),
        itemStyle: { color: WARM_CHART.nodeLab, borderRadius: [0, 4, 4, 0] },
      }],
    }
  }, [facultyData])

  const sharedTop = useMemo(() => {
    if (!data) return []
    return [...data.shared_courses].sort((a, b) => b.lab_count - a.lab_count).slice(0, 12)
  }, [data])

  const maxShared = sharedTop[0]?.lab_count ?? 1

  const topFaculty = useMemo(() => {
    if (!facultyData) return []
    return [...facultyData.teachers]
      .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0) || a.name.localeCompare(b.name, 'zh-CN'))
      .slice(0, 8)
  }, [facultyData])

  const facultyLevelChart = useMemo(() => {
    if (!facultyData) return {}
    const levels = ['高', '中', '低'] as const
    const counts = levels.map((lv) => facultyData.teachers.filter((t) => t.level === lv).length)
    return {
      ...warmChartBase(),
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: levels, axisLabel: { color: WARM_CHART.muted } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [{
        type: 'bar',
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: { color: FACULTY_CHART_COLORS[i], borderRadius: [6, 6, 0, 0] },
        })),
        barMaxWidth: 48,
      }],
    }
  }, [facultyData])

  const compCategoryChart = useMemo(() => {
    if (!compCertData?.categoryStats.length) return {}
    const items = compCertData.categoryStats.slice(0, 8)
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['42%', '70%'],
        label: { fontSize: 10, color: WARM_CHART.muted },
        data: items.map((s, i) => ({
          name: s.category,
          value: s.count,
          itemStyle: { color: ['#e65100', '#f57c00', '#ff9800', '#ffb74d', '#bf360c', '#d84315'][i % 6] },
        })),
      }],
    }
  }, [compCertData])

  const certOrgStats = useMemo(() => {
    if (!compCertData) return []
    const map = new Map<string, number>()
    for (const c of compCertData.certificates) {
      const key = c.org || '其他'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [compCertData])

  const certOrgBarChart = useMemo(() => {
    if (!certOrgStats.length) return {}
    const items = [...certOrgStats].reverse()
    const colors = ['#004d40', '#00695c', '#00796b', '#00897b', '#009688', '#26a69a', '#4db6ac', '#80cbc4']
    return {
      ...warmChartBase(),
      grid: { left: 96, right: 36, top: 8, bottom: 8 },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category' as const,
        data: items.map(([org]) => (org.length > 10 ? `${org.slice(0, 10)}…` : org)),
        axisLabel: { fontSize: 10, color: WARM_CHART.muted },
      },
      series: [{
        type: 'bar' as const,
        data: items.map(([, count], i) => ({
          value: count,
          itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 32,
        label: { show: true, position: 'right' as const, fontSize: 10, color: WARM_CHART.muted },
      }],
    }
  }, [certOrgStats])

  const certOrgPieChart = useMemo(() => {
    if (!certOrgStats.length) return {}
    const colors = ['#00695c', '#00897b', '#26a69a', '#4db6ac', '#80cbc4', '#009688', '#00796b', '#004d40']
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} 张 ({d}%)' },
      legend: {
        type: 'scroll' as const,
        orient: 'vertical' as const,
        right: 4,
        top: 'middle' as const,
        textStyle: { fontSize: 9, color: WARM_CHART.muted },
      },
      series: [{
        type: 'pie' as const,
        radius: ['36%', '62%'],
        center: ['38%', '50%'],
        label: { show: false },
        data: certOrgStats.map(([org, count], i) => ({
          name: org.length > 12 ? `${org.slice(0, 12)}…` : org,
          value: count,
          itemStyle: { color: colors[i % colors.length] },
        })),
      }],
    }
  }, [certOrgStats])

  const demoCertList = useMemo(() => {
    if (!compCertData) return []
    const limit = 18
    if (!featuredJob) return compCertData.certificates.slice(0, limit)
    const seen = new Set<number>()
    const list = [...featuredJobCerts.certs]
    for (const c of list) seen.add(c.id)
    for (const c of compCertData.certificates) {
      if (seen.has(c.id)) continue
      list.push(c)
      if (list.length >= limit) break
    }
    return list
  }, [compCertData, featuredJob, featuredJobCerts.certs])

  const curriculumTierChart = useMemo(() => {
    return {
      ...warmChartBase(),
      legend: { top: 0, textStyle: { fontSize: 10, color: WARM_CHART.muted } },
      grid: { left: 48, right: 16, top: 32, bottom: 32 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: tierLayerStats.map(({ tier }) => tier.shortLabel),
        axisLabel: { color: WARM_CHART.muted, fontSize: 11 },
      },
      yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [
        {
          name: '实训室',
          type: 'bar' as const,
          data: tierLayerStats.map(({ tier, labCount }) => ({
            value: labCount,
            itemStyle: { color: tier.color, borderRadius: [4, 4, 0, 0], opacity: 0.85 },
          })),
          barGap: '20%',
          barMaxWidth: 36,
        },
        {
          name: '课程模块',
          type: 'bar' as const,
          data: tierLayerStats.map(({ tier, courseCount }) => ({
            value: courseCount ?? 0,
            itemStyle: { color: tier.color, borderRadius: [4, 4, 0, 0] },
          })),
          barMaxWidth: 36,
        },
      ],
    }
  }, [tierLayerStats])

  const matchLevelChart = useMemo(() => {
    const { counts } = integrationSummary
    const items = [
      { name: '匹配良好', value: counts.good, color: '#2e7d32' },
      { name: '师资缺口', value: counts.gap, color: '#c62828' },
      { name: '课程偏重', value: counts['course-heavy'], color: '#ef6c00' },
      { name: '师资充裕', value: counts['faculty-heavy'], color: '#00897b' },
      { name: '暂无数据', value: counts.empty, color: '#bdbdbd' },
    ].filter((d) => d.value > 0)
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['38%', '65%'],
        label: { fontSize: 10, color: WARM_CHART.muted, formatter: '{b}\n{c}' },
        data: items.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
      }],
    }
  }, [integrationSummary])

  const enterpriseFacultyCount = useMemo(() => {
    if (!facultyData) return 0
    const src = (facultyData.stats.source as FacultyStatItem[] | undefined) ?? []
    return src.find((s) => s.label === '企业')?.count ?? 0
  }, [facultyData])

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-warm-100 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data || !slide) {
    return (
      <div className="fixed inset-0 bg-warm-100 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-warm-700 max-w-md">{error || '暂无课程数据，请先上传 Excel'}</p>
        <div className="flex gap-3 mt-6">
          <Link to="/data" className="px-4 py-2 rounded-lg bg-accent-primary/15 text-accent-primary border border-accent-primary/30">
            前往数据管理
          </Link>
          <button type="button" onClick={() => navigate('/')} className="px-4 py-2 rounded-lg glass">返回首页</button>
        </div>
      </div>
    )
  }

  const progress = ((slideIndex + 1) / slides.length) * 100
  const teachers = facultyData?.teachers ?? []

  return (
    <div className="fixed inset-0 bg-[#f7f2eb] overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(196,92,38,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(217,119,6,0.08),transparent_45%)]" />
      <div className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(196,92,38,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(196,92,38,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* 顶栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-2.5 backdrop-blur-sm bg-white/40 border-b border-warm-200/60">
        <div>
          <h1 className="text-xl font-bold text-gradient tracking-tight">{BRAND_TITLE}</h1>
          <p className="text-xs text-warm-500 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span>{data.meta.total_labs} 实训室 · {data.meta.total_courses} 门课程</span>
            {facultyData && <span>{facultyData.meta.total_teachers} 位师资</span>}
            {jobMapData && <span>{jobMapData.meta.total_jobs} 个岗位</span>}
            {compCertData && (
              <span>{compCertData.meta.total_competitions} 项竞赛 · {compCertData.meta.total_certificates} 张证书</span>
            )}
            <span className="text-accent-primary font-medium">培养资源演示</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden lg:flex items-center gap-1.5 text-xs text-warm-500 tabular-nums">
            <Clock size={14} />
            {clock}
          </span>
          <span className="text-sm text-warm-600 hidden sm:block font-medium">
            {slideIndex + 1} / {slides.length} · {slide.title}
          </span>
          <button onClick={() => setPlaying(!playing)} className="p-2 rounded-lg bg-white/70 border border-warm-200 hover:bg-white transition shadow-sm" aria-label={playing ? '暂停' : '播放'}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={() => navigate('/')} className="p-2 rounded-lg bg-white/70 border border-warm-200 hover:bg-white transition shadow-sm" aria-label="退出">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="absolute top-[60px] left-6 right-6 h-1 bg-warm-200/80 rounded-full z-20 overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-accent-green via-accent-primary to-accent-secondary transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* 内容区：撑满顶栏与底栏之间 */}
      <div className="absolute inset-0 pt-[68px] pb-[52px] px-8 flex flex-col overflow-hidden">
        <div key={slideIndex} className="h-full min-h-0 w-full max-w-[1800px] mx-auto animate-fade-in-up">

          {/* ── 体系总览 ── */}
          {slide.kind === 'overview' && (
            <SlideShell>
              <div className="shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-2">
                  {slides.map((s, i) => (
                    <div key={s.kind} className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-medium border ${
                        s.kind === slide.kind
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : 'bg-white/80 text-warm-600 border-warm-200'
                      }`}>
                        {s.chapter}. {DEMO_FLOW.find((f) => f.kind === s.kind)?.label ?? s.title}
                      </span>
                      {i < slides.length - 1 && <ChevronRight size={12} className="text-warm-300" />}
                    </div>
                  ))}
                </div>
                <SlideHeader
                  chapter={slide.chapter}
                  icon={Sparkles}
                  title="培养资源总览"
                  subtitle="岗位 → 实训室 → 课程 → 师资 → 竞赛 → 证书 · 培养闭环"
                  tint="from-accent-primary/20 to-accent-orange/10 text-accent-primary"
                />
              </div>

              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
                {[
                  { label: '实训室', value: data.meta.total_labs, hint: '教学载体', accent: 'text-accent-primary' },
                  { label: '课程', value: data.meta.total_courses, hint: '培养内容', accent: 'text-accent-orange' },
                  { label: '师资', value: facultyData?.meta.total_teachers ?? '—', hint: '授课力量', accent: 'text-accent-green' },
                  { label: '岗位', value: jobMapData?.meta.total_jobs ?? '—', hint: '能力目标', accent: 'text-warm-800' },
                  { label: '竞赛', value: compCertData?.meta.total_competitions ?? '—', hint: '实战检验', accent: 'text-orange-600' },
                  { label: '证书', value: compCertData?.meta.total_certificates ?? '—', hint: '认证出口', accent: 'text-teal-700' },
                ].map(({ label, value, hint, accent }) => (
                  <KpiTile key={label} label={label} value={value} hint={hint} accent={accent} />
                ))}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="课程类型结构" hint="通识 · 基础 · 核心 · 实践" className="h-full min-h-0">
                  <FlexChart option={typeChart} />
                </Panel>
                <Panel title="实训室课程体量" hint={`Treemap · 均值 ${labTreemapChart.avg ?? 0} 门/室`} className="h-full min-h-0">
                  <FlexChart option={labTreemapChart.chart ?? {}} />
                </Panel>
                {integrations.length > 0 && (
                  <Panel title="六元资源匹配" hint="Top 8 实训室" className="h-full min-h-0">
                    <FlexChart option={sixElementCompareChart} />
                  </Panel>
                )}
              </div>
            </SlideShell>
          )}

          {/* ── 岗位体系 ── */}
          {slide.kind === 'jobs' && jobMapData && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={Briefcase}
                title="岗位能力体系"
                subtitle={`${jobMapData.meta.total_jobs} 岗位 · ${jobMapData.meta.total_skills} 能力域 · ${jobMapData.meta.total_lab_links} 室岗关联`}
                tint="from-accent-primary/15 to-warm-100 text-accent-primary"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <KpiTile label="岗位总数" value={jobMapData.meta.total_jobs} hint="覆盖多类工种" />
                <KpiTile label="能力域" value={jobMapData.meta.total_skills} hint="可拆解技能点" accent="text-accent-orange" />
                <KpiTile label="室岗关联" value={jobMapData.meta.total_lab_links} hint="实训室对接" accent="text-accent-green" />
                {featuredJob && (
                  <KpiTile label="示范岗位师资" value={featuredJobFaculty} hint={featuredJob.name} accent="text-warm-800" />
                )}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="岗位大类分布" className="lg:col-span-2 h-full min-h-0">
                  <FlexChart option={jobCategoryChart} />
                </Panel>
                <Panel title="关联实训室较多的岗位" hint="按关联数排序" className="lg:col-span-3 h-full min-h-0">
                  <div className="h-full min-h-0 flex flex-col gap-2">
                    <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start overflow-y-auto scrollbar-thin pr-1">
                      {topJobs.slice(0, 10).map((j, i) => (
                        <div key={j.name} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-warm-50 border border-warm-100">
                          <span className="w-6 h-6 rounded-md bg-accent-primary/10 text-accent-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{j.name}</div>
                            <div className="text-[9px] text-warm-500 truncate">{j.category} · {j.skills.length} 能力域</div>
                          </div>
                          <span className="text-xs font-bold text-accent-secondary shrink-0 tabular-nums">{j.labLinks.length} 室</span>
                        </div>
                      ))}
                    </div>
                    {jobDecomposeExample && (
                      <div className="shrink-0 pt-2 border-t border-warm-100">
                        <p className="text-[10px] text-warm-500 mb-1.5">拆解示例 · {jobDecomposeExample.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {jobDecomposeExample.labLinks.slice(0, 8).map(({ lab, level }) => (
                            <span key={lab} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                              level === 'core' ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : 'bg-white border-warm-200 text-warm-600'
                            }`}>
                              {shortLab(lab)}
                            </span>
                          ))}
                          {jobDecomposeExample.skills.slice(0, 4).map((s) => (
                            <span key={s.domain} className="text-[10px] px-1.5 py-0.5 rounded-md bg-warm-50 border border-warm-100 text-warm-700">
                              {s.domain}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </SlideShell>
          )}

          {/* ── 实训室全景 ── */}
          {slide.kind === 'labs-overview' && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={Building2}
                title="实训室资源全景"
                subtitle={`${data.meta.total_labs} 实训室 · ${data.meta.total_courses} 门课${facultyData ? ` · 课师映射 ${integrationSummary.avgCoverage}%` : ''}`}
                tint="from-accent-secondary/15 to-warm-100 text-accent-secondary"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <KpiTile label="实训室" value={data.meta.total_labs} hint="教学载体" />
                <KpiTile label="课程总量" value={data.meta.total_courses} hint="培养内容" accent="text-accent-orange" />
                {facultyData && (
                  <KpiTile label="平均映射率" value={`${integrationSummary.avgCoverage}%`} hint="课师严格匹配" accent="text-accent-green" />
                )}
                <KpiTile label="待关注" value={integrationSummary.counts.gap + integrationSummary.counts['course-heavy']} hint="缺口或偏重" accent="text-orange-600" />
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="课程体量 Treemap" hint="面积越大课程越多" className="h-full min-h-0">
                  <FlexChart option={labTreemapChart.chart ?? {}} />
                </Panel>
                <Panel title="六元资源堆叠" hint="课程 · 师资 · 岗位 · 竞赛 · 证书" className="h-full min-h-0">
                  <FlexChart option={sixElementCompareChart} />
                </Panel>
                <Panel title="匹配状态分布" className="h-full min-h-0">
                  <FlexChart option={matchLevelChart} />
                </Panel>
              </div>
            </SlideShell>
          )}

          {/* ── 三层课程体系 ── */}
          {slide.kind === 'curriculum' && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={GraduationCap}
                title="三层课程体系"
                subtitle={`企业培训 · 实习实训 · 产业学院${designData ? ' · 设计表' : ' · 学时估算'}`}
                tint="from-accent-primary/15 to-accent-green/10 text-accent-primary"
              />

              <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
                {tierLayerStats.map(({ tier, labCount, courseCount }, i) => (
                  <div
                    key={tier.id}
                    className="rounded-xl p-4 bg-white/90 border shadow-sm flex flex-col"
                    style={{ borderColor: `${tier.color}35`, borderTopWidth: 4, borderTopColor: tier.color }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center shadow-sm" style={{ backgroundColor: tier.color }}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base text-warm-900">{tier.shortLabel}</p>
                        <p className="text-[10px] text-warm-500">{tier.period} · {tier.hours}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: tier.color }}>{labCount}</p>
                        {courseCount != null && <p className="text-[10px] text-warm-500 mt-0.5">{courseCount} 模块</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-warm-600 mt-auto">
                      <span>形式 {tier.format}</span>
                      <span>师资 {tier.faculty}</span>
                      <span>频率 {tier.frequency}</span>
                      <span className="truncate">材料 {tier.materials}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="三层覆盖对比" hint="实训室 vs 课程模块" className="h-full min-h-0">
                  <FlexChart option={curriculumTierChart} />
                </Panel>
                <Panel title="体系设计要点" className="h-full min-h-0">
                  <div className="h-full min-h-0 flex flex-col justify-between gap-3">
                    <p className="text-sm text-warm-700 leading-relaxed">
                      按 <strong className="text-accent-primary">企业培训 → 实习实训 → 产业学院</strong> 三层组织，由浅入深对接产业能力要求。
                    </p>
                    <div className="flex-1 min-h-0 grid grid-cols-1 gap-2 overflow-y-auto scrollbar-thin pr-1">
                      {tierLayerStats.map(({ tier, labCount, courseCount }) => (
                        <div
                          key={tier.id}
                          className="rounded-lg px-3 py-2.5 border flex items-center gap-3"
                          style={{ backgroundColor: `${tier.color}08`, borderColor: `${tier.color}25` }}
                        >
                          <span className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-warm-900">{tier.shortLabel}</p>
                            <p className="text-[10px] text-warm-500 truncate">{tier.format} · {tier.faculty} · {tier.frequency}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold tabular-nums" style={{ color: tier.color }}>{labCount} 室</p>
                            {courseCount != null && <p className="text-[10px] text-warm-500">{courseCount} 模块</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {vendorInsights?.top && (
                      <p className="text-xs text-warm-500 pt-2 border-t border-warm-100 shrink-0">
                        厂商课 {data.meta.total_vendor_courses} 门 · 共享课 {data.meta.shared_course_count} 门 · 头部 {vendorInsights.top.vendor}（{vendorInsights.top.count} 门）
                      </p>
                    )}
                  </div>
                </Panel>
              </div>
            </SlideShell>
          )}

          {/* ── 师资队伍 ── */}
          {slide.kind === 'faculty' && facultyData && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={Users}
                title="师资队伍画像"
                subtitle={`${facultyData.meta.total_teachers} 位师资 · ${facultyData.meta.total_labs} 实训室 · 映射 ${integrationSummary.avgCoverage}%`}
                tint="from-accent-green/15 to-teal-50 text-accent-green"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <KpiTile label="师资总数" value={facultyData.meta.total_teachers} hint="授课力量" accent="text-accent-green" />
                <KpiTile label="企业师资" value={enterpriseFacultyCount} hint="产业一线" accent="text-accent-primary" />
                <KpiTile label="覆盖实训室" value={facultyData.meta.total_labs} hint="室级配置" accent="text-accent-orange" />
                <KpiTile label="课师映射率" value={`${integrationSummary.avgCoverage}%`} hint="严格匹配" accent="text-teal-700" />
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex-[1.15] min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                  <Panel title="师资来源" className="h-full min-h-0">
                    <FlexChart option={facultySourceChart} />
                  </Panel>
                  <Panel title="级别分布" className="h-full min-h-0">
                    <FlexChart option={facultyLevelChart} />
                  </Panel>
                  <Panel title="室级覆盖" hint="Top 12" className="h-full min-h-0">
                    <FlexChart option={facultyLabChart} />
                  </Panel>
                </div>
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                  <Panel title="推荐 TOP 师资" className="h-full min-h-0">
                    <div className="h-full min-h-0 grid grid-cols-2 gap-2 content-start overflow-y-auto scrollbar-thin pr-1">
                      {topFaculty.slice(0, 8).map((t, i) => (
                        <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-warm-50 border border-warm-100">
                          <span className="w-6 h-6 rounded-md bg-accent-green/15 text-accent-green text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{t.name}</p>
                            <p className="text-[9px] text-warm-500 truncate">{t.source} · {t.title_dim || t.title_level}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="映射待关注" className="h-full min-h-0">
                    <div className="h-full min-h-0 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
                      {(gapItems.length ? gapItems : integrations.filter((i) => i.faculty.length > 0).slice(0, 8)).map((item) => (
                        <div key={item.lab.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-warm-50 border border-warm-100">
                          <p className="text-xs font-medium truncate flex-1">{shortLab(item.lab.name)}</p>
                          <span className="text-[10px] text-warm-500 shrink-0">{item.courses.length}课 · {item.faculty.length}师</span>
                          <span className="text-[10px] text-warm-500 shrink-0">{item.strictCoveragePct}%</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${MATCH_COLORS[item.matchLevel]}`}>
                            {item.matchLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </SlideShell>
          )}

          {/* ── 竞赛体系 ── */}
          {slide.kind === 'competitions' && compCertData && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={Trophy}
                title="竞赛资源体系"
                subtitle={`${compCertData.meta.total_competitions} 项竞赛 · 映射 ${compCertData.meta.total_labs_mapped} 实训室`}
                tint="from-orange-100 to-orange-50 text-orange-600"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <KpiTile label="竞赛总数" value={compCertData.meta.total_competitions} hint="实战检验" accent="text-orange-600" />
                <KpiTile label="映射实训室" value={compCertData.meta.total_labs_mapped} hint="室赛对接" accent="text-accent-primary" />
                <KpiTile label="竞赛类别" value={compCertData.categoryStats.length} hint="多元赛道" accent="text-accent-orange" />
                {featuredJob && (
                  <KpiTile label="示范岗位赛事" value={featuredJobCerts.comps.length} hint={featuredJob.name} accent="text-warm-800" />
                )}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="类别分布" className="h-full min-h-0">
                  <FlexChart option={compCategoryChart} />
                </Panel>
                <Panel
                  title="竞赛清单"
                  hint={featuredJob ? `「${featuredJob.name}」相关优先` : undefined}
                  className="lg:col-span-2 h-full min-h-0"
                >
                  <div className="h-full min-h-0 grid sm:grid-cols-2 gap-2 content-start overflow-y-auto scrollbar-thin pr-1">
                    {(featuredJob ? featuredJobCerts.comps : compCertData.competitions.slice(0, 16)).map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-50/60 border border-orange-100/80">
                        <Trophy size={13} className="text-orange-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.name}</p>
                          <p className="text-[9px] text-warm-500 truncate">{c.category} · {c.rating || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </SlideShell>
          )}

          {/* ── 证书体系 ── */}
          {slide.kind === 'certificates' && compCertData && (
            <SlideShell>
              <SlideHeader
                chapter={slide.chapter}
                icon={Award}
                title="证书认证体系"
                subtitle={`${compCertData.meta.total_certificates} 张证书 · 对接实训室与岗位培养路径`}
                tint="from-teal-50 to-emerald-50 text-teal-700"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <KpiTile label="证书总数" value={compCertData.meta.total_certificates} hint="认证出口" accent="text-teal-700" />
                <KpiTile label="发证机构" value={certOrgStats.length} hint="多元认证" accent="text-accent-primary" />
                <KpiTile label="竞赛类别" value={compCertData.categoryStats.length} hint="赛证联动" accent="text-orange-600" />
                {featuredJob && (
                  <KpiTile label="示范岗位证书" value={featuredJobCerts.certs.length} hint={featuredJob.name} accent="text-warm-800" />
                )}
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch [grid-template-rows:minmax(0,1fr)]">
                <Panel title="发证机构分布" hint="占比 · Top 8 排名" className="h-full min-h-0">
                  <div className="h-full min-h-0 flex flex-col gap-2">
                    <div className="flex-[0.42] min-h-0">
                      <FlexChart option={certOrgPieChart} />
                    </div>
                    <div className="flex-1 min-h-0">
                      <FlexChart option={certOrgBarChart} />
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="证书清单"
                  hint={featuredJob ? `「${featuredJob.name}」相关优先` : undefined}
                  className="lg:col-span-2 h-full min-h-0"
                >
                  <div className="h-full min-h-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start overflow-y-auto scrollbar-thin pr-1">
                    {demoCertList.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50/50 border border-teal-100/80">
                        <Award size={13} className="text-teal-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.shortName || c.fullName}</p>
                          <p className="text-[9px] text-warm-500 truncate">{c.org} · {c.field || c.level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </SlideShell>
          )}
        </div>
      </div>

      {/* 底栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-2 backdrop-blur-sm bg-white/50 border-t border-warm-200/60">
        <div className="flex gap-1.5 flex-wrap max-w-[75%]">
          {slides.map((s) => (
            <button
              key={s.kind}
              type="button"
              onClick={() => setSlideIndex(slides.indexOf(s))}
              className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
                slide.kind === s.kind
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
              }`}
            >
              {s.chapter}. {DEMO_FLOW.find((f) => f.kind === s.kind)?.label ?? s.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-2.5 rounded-full bg-white/80 border border-warm-200 hover:bg-white transition shadow-sm">
            <ChevronLeft size={22} />
          </button>
          <button onClick={next} className="p-2.5 rounded-full bg-white/80 border border-warm-200 hover:bg-white transition shadow-sm">
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
