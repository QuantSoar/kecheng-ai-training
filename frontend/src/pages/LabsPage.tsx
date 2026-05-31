import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import LabOverviewCharts from '../components/LabOverviewCharts'
import { TYPE_COLORS, TYPE_LABELS } from '../types'

export default function LabsPage() {
  const { data } = useData()
  const navigate = useNavigate()
  if (!data) return null

  return (
    <div className="space-y-6">
      <LabOverviewCharts />

      <div className="grid grid-cols-2 gap-4">
        {data.labs.map((lab) => {
          const c = lab.course_counts
          const total = c.total || 1
          return (
            <button
              key={lab.id}
              onClick={() => navigate(`/labs/${lab.id}`)}
              className="glass rounded-2xl p-5 text-left hover:border-accent-primary/30 transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs text-accent-primary">#{lab.id}</span>
                  <h2 className="text-lg font-bold mt-1 group-hover:text-accent-primary transition">{lab.name}</h2>
                  {lab.original_name && (
                    <p className="text-xs text-warm-400 mt-1">{lab.original_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gradient">{c.total}</div>
                  <div className="text-xs text-warm-500">门课程</div>
                </div>
              </div>

              <div className="flex h-2 rounded-full overflow-hidden mb-3">
                {(['general', 'foundation', 'core', 'practice'] as const).map((t) => (
                  <div
                    key={t}
                    style={{
                      width: `${(c[t] / total) * 100}%`,
                      backgroundColor: TYPE_COLORS[t],
                    }}
                    title={`${TYPE_LABELS[t]}: ${c[t]}`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {(['general', 'foundation', 'core', 'practice'] as const).map((t) => (
                  <div key={t} className="p-2 rounded-lg bg-warm-100">
                    <div style={{ color: TYPE_COLORS[t] }} className="font-bold">{c[t]}</div>
                    <div className="text-warm-500 mt-0.5">{TYPE_LABELS[t].replace('专业', '')}</div>
                  </div>
                ))}
              </div>

              {lab.vendor_course_count > 0 && (
                <p className="text-xs text-accent-orange mt-3">含厂商课程 {lab.vendor_course_count} 门</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
