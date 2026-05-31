import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, BookOpen, Users, AlertTriangle, Briefcase, Building2,
  BarChart3, Target, Layers, ExternalLink, ChevronRight,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import type { Course } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import { selectClass, inputClass } from '../styles/form'
import {
  buildLabIntegrations,
  buildJobIntegrationRows,
  filterIntegrations,
  MATCH_COLORS,
  MATCH_LEVEL_OPTIONS,
  facultyCanTeachCourse,
  type LabIntegration,
} from '../utils/integrate'

type ViewMode = 'lab' | 'job' | 'element' | 'gap'

const VIEW_TABS: { id: ViewMode; label: string; icon: typeof Building2 }[] = [
  { id: 'lab', label: '实训室维度', icon: Building2 },
  { id: 'job', label: '岗位维度', icon: Briefcase },
  { id: 'element', label: '要素对比', icon: BarChart3 },
  { id: 'gap', label: '缺口诊断', icon: Target },
]

const TYPE_ORDER = ['general', 'foundation', 'core', 'practice'] as const

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function CoverageBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 60 ? 'bg-accent-green' : pct >= 30 ? 'bg-accent-orange' : 'bg-red-400'
  return (
    <div>
      <div className="flex justify-between text-[10px] text-warm-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-warm-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export default function IntegratedAnalysis() {
  const { data } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()

  const [view, setView] = useState<ViewMode>('lab')
  const [lab, setLab] = useState('')
  const [courseType, setCourseType] = useState('')
  const [facultySource, setFacultySource] = useState('')
  const [facultyLevel, setFacultyLevel] = useState('')
  const [matchLevel, setMatchLevel] = useState<LabIntegration['matchLevel'] | ''>('')
  const [q, setQ] = useState('')
  const [selectedLab, setSelectedLab] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyTeacher | null>(null)

  const integrations = useMemo(() => {
    if (!data) return []
    return buildLabIntegrations(data.labs, data.courses, facultyData?.teachers ?? [], {
      jobs: jobMapData?.jobs,
    })
  }, [data, facultyData, jobMapData])

  const filtered = useMemo(
    () => filterIntegrations(integrations, { lab, courseType, facultySource, facultyLevel, matchLevel, q }),
    [integrations, lab, courseType, facultySource, facultyLevel, matchLevel, q],
  )

  const activeLab = useMemo(() => {
    const name = selectedLab ?? lab
    if (!name) return null
    return filtered.find((i) => i.lab.name === name) ?? integrations.find((i) => i.lab.name === name) ?? null
  }, [selectedLab, lab, filtered, integrations])

  const jobRows = useMemo(() => {
    if (!jobMapData || !data) return []
    return buildJobIntegrationRows(
      jobMapData.jobs,
      jobMapData.labCourseRows,
      data.courses,
      facultyData?.teachers ?? [],
      data.labs,
    )
  }, [jobMapData, data, facultyData])

  const summary = useMemo(() => {
    const totalCourses = data?.meta.total_courses ?? 0
    const totalFaculty = facultyData?.meta.total_teachers ?? 0
    const totalJobs = jobMapData?.meta.total_jobs ?? 0
    const gapLabs = integrations.filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy').length
    const goodLabs = integrations.filter((i) => i.matchLevel === 'good' || i.matchLevel === 'faculty-heavy').length
    const avgCoverage = integrations.length
      ? Math.round(integrations.reduce((s, i) => s + i.strictCoveragePct, 0) / integrations.length)
      : 0
    const totalShared = integrations.reduce((s, i) => s + i.sharedCourseCount, 0)
    const vendorTotal = data?.meta.total_vendor_courses ?? 0
    return { totalCourses, totalFaculty, totalJobs, gapLabs, goodLabs, avgCoverage, totalShared, vendorTotal }
  }, [data, facultyData, jobMapData, integrations])

  const compareChart = useMemo(() => {
    const items = [...integrations]
      .filter((i) => i.courses.length > 0 || i.faculty.length > 0)
      .sort((a, b) => b.courses.length - a.courses.length)
      .slice(0, 14)
      .reverse()
    if (!items.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'axis' },
      legend: { data: ['课程', '师资', '关联岗位'], top: 0, textStyle: { color: WARM_CHART.muted, fontSize: 10 } },
      grid: { left: 120, right: 16, top: 36, bottom: 12 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 9, color: WARM_CHART.muted },
      },
      series: [
        { name: '课程', type: 'bar', data: items.map((i) => i.courses.length), itemStyle: { color: WARM_CHART.primary, borderRadius: [0, 2, 2, 0] } },
        { name: '师资', type: 'bar', data: items.map((i) => i.faculty.length), itemStyle: { color: WARM_CHART.nodeLab, borderRadius: [0, 2, 2, 0] } },
        { name: '关联岗位', type: 'bar', data: items.map((i) => i.jobCount), itemStyle: { color: '#b8860b', borderRadius: [0, 2, 2, 0] } },
      ],
    }
  }, [integrations])

  const matchStatusPie = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of integrations) {
      counts.set(i.matchLabel, (counts.get(i.matchLabel) ?? 0) + 1)
    }
    const data = [...counts.entries()].map(([name, value]) => ({ name, value }))
    if (!data.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '52%'],
        label: { fontSize: 10, color: WARM_CHART.muted },
        data,
      }],
    }
  }, [integrations])

  const coverageBarChart = useMemo(() => {
    const items = [...integrations]
      .filter((i) => i.courses.length > 0)
      .sort((a, b) => a.strictCoveragePct - b.strictCoveragePct)
      .slice(-12)
    if (!items.length) return {}
    return {
      ...warmChartBase(),
      grid: { left: 100, right: 16, top: 8, bottom: 8 },
      tooltip: { formatter: '{b}: {c}%' },
      xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 9, color: WARM_CHART.muted },
      },
      series: [{
        type: 'bar',
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

  const typeStackChart = useMemo(() => {
    const items = [...integrations].sort((a, b) => b.courses.length - a.courses.length).slice(0, 10).reverse()
    if (!items.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: TYPE_ORDER.map((t) => TYPE_LABELS[t]), top: 0, textStyle: { fontSize: 9, color: WARM_CHART.muted } },
      grid: { left: 100, right: 12, top: 32, bottom: 8 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((i) => shortLab(i.lab.name)),
        axisLabel: { fontSize: 9, color: WARM_CHART.muted },
      },
      series: TYPE_ORDER.map((t) => ({
        name: TYPE_LABELS[t],
        type: 'bar',
        stack: 'type',
        data: items.map((i) => i.courseTypes[t] ?? 0),
        itemStyle: { color: TYPE_COLORS[t] },
      })),
    }
  }, [integrations])

  const scatterChart = useMemo(() => {
    const items = integrations.filter((i) => i.courses.length > 0 || i.faculty.length > 0)
    if (!items.length) return {}
    return {
      ...warmChartBase(),
      tooltip: {
        formatter: (p: { data: number[]; name?: string }) => {
          const [x, y, jobs] = p.data
          return `${p.name}<br/>课程 ${x} · 师资 ${y}<br/>岗位 ${jobs}`
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 40 },
      xAxis: { name: '课程', nameLocation: 'middle', nameGap: 28, splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: { name: '师资', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      series: [{
        type: 'scatter',
        symbolSize: (val: number[]) => Math.max(12, Math.min(36, 8 + val[2] * 4)),
        data: items.map((i) => ({
          name: shortLab(i.lab.name),
          value: [i.courses.length, i.faculty.length, i.jobCount],
          itemStyle: {
            color: i.matchLevel === 'good' || i.matchLevel === 'faculty-heavy' ? WARM_CHART.nodeLab
              : i.matchLevel === 'gap' ? '#e57373' : WARM_CHART.primary,
            opacity: 0.85,
          },
        })),
      }],
    }
  }, [integrations])

  const gapItems = useMemo(
    () => integrations
      .filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy' || i.strictCoveragePct < 40)
      .sort((a, b) => a.strictCoveragePct - b.strictCoveragePct),
    [integrations],
  )

  const resetFilters = () => {
    setLab('')
    setCourseType('')
    setFacultySource('')
    setFacultyLevel('')
    setMatchLevel('')
    setQ('')
    setSelectedLab(null)
  }

  if (!data) return null

  const sourceOptions = facultyData
    ? [...new Set(facultyData.teachers.map((t) => t.source).filter(Boolean))]
    : []

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gradient">综合匹配分析</h1>
        <p className="text-warm-600 mt-1 text-sm">
          实训室 · 岗位 · 课程 · 师资 多维度联动 · {data.meta.total_labs} 实训室
          {facultyData ? ` · ${facultyData.meta.total_teachers} 师资` : ''}
          {jobMapData ? ` · ${jobMapData.meta.total_jobs} 岗位` : ''}
        </p>
      </header>

      {!facultyData && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 border border-accent-orange/30 bg-accent-orange/5">
          <AlertTriangle className="text-accent-orange shrink-0" size={20} />
          <p className="text-sm text-warm-700">师资数据未加载，课师映射与师资维度分析不可用。请前往「数据管理」上传师资 Excel。</p>
        </div>
      )}

      {!jobMapData && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 border border-warm-300">
          <Briefcase className="text-warm-500 shrink-0" size={20} />
          <p className="text-sm text-warm-600">岗位映射未加载，岗位维度与关联岗位统计不可用。请上传岗位 Excel 或放置 jobs.xlsx。</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: '课程', value: summary.totalCourses, color: 'text-accent-primary' },
          { label: '师资', value: facultyData ? summary.totalFaculty : '—', color: 'text-accent-green' },
          { label: '岗位', value: jobMapData ? summary.totalJobs : '—', color: 'text-warm-800' },
          { label: '厂商课', value: summary.vendorTotal, color: 'text-accent-orange' },
          { label: '匹配良好', value: facultyData ? summary.goodLabs : '—', color: 'text-accent-green' },
          { label: '待关注', value: facultyData ? summary.gapLabs : '—', color: 'text-accent-orange' },
          { label: '平均课师映射', value: facultyData ? `${summary.avgCoverage}%` : '—', color: 'text-accent-primary' },
          { label: '复用课程', value: summary.totalShared, color: 'text-warm-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-warm-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <nav className="flex flex-wrap gap-2 p-1 rounded-xl bg-warm-100/80 border border-warm-300 w-fit">
        {VIEW_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === id
                ? 'bg-white text-accent-primary shadow-sm border border-accent-primary/20'
                : 'text-warm-600 hover:text-warm-900 hover:bg-warm-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索课程、厂商、师资、专业领域…"
            className={`${inputClass} pl-10 rounded-xl`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={lab} onChange={(e) => { setLab(e.target.value); setSelectedLab(e.target.value || null) }} className={selectClass}>
            <option value="">全部实训室</option>
            {data.labs.map((l) => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
          <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className={selectClass}>
            <option value="">全部课程类型</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={matchLevel} onChange={(e) => setMatchLevel(e.target.value as LabIntegration['matchLevel'] | '')} className={selectClass}>
            {MATCH_LEVEL_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          {facultyData && (
            <>
              <select value={facultySource} onChange={(e) => setFacultySource(e.target.value)} className={selectClass}>
                <option value="">全部师资来源</option>
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={facultyLevel} onChange={(e) => setFacultyLevel(e.target.value)} className={selectClass}>
                <option value="">全部师资级别</option>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </>
          )}
          <button type="button" onClick={resetFilters} className="px-3 py-2 rounded-lg text-sm glass text-warm-600 hover:text-warm-900">
            重置
          </button>
        </div>
      </div>

      {view === 'lab' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-300">
              <h3 className="text-sm font-semibold text-warm-700">实训室要素匹配总览</h3>
              <p className="text-xs text-warm-500">点击行查看详情 · 含岗位关联与课师映射率</p>
            </div>
            <div className="overflow-x-auto max-h-[440px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-warm-50/95 backdrop-blur z-10">
                  <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                    <th className="p-2.5">实训室</th>
                    <th className="p-2.5">课程</th>
                    <th className="p-2.5">师资</th>
                    <th className="p-2.5">岗位</th>
                    <th className="p-2.5">课师映射</th>
                    <th className="p-2.5">厂商课</th>
                    <th className="p-2.5">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.lab.id}
                      onClick={() => setSelectedLab(item.lab.name)}
                      className={`border-b border-warm-200 cursor-pointer transition text-xs ${
                        (selectedLab ?? lab) === item.lab.name ? 'bg-accent-primary/10' : 'hover:bg-warm-100'
                      }`}
                    >
                      <td className="p-2.5 font-medium max-w-[180px]">
                        <span className="text-warm-400 mr-1">#{item.lab.id}</span>
                        {shortLab(item.lab.name)}
                      </td>
                      <td className="p-2.5 text-accent-primary font-bold">{item.courses.length}</td>
                      <td className="p-2.5 text-accent-green font-bold">{item.faculty.length}</td>
                      <td className="p-2.5 text-warm-700">{item.jobCount || '—'}</td>
                      <td className="p-2.5">
                        <span className={item.strictCoveragePct >= 60 ? 'text-accent-green' : item.strictCoveragePct >= 30 ? 'text-accent-orange' : 'text-red-500'}>
                          {facultyData ? `${item.strictCoveragePct}%` : '—'}
                        </span>
                      </td>
                      <td className="p-2.5 text-warm-600">{item.vendorCourses}</td>
                      <td className="p-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${MATCH_COLORS[item.matchLevel]}`}>
                          {item.matchLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm text-warm-600 mb-2">课程 · 师资 · 岗位对比</h3>
              <Chart option={compareChart} height={200} />
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm text-warm-600 mb-2">匹配状态分布</h3>
              <Chart option={matchStatusPie} height={180} />
            </div>
          </div>
        </div>
      )}

      {view === 'job' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-300 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-warm-700">岗位培养资源完备度</h3>
              <p className="text-xs text-warm-500">岗位 → 实训室 → 课程入库率 → 师资覆盖</p>
            </div>
            <Link to="/jobs" className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1">
              岗位图谱 <ExternalLink size={12} />
            </Link>
          </div>
          {!jobMapData ? (
            <p className="p-8 text-center text-warm-500 text-sm">请先加载岗位映射数据</p>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-warm-50/95 backdrop-blur">
                  <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                    <th className="p-3">岗位</th>
                    <th className="p-3">大类</th>
                    <th className="p-3">实训室</th>
                    <th className="p-3">推荐课程</th>
                    <th className="p-3">已入库</th>
                    <th className="p-3">师资</th>
                    <th className="p-3">完备度</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((row) => (
                    <tr key={row.job.name} className="border-b border-warm-200 hover:bg-warm-50 text-xs">
                      <td className="p-3 font-medium">
                        <Link to="/jobs" className="text-accent-primary hover:underline">{row.job.name}</Link>
                      </td>
                      <td className="p-3 text-warm-600">{row.job.category}</td>
                      <td className="p-3">{row.labCount}</td>
                      <td className="p-3">{row.courseNames}</td>
                      <td className="p-3 text-accent-primary font-medium">{row.matchedCourses}</td>
                      <td className="p-3 text-accent-green">{row.facultyCount}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full bg-warm-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.completenessPct >= 70 ? 'bg-accent-green' : row.completenessPct >= 40 ? 'bg-accent-orange' : 'bg-red-400'}`}
                              style={{ width: `${row.completenessPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-warm-500 w-8">{row.completenessPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'element' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-1">课程 × 师资 散点分布</h3>
            <p className="text-[11px] text-warm-500 mb-2">气泡大小 = 关联岗位数 · 颜色反映匹配状态</p>
            <Chart option={scatterChart} height={280} />
          </div>
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-1">课师映射覆盖率</h3>
            <p className="text-[11px] text-warm-500 mb-2">有明确可授教师的课程占比（capable_courses 匹配）</p>
            <Chart option={coverageBarChart} height={280} />
          </div>
          <div className="col-span-2 glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-1">课程类型结构（TOP 10 实训室）</h3>
            <Chart option={typeStackChart} height={260} />
          </div>
        </div>
      )}

      {view === 'gap' && (
        <div className="space-y-3">
          <p className="text-sm text-warm-600">
            共 {gapItems.length} 个实训室存在师资缺口、课程偏重或课师映射偏弱（&lt;40%），建议优先改善。
          </p>
          {gapItems.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-accent-green text-sm">当前无明显缺口项，整体匹配良好</div>
          ) : (
            gapItems.map((item) => (
              <button
                key={item.lab.id}
                type="button"
                onClick={() => { setSelectedLab(item.lab.name); setView('lab') }}
                className="w-full text-left glass rounded-xl p-4 border border-warm-300 hover:border-accent-primary/30 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-warm-900">{item.lab.name}</p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border ${MATCH_COLORS[item.matchLevel]}`}>
                      {item.matchLabel}
                    </span>
                  </div>
                  <ChevronRight className="text-warm-400 shrink-0" size={18} />
                </div>
                <div className="grid sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <div><span className="text-warm-500">课程</span> <strong>{item.courses.length}</strong></div>
                  <div><span className="text-warm-500">师资</span> <strong className="text-accent-green">{item.faculty.length}</strong></div>
                  <div><span className="text-warm-500">课师映射</span> <strong>{item.strictCoveragePct}%</strong></div>
                  <div><span className="text-warm-500">关联岗位</span> <strong>{item.jobCount}</strong></div>
                </div>
                <ul className="mt-2 text-[11px] text-warm-600 space-y-0.5 list-disc list-inside">
                  {item.faculty.length < 3 && item.courses.length >= 10 && (
                    <li>师资仅 {item.faculty.length} 人，难以覆盖 {item.courses.length} 门课程</li>
                  )}
                  {item.strictCoveragePct < 40 && facultyData && (
                    <li>仅 {item.strictCoveragePct}% 课程有明确可授教师，建议补充 capable_courses 映射</li>
                  )}
                  {item.vendorRatioPct > 50 && (
                    <li>厂商课占比 {item.vendorRatioPct}%，需关注高校师资对厂商课的承接能力</li>
                  )}
                  {item.jobCount > 0 && item.strictCoveragePct < 50 && (
                    <li>关联 {item.jobCount} 个岗位，但课师映射偏弱，影响岗位培养落地</li>
                  )}
                </ul>
              </button>
            ))
          )}
        </div>
      )}

      {activeLab && (
        <div className="glass rounded-2xl p-5 space-y-4 animate-fade-in-up border border-accent-primary/15">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers size={20} className="text-accent-primary" />
                {activeLab.lab.name}
              </h2>
              <p className="text-sm text-warm-600 mt-1">
                {activeLab.courses.length} 门课程 · {activeLab.faculty.length} 位师资 · {activeLab.vendorCourses} 门厂商课
                {activeLab.jobCount > 0 && ` · ${activeLab.jobCount} 个关联岗位`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-sm px-3 py-1 rounded-lg border ${MATCH_COLORS[activeLab.matchLevel]}`}>{activeLab.matchLabel}</span>
              <Link to={`/labs/${activeLab.lab.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-warm-100 text-accent-primary hover:bg-warm-200 inline-flex items-center gap-1">
                实训室详情 <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <CoverageBar pct={activeLab.strictCoveragePct} label="课师映射覆盖率" />
            <CoverageBar pct={activeLab.vendorRatioPct} label="厂商课占比" />
            <CoverageBar
              pct={activeLab.courses.length ? Math.min(100, Math.round((activeLab.faculty.length / activeLab.courses.length) * 100)) : 0}
              label="师资/课程比（×100）"
            />
          </div>

          {activeLab.linkedJobs.length > 0 && (
            <div>
              <p className="text-xs text-warm-500 mb-2">关联岗位</p>
              <div className="flex flex-wrap gap-1.5">
                {activeLab.linkedJobs.map((j) => (
                  <Link
                    key={j}
                    to="/jobs"
                    className="text-[11px] px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/15 hover:bg-accent-primary/15"
                  >
                    {j}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {Object.keys(activeLab.courseTypes).length > 0 && (
            <div>
              <p className="text-xs text-warm-500 mb-2">课程类型构成</p>
              <div className="flex h-2 rounded-full overflow-hidden">
                {TYPE_ORDER.map((t) => {
                  const n = activeLab.courseTypes[t] ?? 0
                  if (!n) return null
                  const total = activeLab.courses.length || 1
                  return (
                    <div key={t} style={{ width: `${(n / total) * 100}%`, backgroundColor: TYPE_COLORS[t] }} title={`${TYPE_LABELS[t]}: ${n}`} />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-warm-600">
                {TYPE_ORDER.map((t) => {
                  const n = activeLab.courseTypes[t] ?? 0
                  if (!n) return null
                  return (
                    <span key={t} className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_COLORS[t] }} />
                      {TYPE_LABELS[t].replace('专业', '')} {n}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {Object.keys(activeLab.facultyBySource).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeLab.facultyBySource).map(([src, cnt]) => (
                <span key={src} className="text-xs px-2 py-1 rounded-lg bg-warm-100 text-warm-700">{src} {cnt}人</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-warm-700 mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-accent-primary" />
                课程 ({activeLab.courses.length})
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                {activeLab.courses.length === 0 ? (
                  <p className="text-sm text-warm-400 py-4 text-center">无课程</p>
                ) : activeLab.courses.map((c) => {
                  const hasTeacher = facultyData && activeLab.faculty.some((t) => facultyCanTeachCourse(c, t))
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourse(c)}
                      className={`w-full text-left p-3 rounded-xl bg-warm-100 hover:bg-warm-200 transition border-l-2 ${
                        c.is_vendor ? 'border-l-accent-orange' : 'border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-warm-500">{c.type_label}</span>
                        {c.is_vendor && <span className="text-[10px] text-accent-orange">厂商</span>}
                        {hasTeacher && <span className="text-[10px] text-accent-green">有授课师资</span>}
                        {!hasTeacher && facultyData && <span className="text-[10px] text-warm-400">待匹配师资</span>}
                      </div>
                      <div className="text-sm font-medium truncate">{c.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-warm-700 mb-2 flex items-center gap-2">
                <Users size={16} className="text-accent-green" />
                师资 ({activeLab.faculty.length})
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                {!facultyData ? (
                  <p className="text-sm text-warm-400 py-4 text-center">请先上传师资 Excel</p>
                ) : activeLab.faculty.length === 0 ? (
                  <p className="text-sm text-warm-400 py-4 text-center">无师资</p>
                ) : activeLab.faculty.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedFaculty(t)}
                    className="w-full text-left p-3 rounded-xl bg-warm-100 hover:bg-warm-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{t.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        t.level === '高' ? 'bg-accent-primary/15 text-accent-primary' : 'bg-warm-200 text-warm-600'
                      }`}>{t.level}</span>
                    </div>
                    <p className="text-xs text-warm-500 mt-0.5 truncate">{t.title_dim} · {t.source}</p>
                    <p className="text-[10px] text-warm-400 truncate">{t.field}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} />

      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedFaculty(null)}>
          <div className="absolute inset-0 bg-warm-900/20 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md h-full glass border-l border-warm-300 overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setSelectedFaculty(null)} className="absolute top-4 right-4 text-warm-500">✕</button>
            <h2 className="text-xl font-bold pr-8">{selectedFaculty.name}</h2>
            <p className="text-sm text-warm-600 mt-1">{selectedFaculty.title_dim} · {selectedFaculty.source}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-warm-500">专业领域：</span>{selectedFaculty.field}</p>
              <p><span className="text-warm-500">匹配实训室：</span>{selectedFaculty.matched_lab_count} 个</p>
              <p><span className="text-warm-500">推荐优先级：</span>{selectedFaculty.priority_score != null ? `${selectedFaculty.priority_score} 分` : '—'}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedFaculty.lab_list.map((l) => (
                <span key={l} className="text-xs px-2 py-1 rounded-lg bg-accent-green/10 text-accent-green border border-accent-green/20">{l}</span>
              ))}
            </div>
            {selectedFaculty.capable_courses && (
              <div className="mt-4">
                <p className="text-xs text-warm-500 mb-1">可授课程</p>
                <p className="text-xs text-warm-700 leading-relaxed">{selectedFaculty.capable_courses}</p>
              </div>
            )}
            {selectedFaculty.keywords && (
              <p className="mt-4 text-xs text-warm-600 leading-relaxed">{selectedFaculty.keywords}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
