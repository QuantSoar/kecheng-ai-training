import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useData } from '../context/DataContext'
import CourseCard from '../components/CourseCard'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import type { Course } from '../types'
import { TYPE_COLORS, TYPE_LABELS } from '../types'

const TYPE_ORDER = ['general', 'foundation', 'core', 'practice'] as const

export default function LabDetail() {
  const { id } = useParams()
  const { data } = useData()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Course | null>(null)

  const lab = useMemo(() => {
    if (!data || !id) return null
    return data.labs.find((l) => String(l.id) === id)
  }, [data, id])

  const courses = useMemo(() => {
    if (!data || !lab) return []
    let list = data.courses.filter((c) => c.lab_name === lab.name)
    if (typeFilter !== 'all') list = list.filter((c) => c.type === typeFilter)
    return list
  }, [data, lab, typeFilter])

  const funnelChart = useMemo(() => {
    if (!lab) return {}
    const c = lab.course_counts
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' },
      series: [{
        type: 'funnel',
        left: '10%',
        width: '80%',
        sort: 'none',
        gap: 4,
        label: { color: WARM_CHART.text, fontSize: 12 },
        data: TYPE_ORDER.map((t) => ({
          name: `${TYPE_LABELS[t]} (${c[t]})`,
          value: c[t] || 0,
          itemStyle: { color: TYPE_COLORS[t] },
        })).filter((d) => d.value > 0),
      }],
    }
  }, [lab])

  if (!data || !lab) {
    return <div className="text-center py-20 text-warm-600">实训室不存在</div>
  }

  return (
    <div className="space-y-6">
      <Link to="/labs" className="inline-flex items-center gap-2 text-sm text-warm-600 hover:text-accent-primary transition">
        <ArrowLeft size={16} /> 返回实训室列表
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <span className="text-sm text-accent-primary">#{lab.id}</span>
          <h1 className="text-2xl font-bold mt-1">{lab.name}</h1>
          {lab.original_name && <p className="text-sm text-warm-500 mt-1">{lab.original_name}</p>}
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-gradient">{lab.course_counts.total}</div>
          <div className="text-sm text-warm-500">门课程 · 厂商 {lab.vendor_course_count} 门</div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 grid grid-cols-4 gap-3">
          {TYPE_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
              className={`glass rounded-xl p-4 text-center transition ${
                typeFilter === t ? 'border-accent-primary/40 bg-accent-primary/10' : ''
              }`}
            >
              <div className="text-2xl font-bold" style={{ color: TYPE_COLORS[t] }}>
                {lab.course_counts[t]}
              </div>
              <div className="text-xs text-warm-600 mt-1">{TYPE_LABELS[t]}</div>
            </button>
          ))}
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs text-warm-500 mb-2">课程层次漏斗</h3>
          <Chart option={funnelChart} height={180} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <FilterBtn active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>全部</FilterBtn>
        {TYPE_ORDER.map((t) => (
          <FilterBtn key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
            {TYPE_LABELS[t]}
          </FilterBtn>
        ))}
        <FilterBtn active={typeFilter === 'vendor'} onClick={() => setTypeFilter(typeFilter === 'vendor' ? 'all' : 'vendor')}>
          仅厂商课
        </FilterBtn>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(typeFilter === 'vendor'
          ? data.courses.filter((c) => c.lab_name === lab.name && c.is_vendor)
          : courses
        ).map((c) => (
          <CourseCard key={c.id} course={c} onClick={() => setSelected(c)} />
        ))}
      </div>

      <CourseDetailDrawer course={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition ${
        active ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/40' : 'glass text-warm-600 hover:text-warm-900'
      }`}
    >
      {children}
    </button>
  )
}
