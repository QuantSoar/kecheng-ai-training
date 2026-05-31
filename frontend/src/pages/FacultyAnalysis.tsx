import { useMemo, useState } from 'react'
import { Users, Building2, Award, TrendingUp, Search, ChevronDown, ChevronRight } from 'lucide-react'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import { useFaculty } from '../context/FacultyContext'
import { FACULTY_CHART_COLORS, FACULTY_DIM_OPTIONS } from '../types/faculty'
import type { FacultyStatItem, FacultyTeacher } from '../types/faculty'
import { selectClass, inputClass } from '../styles/form'

function isStatItems(items: unknown): items is FacultyStatItem[] {
  return Array.isArray(items) && items.length > 0 && 'label' in items[0]
}

function isLabStats(items: unknown): items is { lab: string; count: number; ratio: number }[] {
  return Array.isArray(items) && items.length > 0 && 'lab' in items[0]
}

export default function FacultyAnalysis() {
  const { data, loading, error } = useFaculty()
  const [dimension, setDimension] = useState('source')
  const [filterSource, setFilterSource] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<FacultyTeacher | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)

  const dimStats = useMemo(() => {
    if (!data) return []
    const raw = data.stats[dimension]
    if (!isStatItems(raw)) return []
    return raw
  }, [data, dimension])

  const labStats = useMemo(() => {
    if (!data) return []
    const computed = data.stats.lab_match
    const raw = isLabStats(computed) ? computed : []
    return raw.filter((d) => d.count > 0).slice(0, 15)
  }, [data])

  const pieChart = useMemo(() => {
    if (!dimStats.length) return {}
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 10, color: WARM_CHART.muted } },
      series: [{
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 4, borderColor: WARM_CHART.pieBorder, borderWidth: 2 },
        label: { color: WARM_CHART.muted, fontSize: 10 },
        data: dimStats.map((d, i) => ({
          name: d.label,
          value: d.count,
          itemStyle: { color: FACULTY_CHART_COLORS[i % FACULTY_CHART_COLORS.length] },
        })),
      }],
    }
  }, [dimStats])

  const barChart = useMemo(() => {
    if (!dimStats.length) return {}
    const items = [...dimStats].sort((a, b) => b.count - a.count)
    return {
      ...warmChartBase(),
      grid: { left: 120, right: 20, top: 10, bottom: 20 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((d) => d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label).reverse(),
        axisLabel: { color: WARM_CHART.muted, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: items.map((d) => d.count).reverse(),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
            { offset: 0, color: WARM_CHART.primary },
            { offset: 1, color: WARM_CHART.secondary },
          ]},
        },
      }],
    }
  }, [dimStats])

  const labBarChart = useMemo(() => {
    if (!labStats.length) return {}
    const items = [...labStats].reverse()
    return {
      ...warmChartBase(),
      grid: { left: 140, right: 20, top: 10, bottom: 20 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((d) => d.lab.replace('实训室', '').replace('实验室', '')),
        axisLabel: { color: WARM_CHART.muted, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: items.map((d) => d.count),
        itemStyle: { color: WARM_CHART.nodeLab, borderRadius: [0, 4, 4, 0] },
      }],
    }
  }, [labStats])

  const filteredTeachers = useMemo(() => {
    if (!data) return []
    let list = data.teachers
    if (filterSource) list = list.filter((t) => t.source === filterSource)
    if (filterLevel) list = list.filter((t) => t.level === filterLevel)
    if (q) {
      const lower = q.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.keywords.toLowerCase().includes(lower) ||
          t.field.toLowerCase().includes(lower) ||
          t.recommender.toLowerCase().includes(lower),
      )
    }
    return list
  }, [data, filterSource, filterLevel, q])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-gradient">师资多维分析</h1>
          <p className="text-warm-600 mt-2">请前往「数据管理」下载师资模板填写后上传，或将 xlsx 放到 data/ 目录后重新加载</p>
        </header>
        {error && (
          <div className="glass rounded-xl p-4 text-sm text-warm-600 border border-warm-300">
            {error !== 'Not Found' ? error : '尚未加载师资数据'}
          </div>
        )}
      </div>
    )
  }

  const dimLabel = FACULTY_DIM_OPTIONS.find((d) => d.key === dimension)?.label ?? dimension
  const sourceOptions = (data.stats.source as FacultyStatItem[] | undefined) ?? []

  const kpis = [
    { label: '师资总数', value: data.meta.total_teachers, icon: Users, color: 'text-accent-primary' },
    { label: '覆盖实训室', value: data.meta.total_labs, icon: Building2, color: 'text-accent-green' },
    { label: '企业来源', value: sourceOptions.find((s) => s.label === '企业')?.count ?? '—', icon: TrendingUp, color: 'text-accent-orange' },
    { label: 'TOP 推荐', value: data.top_priority.filter((t) => (t.priority_score ?? 0) >= 60).length, icon: Award, color: 'text-accent-gold' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gradient">师资多维分析</h1>
        <p className="text-warm-600 mt-1">
          {data.meta.total_teachers} 位师资 · 覆盖 {data.meta.total_labs} 个实训室
          {data.meta.source_file && <span className="text-warm-400"> · {data.meta.source_file}</span>}
        </p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5 glow-warm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-600">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <Icon className={`${color} opacity-40`} size={32} />
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-warm-600">分析维度：</span>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className={selectClass}
          >
            {FACULTY_DIM_OPTIONS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <span className="text-xs text-warm-400 ml-auto">{dimLabel} · 共 {dimStats.length} 个分类</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm text-warm-600 mb-2">{dimLabel}分布（饼图）</h3>
            <Chart option={pieChart} height={300} />
          </div>
          <div>
            <h3 className="text-sm text-warm-600 mb-2">{dimLabel}分布（柱状图）</h3>
            <Chart option={barChart} height={300} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm text-warm-600 mb-3">实训室师资匹配 TOP15</h3>
          <Chart option={labBarChart} height={380} />
        </div>
        <div className="glass rounded-2xl p-5 overflow-hidden">
          <h3 className="text-sm text-warm-600 mb-3">推荐优先级 TOP20</h3>
          <div className="overflow-y-auto max-h-[380px] scrollbar-thin space-y-2">
            {data.top_priority.slice(0, 20).map((t) => (
              <div
                key={t.rank}
                className="flex items-start gap-3 p-3 rounded-xl bg-warm-100 hover:bg-warm-200 transition cursor-pointer"
                onClick={() => setSelected(data.teachers.find((x) => x.name === t.name) ?? null)}
              >
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  (t.priority_score ?? 0) >= 60 ? 'bg-accent-primary/20 text-accent-primary' : 'bg-warm-200 text-warm-600'
                }`}>
                  {t.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-[10px] text-accent-orange shrink-0">{t.priority_score != null ? `${t.priority_score}分` : ''}</span>
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5 truncate">{t.title_dim} · {t.source} · {t.recommender_type}</p>
                  <p className="text-[10px] text-warm-400 mt-1 truncate">{t.keywords}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDetailOpen((open) => !open)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-warm-100/60 transition border-b border-warm-300/80"
        >
          <div className="flex items-center gap-2">
            {detailOpen ? (
              <ChevronDown size={18} className="text-warm-500 shrink-0" />
            ) : (
              <ChevronRight size={18} className="text-warm-500 shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-warm-700">师资明细</h3>
            <span className="text-xs text-warm-400">共 {filteredTeachers.length} 人 · 点击{detailOpen ? '收起' : '展开'}</span>
          </div>
          {!detailOpen && (
            <span className="text-[11px] text-warm-500 hidden sm:inline">姓名 / 来源 / 职称 / 学历 / 推荐方 / 匹配实训室等</span>
          )}
        </button>

        {detailOpen && (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索姓名、关键词、领域、推荐方..."
                  className={`${inputClass} pl-9 py-2 text-sm`}
                />
              </div>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className={selectClass}>
                <option value="">全部来源</option>
                {sourceOptions.map((s) => (
                  <option key={s.label} value={s.label}>{s.label} ({s.count})</option>
                ))}
              </select>
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className={selectClass}>
                <option value="">全部级别</option>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-warm-300 text-warm-500 text-left text-xs">
                    <th className="p-2 w-8" />
                    <th className="p-2">姓名</th>
                    <th className="p-2">来源</th>
                    <th className="p-2">职称</th>
                    <th className="p-2">级别</th>
                    <th className="p-2">学历</th>
                    <th className="p-2">经验</th>
                    <th className="p-2">专业领域</th>
                    <th className="p-2">推荐方</th>
                    <th className="p-2">厂商认证</th>
                    <th className="p-2">可用性</th>
                    <th className="p-2">匹配室</th>
                    <th className="p-2">优先级</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.slice(0, 100).map((t) => {
                    const isExpanded = expandedRowId === t.id
                    return (
                      <TeacherRow
                        key={t.id}
                        teacher={t}
                        expanded={isExpanded}
                        onToggle={() => setExpandedRowId(isExpanded ? null : t.id)}
                      />
                    )
                  })}
                </tbody>
              </table>
              {filteredTeachers.length > 100 && (
                <p className="p-2 text-center text-xs text-warm-400">仅显示前 100 条，请缩小筛选范围</p>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-warm-900/20 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg h-full glass border-l border-warm-300 overflow-y-auto p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-warm-500 hover:text-warm-900">✕</button>
            <h2 className="text-xl font-bold pr-8">{selected.name}</h2>
            <p className="text-sm text-warm-600 mt-1">{selected.title_dim} · {selected.source} · {selected.level}级</p>
            {selected.priority_score != null && (
              <p className="text-sm text-accent-primary mt-2">推荐优先级：{selected.priority_score} 分</p>
            )}
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['学历', selected.education],
                ['毕业院校', selected.university],
                ['专业', selected.major],
                ['推荐方', `${selected.recommender_type} / ${selected.recommender}`],
                ['专业领域', selected.field],
                ['核心关键词', selected.keywords],
                ['费用等级', selected.fee_level],
                ['可用性', selected.availability],
                ['合作模式', selected.cooperation_mode],
              ].map(([k, v]) => v ? (
                <div key={k as string}>
                  <span className="text-warm-500">{k}：</span>
                  <span className="text-warm-800">{v}</span>
                </div>
              ) : null)}
            </div>
            {selected.lab_list.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-warm-500 mb-2">匹配实训室（{selected.matched_lab_count}）</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.lab_list.map((lab) => (
                    <span key={lab} className="text-xs px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                      {lab}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selected.bio && (
              <div className="mt-4">
                <p className="text-sm text-warm-500 mb-1">讲师简介</p>
                <p className="text-xs text-warm-700 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">{selected.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LevelBadge({ level }: { level: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${
        level === '高'
          ? 'bg-accent-primary/15 text-accent-primary'
          : level === '中'
            ? 'bg-accent-gold/15 text-accent-gold'
            : 'bg-warm-200 text-warm-600'
      }`}
    >
      {level || '—'}
    </span>
  )
}

function TeacherRow({
  teacher: t,
  expanded,
  onToggle,
}: {
  teacher: FacultyTeacher
  expanded: boolean
  onToggle: () => void
}) {
  const recommender = [t.recommender_type, t.recommender].filter(Boolean).join(' / ') || '—'
  const cert = t.vendor_cert || t.cert_category || '—'

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-warm-200 cursor-pointer transition ${
          expanded ? 'bg-accent-primary/5' : 'hover:bg-warm-100'
        }`}
      >
        <td className="p-2 text-warm-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="p-2 font-medium whitespace-nowrap">{t.name}</td>
        <td className="p-2 text-warm-600 whitespace-nowrap">{t.source || '—'}</td>
        <td className="p-2 text-warm-600 max-w-[100px] truncate" title={t.title_dim}>{t.title_dim || '—'}</td>
        <td className="p-2"><LevelBadge level={t.level} /></td>
        <td className="p-2 text-warm-600 whitespace-nowrap">{t.education || '—'}</td>
        <td className="p-2 text-warm-600 max-w-[80px] truncate" title={t.experience_simple || t.experience}>
          {t.experience_simple || t.experience || '—'}
        </td>
        <td className="p-2 text-warm-600 max-w-[90px] truncate" title={t.field}>{t.field || '—'}</td>
        <td className="p-2 text-warm-600 max-w-[90px] truncate" title={recommender}>{recommender}</td>
        <td className="p-2 text-warm-600 max-w-[80px] truncate" title={cert}>{cert}</td>
        <td className="p-2 text-warm-600 whitespace-nowrap">{t.availability || '—'}</td>
        <td className="p-2 text-accent-primary text-center">{t.matched_lab_count}</td>
        <td className="p-2 text-warm-600 whitespace-nowrap">
          {t.priority_score != null ? `${t.priority_score}分` : t.priority_label || '—'}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-warm-200 bg-warm-50/80">
          <td colSpan={13} className="p-4">
            <TeacherDetailPanel teacher={t} />
          </td>
        </tr>
      )}
    </>
  )
}

function TeacherDetailPanel({ teacher: t }: { teacher: FacultyTeacher }) {
  const fields: [string, string][] = [
    ['性别', t.gender],
    ['毕业院校', t.university],
    ['专业', t.major],
    ['职级', t.title_level],
    ['核心能力', t.ability],
    ['技术方向', t.tech_direction],
    ['关键词', t.keywords],
    ['费用等级', t.fee_level],
    ['合作模式', t.cooperation_mode],
    ['教学管理', t.teaching_mgmt],
    ['可授课程', t.capable_courses],
    ['教师资格证', t.teacher_cert],
    ['备注', t.note],
  ].filter(([, v]) => v?.trim()) as [string, string][]

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-warm-800">{t.name}</span>
        {t.priority_label && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary">
            {t.priority_label}
          </span>
        )}
        {t.priority_score != null && (
          <span className="text-xs text-accent-orange">{t.priority_score} 分</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <span className="text-warm-500">{label}：</span>
            <span className="text-warm-800 break-words">{value}</span>
          </div>
        ))}
      </div>

      {t.lab_list.length > 0 && (
        <div>
          <p className="text-xs text-warm-500 mb-1.5">匹配实训室（{t.matched_lab_count}）</p>
          <div className="flex flex-wrap gap-1.5">
            {t.lab_list.map((lab) => (
              <span
                key={lab}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
              >
                {lab.replace('实训室', '').replace('实验室', '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {t.bio && (
        <div>
          <p className="text-xs text-warm-500 mb-1">讲师简介</p>
          <p className="text-xs text-warm-700 leading-relaxed bg-warm-100/80 p-3 rounded-lg max-h-32 overflow-y-auto scrollbar-thin">
            {t.bio}
          </p>
        </div>
      )}
    </div>
  )
}
