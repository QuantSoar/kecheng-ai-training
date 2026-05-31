import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  X, ChevronLeft, ChevronRight, Pause, Play, Briefcase,
  GitMerge, Building2, BookOpen, Users, Target, Clock, Factory, Sparkles,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import { FACULTY_CHART_COLORS } from '../types/faculty'
import { JOB_CATEGORY_COLORS } from '../types/jobMap'
import type { FacultyStatItem, FacultyTeacher } from '../types/faculty'
import type { Lab } from '../types'
import type { JobProfile } from '../types/jobMap'
import { buildLabIntegrations, MATCH_COLORS } from '../utils/integrate'
import { facultyForJob } from '../utils/jobLink'

const SLIDE_INTERVAL = 9000
const BRAND_TITLE = '人工智能实训基地'

type SlideKind =
  | 'overview'
  | 'vendor'
  | 'shared'
  | 'integrated'
  | 'jobs'
  | 'job-flow'
  | 'jobs-feature'
  | 'faculty'
  | 'faculty-labs'
  | 'faculty-top'
  | 'lab'

interface Slide {
  kind: SlideKind
  title: string
  labIndex?: number
}

function buildSlides(labs: Lab[], hasFaculty: boolean, hasJobs: boolean, hasIntegrated: boolean): Slide[] {
  const slides: Slide[] = [
    { kind: 'overview', title: '体系总览' },
    { kind: 'vendor', title: '厂商课程生态' },
    { kind: 'shared', title: '课程共享网络' },
  ]
  if (hasIntegrated) {
    slides.push({ kind: 'integrated', title: '综合匹配洞察' })
  }
  if (hasJobs) {
    slides.push(
      { kind: 'jobs', title: '岗位体系概览' },
      { kind: 'job-flow', title: '培养资源匹配流程' },
      { kind: 'jobs-feature', title: '岗位能力图谱' },
    )
  }
  if (hasFaculty) {
    slides.push(
      { kind: 'faculty', title: '师资队伍概况' },
      { kind: 'faculty-labs', title: '师资实训室覆盖' },
      { kind: 'faculty-top', title: '优质师资推荐' },
    )
  }
  labs.forEach((lab, i) => slides.push({ kind: 'lab', title: lab.name, labIndex: i }))
  return slides
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
  const navigate = useNavigate()
  const [slideIndex, setSlideIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const clock = useClock()

  const labs = data?.labs ?? []
  const hasIntegrated = !!facultyData || !!jobMapData?.jobs.length
  const slides = useMemo(
    () => buildSlides(labs, !!facultyData, !!jobMapData?.jobs.length, hasIntegrated),
    [labs, facultyData, jobMapData, hasIntegrated],
  )
  const slide = slides[slideIndex]
  const lab = slide?.kind === 'lab' && slide.labIndex != null ? labs[slide.labIndex] : null

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
    })
  }, [data, facultyData, jobMapData])

  const integrationSummary = useMemo(() => {
    const counts = { good: 0, gap: 0, 'course-heavy': 0, 'faculty-heavy': 0, empty: 0 }
    for (const i of integrations) counts[i.matchLevel] += 1
    const avgCoverage = integrations.length
      ? Math.round(integrations.reduce((s, i) => s + i.strictCoveragePct, 0) / integrations.length)
      : 0
    return { counts, avgCoverage }
  }, [integrations])

  const integrationChart = useMemo(() => {
    const items = integrations
      .filter((i) => i.courses.length > 0)
      .sort((a, b) => b.strictCoveragePct - a.strictCoveragePct)
      .slice(0, 10)
      .reverse()
    return {
      ...warmChartBase(),
      grid: { left: 120, right: 24, top: 12, bottom: 24 },
      xAxis: { type: 'value' as const, max: 100, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category' as const,
        data: items.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 10, color: WARM_CHART.muted },
      },
      series: [{
        type: 'bar' as const,
        data: items.map((i) => ({
          value: i.strictCoveragePct,
          itemStyle: {
            color: i.strictCoveragePct >= 60 ? WARM_CHART.nodeLab : i.strictCoveragePct >= 30 ? WARM_CHART.primary : '#e57373',
            borderRadius: [0, 4, 4, 0],
          },
        })),
      }],
    }
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
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 backdrop-blur-sm bg-white/40 border-b border-warm-200/60">
        <div>
          <h1 className="text-2xl font-bold text-gradient tracking-tight">{BRAND_TITLE}</h1>
          <p className="text-sm text-warm-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>{data.meta.total_labs} 实训室 · {data.meta.total_courses} 门课程</span>
            {facultyData && <span>{facultyData.meta.total_teachers} 位师资</span>}
            {jobMapData && <span>{jobMapData.meta.total_jobs} 个岗位</span>}
            <span className="text-accent-primary font-medium">大屏演示</span>
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
      <div className="absolute top-[72px] left-8 right-8 h-1.5 bg-warm-200/80 rounded-full z-20 overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-accent-green via-accent-primary to-accent-secondary transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* 内容区 */}
      <div className="absolute inset-0 pt-[88px] pb-[72px] px-10 flex items-center justify-center overflow-hidden">
        <div key={slideIndex} className="w-full max-w-7xl animate-fade-in-up">

          {/* ── 体系总览 ── */}
          {slide.kind === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: '课程', value: data.meta.total_courses, unit: '门' },
                  { label: '实训室', value: data.meta.total_labs, unit: '个' },
                  { label: '厂商课', value: data.meta.total_vendor_courses, unit: '门' },
                  { label: '合作厂商', value: data.meta.vendor_count, unit: '家' },
                  { label: '共享课程', value: data.meta.shared_course_count, unit: '门' },
                  ...(jobMapData ? [
                    { label: '岗位', value: jobMapData.meta.total_jobs, unit: '个' },
                    { label: '能力域', value: jobMapData.meta.total_skills, unit: '条' },
                  ] : []),
                  ...(facultyData ? [
                    { label: '师资', value: facultyData.meta.total_teachers, unit: '人' },
                    { label: '企业师资', value: (facultyData.stats.source as FacultyStatItem[])?.find(s => s.label === '企业')?.count ?? '—', unit: '人' },
                    { label: '覆盖实训室', value: facultyData.meta.total_labs, unit: '个' },
                  ] : []),
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-xl p-4 text-center bg-white/80 border border-warm-200/80 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl font-bold text-gradient tabular-nums">{value}</div>
                    <div className="text-xs text-warm-600 mt-1 font-medium">{label}</div>
                    <div className="text-[10px] text-warm-400">{unit}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="glass rounded-2xl p-5">
                  <h3 className="text-warm-600 mb-3">课程类型结构</h3>
                  <Chart option={typeChart} height={260} />
                </div>
                <div className="rounded-2xl p-5 bg-white/80 border border-warm-200/80 shadow-sm">
                  <h3 className="text-warm-700 font-semibold mb-1">实训室课程体系体量分布</h3>
                  <p className="text-[11px] text-warm-500 mb-3">
                    矩形面积代表课程规模 · 均值 {labTreemapChart.avg ?? 0} 门/室
                    {labTreemapChart.maxLab && ` · 最大 ${shortLab(labTreemapChart.maxLab.name)} ${labTreemapChart.maxLab.course_counts.total} 门`}
                  </p>
                  <Chart option={labTreemapChart.chart ?? {}} height={260} />
                </div>
              </div>
            </div>
          )}

          {/* ── 厂商课程 ── */}
          {slide.kind === 'vendor' && vendorInsights && (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gradient flex items-center gap-2">
                    <Factory size={26} className="text-accent-primary" />
                    厂商课程生态
                  </h2>
                  <p className="text-sm text-warm-500 mt-1">产学研合作 · 覆盖实训室与核心实践课</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  {[
                    { label: '厂商课程', value: data.meta.total_vendor_courses, unit: '门' },
                    { label: '合作厂商', value: data.meta.vendor_count, unit: '家' },
                    { label: '人均供给', value: vendorInsights.avgPerVendor, unit: '门/家' },
                    { label: '头部厂商', value: vendorInsights.top?.vendor ?? '—', unit: vendorInsights.top ? `${vendorInsights.top.count} 门` : '' },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="rounded-xl px-4 py-2.5 bg-white/85 border border-warm-200/80 text-center min-w-[88px]">
                      <div className="text-lg font-bold text-accent-primary tabular-nums truncate max-w-[100px]">{value}</div>
                      <div className="text-[10px] text-warm-500">{label}</div>
                      {unit && <div className="text-[9px] text-warm-400">{unit}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2 rounded-2xl p-5 bg-white/80 border border-warm-200/80 shadow-sm">
                  <h3 className="text-sm font-semibold text-warm-700 mb-1">厂商份额结构</h3>
                  <p className="text-[11px] text-warm-500 mb-2">TOP6 厂商 + 其余合并</p>
                  <Chart option={vendorPieChart} height={280} />
                </div>
                <div className="col-span-3 rounded-2xl p-5 bg-white/80 border border-warm-200/80 shadow-sm">
                  <h3 className="text-sm font-semibold text-warm-700 mb-1">厂商课程供给量</h3>
                  <p className="text-[11px] text-warm-500 mb-3">各厂商合作课程数量对比</p>
                  <Chart option={vendorChart} height={280} />
                </div>
              </div>
              <div className="rounded-2xl p-4 bg-white/80 border border-warm-200/80 shadow-sm">
                <h3 className="text-sm font-semibold text-warm-700 mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-accent-orange" />
                  厂商实训室覆盖与占比
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {vendorInsights.enriched.slice(0, 10).map((v, i) => (
                    <div key={v.vendor} className="rounded-xl p-3 bg-warm-50/80 border border-warm-100">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-bold text-accent-orange">#{i + 1}</span>
                        <span className="text-[10px] text-warm-500">{v.labCount} 室</span>
                      </div>
                      <p className="text-sm font-semibold text-warm-900 truncate">{v.vendor}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-warm-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-orange"
                          style={{ width: `${Math.min(100, v.ratio * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-warm-500 mt-1.5">{v.count} 门 · {(v.ratio * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 共享网络 ── */}
          {slide.kind === 'shared' && (
            <div className="space-y-5">
              <div className="flex items-end gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-gradient">课程共享网络</h2>
                  <p className="text-warm-600 mt-1">{data.meta.shared_course_count} 门课程跨实训室复用</p>
                </div>
                <div className="glass rounded-xl px-6 py-3 text-center">
                  <div className="text-3xl font-bold text-accent-primary">{sharedTop[0]?.lab_count ?? 0}</div>
                  <div className="text-xs text-warm-500">最多覆盖实训室</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {sharedTop.map((s, i) => (
                  <div key={s.name} className="glass rounded-xl p-4 flex items-center gap-4">
                    <span className="text-2xl font-bold text-warm-400 w-8">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="mt-2 h-2 bg-warm-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-gold rounded-full"
                          style={{ width: `${(s.lab_count / maxShared) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xl font-bold text-accent-primary shrink-0">{s.lab_count}</span>
                    <span className="text-xs text-warm-500 shrink-0">个实训室</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 综合匹配洞察 ── */}
          {slide.kind === 'integrated' && (
            <div className="space-y-5">
              <div className="flex items-end gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-gradient flex items-center gap-2">
                    <GitMerge size={30} className="text-accent-primary" />
                    综合匹配洞察
                  </h2>
                  <p className="text-warm-600 mt-1">课程 · 师资 · 岗位三要素联动 · 平均课师映射率 {integrationSummary.avgCoverage}%</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: '匹配良好', key: 'good' as const },
                  { label: '师资充裕', key: 'faculty-heavy' as const },
                  { label: '课程偏重', key: 'course-heavy' as const },
                  { label: '待改善', key: 'gap' as const },
                  { label: '暂无数据', key: 'empty' as const },
                ].map(({ label, key }) => (
                  <div key={key} className={`rounded-xl p-4 text-center border ${MATCH_COLORS[key]}`}>
                    <div className="text-3xl font-bold tabular-nums">{integrationSummary.counts[key]}</div>
                    <div className="text-xs mt-1 font-medium">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-5">
                <div className="col-span-3 rounded-2xl p-5 bg-white/80 border border-warm-200/80 shadow-sm">
                  <h3 className="text-sm font-semibold text-warm-700 mb-1">课师严格映射率 TOP10 实训室</h3>
                  <p className="text-[11px] text-warm-500 mb-3">capable_courses 与课程名精确匹配</p>
                  <Chart option={integrationChart} height={300} />
                </div>
                <div className="col-span-2 rounded-2xl p-5 bg-white/80 border border-warm-200/80 shadow-sm overflow-y-auto max-h-[380px] scrollbar-thin">
                  <h3 className="text-sm font-semibold text-warm-700 mb-3">关联岗位最多的实训室</h3>
                  <div className="space-y-2">
                    {[...integrations]
                      .sort((a, b) => b.jobCount - a.jobCount)
                      .slice(0, 8)
                      .map((i, idx) => (
                        <div key={i.lab.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                          <span className="text-sm font-bold text-accent-primary w-5">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{shortLab(i.lab.name)}</div>
                            <div className="text-[10px] text-warm-500">{i.courses.length} 课 · {i.faculty.length} 师</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${MATCH_COLORS[i.matchLevel]}`}>
                            {i.matchLabel}
                          </span>
                          <span className="text-sm font-bold text-accent-secondary shrink-0">{i.jobCount}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 岗位体系概览 ── */}
          {slide.kind === 'jobs' && jobMapData && (
            <div className="space-y-5">
              <div className="flex items-end gap-6">
                <div>
                  <h2 className="text-3xl font-bold text-gradient flex items-center gap-2">
                    <Briefcase size={32} className="text-accent-primary" />
                    AI 岗位技能体系
                  </h2>
                  <p className="text-warm-600 mt-1">
                    {jobMapData.meta.total_jobs} 个岗位 · {jobMapData.meta.total_skills} 条能力域 · {jobMapData.meta.total_lab_links} 项实训室关联
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4 items-stretch">
                <div className="col-span-2 flex flex-col rounded-2xl p-5 bg-white/85 border border-warm-200/80 shadow-sm h-[308px]">
                  <h3 className="text-sm font-semibold text-warm-700 mb-3 shrink-0">岗位大类分布</h3>
                  <div className="flex-1 min-h-0">
                    <Chart option={jobCategoryChart} height={236} />
                  </div>
                </div>
                <div className="col-span-3 flex flex-col rounded-2xl p-5 bg-white/85 border border-warm-200/80 shadow-sm h-[308px]">
                  <h3 className="text-sm font-semibold text-warm-700 mb-3 shrink-0">实训室关联度较高的岗位</h3>
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    {topJobs.slice(0, 6).map((j, i) => (
                      <div key={j.name} className="flex-1 flex items-center gap-3 px-3 rounded-xl bg-warm-50 border border-warm-100 min-h-0">
                        <span className="text-sm font-bold text-accent-primary w-6 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{j.name}</div>
                          <div className="text-[10px] text-warm-500 mt-0.5 truncate">{j.category} · {j.heat || '—'}</div>
                        </div>
                        <span className="text-sm font-bold text-accent-secondary shrink-0 tabular-nums">{j.labLinks.length} 室</span>
                        <span className="text-xs text-warm-500 shrink-0 tabular-nums w-8 text-right">{j.skills.length} 域</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {jobDecomposeExample && (
                <div className="rounded-2xl p-5 bg-white/85 border border-accent-primary/20 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-warm-900 flex items-center gap-2">
                        <Target size={18} className="text-accent-primary" />
                        岗位拆解示例
                      </h3>
                      <p className="text-xs text-warm-500 mt-0.5">能力域 → 初/中/高级 → 推荐课程 · 关联实训室</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary">{jobDecomposeExample.category}</span>
                      <p className="text-lg font-bold text-gradient mt-1">{jobDecomposeExample.name}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-warm-200/80 overflow-hidden text-[10px]">
                    <div className="grid grid-cols-[108px_1fr_1fr_1fr_140px] bg-accent-primary/90 text-white font-semibold">
                      <div className="py-2 px-2.5">能力域</div>
                      <div className="py-2 px-2.5 text-center border-l border-white/20">初级</div>
                      <div className="py-2 px-2.5 text-center border-l border-white/20">中级</div>
                      <div className="py-2 px-2.5 text-center border-l border-white/20">高级</div>
                      <div className="py-2 px-2.5 text-center border-l border-white/20">推荐课程</div>
                    </div>
                    {jobDecomposeExample.skills.slice(0, 4).map((skill, i) => (
                      <div
                        key={skill.domain}
                        className={`grid grid-cols-[108px_1fr_1fr_1fr_140px] items-stretch ${i % 2 === 0 ? 'bg-white' : 'bg-warm-50/80'}`}
                      >
                        <div className="p-2.5 font-bold text-accent-primary flex items-center border-t border-warm-200/60">{skill.domain}</div>
                        <div className="p-2.5 border-l border-t border-warm-200/60 text-warm-700 leading-relaxed flex items-center">{skill.junior || '—'}</div>
                        <div className="p-2.5 border-l border-t border-warm-200/60 text-warm-700 bg-[#fff8f0]/40 leading-relaxed flex items-center">{skill.mid || '—'}</div>
                        <div className="p-2.5 border-l border-t border-warm-200/60 text-warm-700 bg-[#eef3f8]/40 leading-relaxed flex items-center">{skill.senior || '—'}</div>
                        <div className="p-2.5 border-l border-t border-warm-200/60 text-warm-600 flex items-center">
                          {skill.courses.slice(0, 2).join('、') || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-warm-100">
                    <span className="text-xs text-warm-500">关联实训室</span>
                    {jobDecomposeExample.labLinks.slice(0, 6).map(({ lab, level }) => (
                      <span key={lab} className="text-[11px] px-2 py-1 rounded-lg bg-white border border-warm-200 text-warm-700">
                        {level === 'core' ? '●' : level === 'important' ? '◐' : '○'} {shortLab(lab)}
                      </span>
                    ))}
                    {(jobDecomposeExample.keywords || '').split(/[,，/]/).slice(0, 4).map((k) => k.trim()).filter(Boolean).map((k) => (
                      <span key={k} className="text-[11px] px-2 py-1 rounded-full bg-accent-primary/8 text-warm-600">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 培养资源匹配流程 ── */}
          {slide.kind === 'job-flow' && featuredJob && (
            <div className="space-y-6">
              <div>
                <span className="text-sm text-accent-primary font-medium">{featuredJob.category}</span>
                <h2 className="text-3xl font-bold text-gradient mt-1">岗位 → 实训室 → 课程 → 师资</h2>
                <p className="text-warm-600 mt-1 text-sm">以「{featuredJob.name}」为例展示四步培养资源匹配流程</p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { step: 1, icon: Briefcase, title: '选择岗位', value: featuredJob.name, sub: `${featuredJob.skills.length} 能力域 · ${featuredJob.heat || '—'}` },
                  { step: 2, icon: Building2, title: '匹配实训室', value: `${featuredJob.labLinks.length} 个`, sub: featuredJob.labLinks.slice(0, 2).map((l) => shortLab(l.lab)).join('、') || '—' },
                  { step: 3, icon: BookOpen, title: '匹配课程', value: `${featuredJob.skills.reduce((n, s) => n + s.courses.length, 0)} 门`, sub: '技能图谱 + 岗位映射 + 本室课程' },
                  { step: 4, icon: Users, title: '匹配师资', value: `${featuredJobFaculty} 人`, sub: '标注可授核心课 · 实训室维度筛选' },
                ].map(({ step, icon: Icon, title, value, sub }) => (
                  <div key={step} className="relative rounded-2xl p-5 bg-white/85 border border-warm-200/80 shadow-sm">
                    <span className="absolute -top-3 left-4 w-7 h-7 rounded-full bg-accent-primary text-white text-sm font-bold flex items-center justify-center shadow">
                      {step}
                    </span>
                    <Icon size={22} className="text-accent-primary mt-2 mb-3" />
                    <p className="text-xs text-warm-500 font-medium">{title}</p>
                    <p className="text-lg font-bold text-warm-900 mt-1 leading-snug line-clamp-2">{value}</p>
                    <p className="text-[10px] text-warm-500 mt-2 leading-relaxed">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-5 bg-white/80 border border-warm-200/80">
                <p className="text-xs text-warm-500 mb-2 flex items-center gap-1"><Target size={13} /> 核心能力关键词</p>
                <div className="flex flex-wrap gap-2">
                  {(featuredJob.keywords || '').split(/[,，/]/).map((k) => k.trim()).filter(Boolean).slice(0, 12).map((k) => (
                    <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-accent-primary/8 text-warm-700 border border-accent-primary/15">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 岗位能力图谱（精选） ── */}
          {slide.kind === 'jobs-feature' && featuredJob && (
            <div className="space-y-5">
              <div>
                <span className="text-sm text-accent-primary">{featuredJob.category}</span>
                <h2 className="text-3xl font-bold text-gradient mt-1">{featuredJob.name}</h2>
                <p className="text-warm-600 mt-1 text-sm">{featuredJob.keywords || '能力分层培养路径'}</p>
              </div>
              <div className="rounded-2xl overflow-hidden border border-warm-300 text-xs">
                <div className="grid grid-cols-[140px_1fr_1fr_1fr_180px] bg-accent-primary text-white font-bold">
                  <div className="py-2 px-3">能力域</div>
                  <div className="py-2 px-3 text-center">初级</div>
                  <div className="py-2 px-3 text-center">中级</div>
                  <div className="py-2 px-3 text-center">高级</div>
                  <div className="py-2 px-3 text-center">推荐课程</div>
                </div>
                {featuredJob.skills.slice(0, 5).map((skill, i) => (
                  <div key={skill.domain} className={`grid grid-cols-[140px_1fr_1fr_1fr_180px] ${i % 2 === 0 ? 'bg-white/80' : 'bg-warm-50'}`}>
                    <div className="p-3 font-bold text-accent-primary border-t border-warm-200 flex items-center">{skill.domain}</div>
                    <div className="p-3 border-t border-warm-200 leading-relaxed text-[11px] text-warm-700">{skill.junior || '—'}</div>
                    <div className="p-3 border-t border-warm-200 leading-relaxed text-[11px] text-warm-700 bg-[#fff8f0]/50">{skill.mid || '—'}</div>
                    <div className="p-3 border-t border-warm-200 leading-relaxed text-[11px] text-warm-700 bg-[#eef3f8]/50">{skill.senior || '—'}</div>
                    <div className="p-3 border-t border-warm-200 text-[10px] text-warm-600">
                      {skill.courses.slice(0, 2).join('、') || '—'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-warm-500 mr-2">关联实训室：</span>
                {featuredJob.labLinks.slice(0, 8).map(({ lab, level }) => (
                  <span key={lab} className="text-xs px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                    {level === 'core' ? '●' : level === 'important' ? '◐' : '○'} {lab.replace('实训室', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 师资概况 ── */}
          {slide.kind === 'faculty' && facultyData && (
            <div className="space-y-5">
              <h2 className="text-3xl font-bold text-gradient">师资队伍多维画像</h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '师资总数', value: facultyData.meta.total_teachers },
                  { label: '覆盖实训室', value: facultyData.meta.total_labs },
                  { label: '学院来源', value: (facultyData.stats.source as FacultyStatItem[])?.find(s => s.label === '学院')?.count ?? 0 },
                  { label: '企业来源', value: (facultyData.stats.source as FacultyStatItem[])?.find(s => s.label === '企业')?.count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="glass rounded-2xl p-6 text-center glow-warm">
                    <div className="text-4xl font-bold text-accent-primary">{value}</div>
                    <div className="text-sm text-warm-600 mt-2">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-5">
                <div className="glass rounded-2xl p-5">
                  <h3 className="text-sm text-warm-600 mb-3">来源维度</h3>
                  <Chart option={facultySourceChart} height={220} />
                </div>
                <div className="glass rounded-2xl p-5 col-span-2">
                  <h3 className="text-sm text-warm-600 mb-3">职称结构</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {((facultyData.stats.title_dim as FacultyStatItem[]) ?? []).slice(0, 6).map((t, i) => (
                      <div key={t.label} className="p-3 rounded-xl bg-warm-100 text-center">
                        <div className="text-2xl font-bold" style={{ color: FACULTY_CHART_COLORS[i % FACULTY_CHART_COLORS.length] }}>{t.count}</div>
                        <div className="text-xs text-warm-600 mt-1 leading-snug">{t.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {((facultyData.stats.level as FacultyStatItem[]) ?? []).map((t, i) => (
                      <div key={t.label} className="p-3 rounded-xl bg-warm-100 flex items-center justify-between">
                        <span className="text-sm text-warm-600">{t.label}级</span>
                        <span className="text-xl font-bold text-accent-primary">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 师资实训室覆盖 ── */}
          {slide.kind === 'faculty-labs' && facultyData && (
            <div className="grid grid-cols-5 gap-5">
              <div className="col-span-3 glass rounded-2xl p-5">
                <h2 className="text-xl font-bold text-warm-800 mb-1">师资实训室匹配</h2>
                <p className="text-sm text-warm-500 mb-4">各实训室可匹配师资数量（与课程体系标准名称一致）</p>
                <Chart option={facultyLabChart} height={380} />
              </div>
              <div className="col-span-2 glass rounded-2xl p-5">
                <h3 className="text-sm text-warm-600 mb-3">推荐方 TOP8</h3>
                <div className="space-y-2">
                  {((facultyData.stats.recommender as FacultyStatItem[]) ?? []).slice(0, 8).map((r, i) => (
                    <div key={r.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-warm-100">
                      <span className="text-sm font-bold text-accent-gold w-5">{i + 1}</span>
                      <span className="text-sm flex-1 truncate">{r.label}</span>
                      <span className="text-sm font-bold text-accent-primary">{r.count}人</span>
                    </div>
                  ))}
                </div>
                <h3 className="text-sm text-warm-600 mt-5 mb-3">专业领域 TOP6</h3>
                <div className="flex flex-wrap gap-2">
                  {((facultyData.stats.field as FacultyStatItem[]) ?? []).slice(0, 6).map((f) => (
                    <span key={f.label} className="px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-sm border border-accent-primary/20">
                      {f.label} <span className="text-warm-500">{f.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 优质师资 TOP10 ── */}
          {slide.kind === 'faculty-top' && facultyData && (
            <div className="space-y-5">
              <h2 className="text-3xl font-bold text-gradient">推荐优先级 TOP10 师资</h2>
              <div className="grid grid-cols-2 gap-4">
                {facultyData.top_priority.slice(0, 10).map((t) => (
                  <div key={t.rank} className="glass rounded-xl p-4 flex gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      (t.priority_score ?? 0) >= 60 ? 'bg-accent-primary/20 text-accent-primary' : 'bg-warm-200 text-warm-600'
                    }`}>
                      {t.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{t.name}</span>
                        {t.priority_score != null && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent-orange/15 text-accent-orange">{t.priority_score}分</span>
                        )}
                      </div>
                      <p className="text-xs text-warm-500 mt-1">{t.title_dim} · {t.source} · {t.recommender_type}</p>
                      <p className="text-xs text-warm-400 mt-1 truncate">{t.keywords}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 实训室详情 ── */}
          {slide.kind === 'lab' && lab && (() => {
            const labCourses = data.courses.filter((c) => c.lab_name === lab.name)
            const labTeachers = facultyData ? labFacultyRecommendations(teachers, lab.name, 6) : []
            return (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-accent-primary text-lg font-medium">
                    实训室 {slide.labIndex! + 1} / {labs.length}
                  </span>
                  <h2 className="text-3xl font-bold mt-1">{lab.name}</h2>
                  {lab.original_name && <p className="text-warm-500 mt-0.5 text-sm">{lab.original_name}</p>}
                </div>
                <div className="flex gap-6 text-right">
                  {facultyData && (
                    <div>
                      <div className="text-4xl font-bold text-accent-green tabular-nums">{facultyCountForLab(teachers, lab.name)}</div>
                      <div className="text-sm text-warm-500">匹配师资</div>
                    </div>
                  )}
                  <div>
                    <div className="text-4xl font-bold text-gradient tabular-nums">{lab.course_counts.total}</div>
                    <div className="text-sm text-warm-500">门课程</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {(['general', 'foundation', 'core', 'practice'] as const).map((t) => (
                  <div key={t} className="rounded-xl p-3 text-center bg-white/80 border border-warm-200/80">
                    <div className="text-2xl font-bold tabular-nums" style={{ color: TYPE_COLORS[t] }}>{lab.course_counts[t]}</div>
                    <div className="text-[11px] text-warm-600 mt-0.5">{TYPE_LABELS[t]}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 rounded-2xl p-4 bg-white/85 border border-warm-200/80 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-warm-700">核心课程</h3>
                    {lab.vendor_course_count > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange">含 {lab.vendor_course_count} 门厂商课</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {labCourses.slice(0, 9).map((c) => (
                      <div
                        key={c.id}
                        className={`p-2.5 rounded-lg bg-warm-50 border border-warm-100 ${c.is_vendor ? 'border-l-2 border-l-accent-orange' : ''}`}
                      >
                        <div className="text-[9px] text-warm-500 mb-0.5">{c.type_label}</div>
                        <div className="text-xs font-medium leading-snug line-clamp-2">{c.name}</div>
                      </div>
                    ))}
                  </div>
                  {labCourses.length > 9 && (
                    <p className="text-[10px] text-warm-400 mt-2 text-right">共 {labCourses.length} 门 · 其余课程可在系统中检索</p>
                  )}
                </div>

                <div className="col-span-2 rounded-2xl p-4 bg-white/85 border border-warm-200/80 shadow-sm flex flex-col min-h-[220px]">
                  <h3 className="text-sm font-semibold text-warm-700 mb-3 flex items-center gap-1.5">
                    <Users size={15} className="text-accent-green" />
                    师资推荐
                  </h3>
                  {labTeachers.length > 0 ? (
                    <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin pr-0.5">
                      {labTeachers.map((t) => (
                        <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-warm-50/80 border border-warm-100">
                          <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                            (t.priority_score ?? 0) >= 50 ? 'bg-accent-green/15 text-accent-green' : 'bg-warm-200/80 text-warm-600'
                          }`}>
                            {t.name.slice(0, 1)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-warm-900">{t.name}</span>
                              {t.priority_score != null && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-orange/12 text-accent-orange">{t.priority_score}分</span>
                              )}
                            </div>
                            <p className="text-[10px] text-warm-500 mt-0.5 truncate">{t.title_dim} · {t.source}</p>
                            <p className="text-[10px] text-warm-400 truncate">{t.field || t.keywords}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-warm-400 rounded-xl border border-dashed border-warm-200 bg-warm-50/50">
                      暂无匹配师资数据
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          })()}
        </div>
      </div>

      {/* 底栏 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-3 backdrop-blur-sm bg-white/50 border-t border-warm-200/60">
        <div className="flex gap-1.5 flex-wrap max-w-[70%]">
          {(['overview', 'vendor', 'shared'] as const).map((kind) => {
            const idx = slides.findIndex((s) => s.kind === kind)
            if (idx < 0) return null
            const labels: Record<string, string> = { overview: '总览', vendor: '厂商', shared: '共享' }
            return (
              <button
                key={kind}
                onClick={() => setSlideIndex(idx)}
                className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
                  slideIndex === idx ? 'bg-accent-primary text-white shadow-sm' : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
                }`}
              >
                {labels[kind]}
              </button>
            )
          })}
          {hasIntegrated && (
            <button
              type="button"
              onClick={() => {
                const idx = slides.findIndex((s) => s.kind === 'integrated')
                if (idx >= 0) setSlideIndex(idx)
              }}
              className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
                slide.kind === 'integrated'
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
              }`}
            >
              综合
            </button>
          )}
          {jobMapData && jobMapData.jobs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const idx = slides.findIndex((s) => s.kind === 'jobs')
                if (idx >= 0) setSlideIndex(idx)
              }}
              className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
                ['jobs', 'job-flow', 'jobs-feature'].includes(slide.kind)
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
              }`}
            >
              岗位
            </button>
          )}
          {facultyData && (
            <button
              onClick={() => setSlideIndex(slides.findIndex((s) => s.kind === 'faculty'))}
              className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
                ['faculty', 'faculty-labs', 'faculty-top'].includes(slide.kind)
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
              }`}
            >
              师资
            </button>
          )}
          <button
            onClick={() => {
              const idx = slides.findIndex((s) => s.kind === 'lab')
              if (idx >= 0) setSlideIndex(idx)
            }}
            className={`px-3 py-1 rounded-lg text-xs transition font-medium ${
              slide.kind === 'lab' ? 'bg-accent-primary text-white shadow-sm' : 'bg-white/70 text-warm-500 hover:text-warm-800 border border-warm-200/80'
            }`}
          >
            实训室{slide.kind === 'lab' ? ` ${slide.labIndex! + 1}/${labs.length}` : ''}
          </button>
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
