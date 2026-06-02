import { useNavigate, Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useCompCert } from '../context/CompCertContext'
import LabResourceSummaryTable from '../components/LabResourceSummaryTable'
import { buildLabCertIndex } from '../utils/certLink'
import { buildCrossNavUrl } from '../utils/crossNav'
import { useEcosystem } from '../context/EcosystemContext'
import { TYPE_COLORS, TYPE_LABELS } from '../types'

export default function LabsPage() {
  const { data } = useData()
  const { data: compCertData } = useCompCert()
  const { setFocus } = useEcosystem()
  const navigate = useNavigate()

  const certIndex = useMemo(() => {
    if (!data || !compCertData) return new Map()
    return buildLabCertIndex(compCertData, data.labs)
  }, [data, compCertData])

  if (!data) return null

  return (
    <div className="space-y-6">
      <LabResourceSummaryTable />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.labs.map((lab) => {
          const c = lab.course_counts
          const total = c.total || 1
          const cert = certIndex.get(lab.name)
          return (
            <button
              key={lab.id}
              onClick={() => {
                setFocus({ kind: 'lab', id: lab.name, label: lab.name })
                navigate(buildCrossNavUrl(`/labs/${lab.id}`, { lab: lab.name }))
              }}
              className="glass rounded-xl p-3.5 text-left hover:border-accent-primary/30 transition group"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold leading-snug group-hover:text-accent-primary transition truncate">
                    <span className="text-[10px] text-accent-primary font-normal mr-1">#{lab.id}</span>
                    {lab.name.replace('实训室', '').replace('实验室', '')}
                  </h2>
                  {lab.original_name && (
                    <p className="text-[10px] text-warm-400 mt-0.5 truncate">{lab.original_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold text-gradient leading-none">{c.total}</span>
                  <span className="text-[10px] text-warm-500 ml-0.5">门</span>
                </div>
              </div>

              <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
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

              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                {(['general', 'foundation', 'core', 'practice'] as const).map((t) => (
                  <div key={t} className="py-1 px-0.5 rounded-md bg-warm-100">
                    <div style={{ color: TYPE_COLORS[t] }} className="font-bold text-xs leading-none">{c[t]}</div>
                    <div className="text-warm-500 mt-0.5 scale-90 origin-top">{TYPE_LABELS[t].replace('专业', '')}</div>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-2 pt-2 border-t border-warm-200/80 text-[10px] text-warm-500"
                onClick={(e) => e.stopPropagation()}
              >
                {lab.vendor_course_count > 0 && (
                  <span className="text-accent-orange whitespace-nowrap">厂商 {lab.vendor_course_count} 门</span>
                )}
                {cert && (cert.competitionCount > 0 || cert.certificateCount > 0) && (
                  <span className="whitespace-nowrap">
                    {cert.competitionCount > 0 && <span className="text-orange-600">{cert.competitionCount} 竞赛</span>}
                    {cert.competitionCount > 0 && cert.certificateCount > 0 && <span className="text-warm-300 mx-1">·</span>}
                    {cert.certificateCount > 0 && <span className="text-teal-700">{cert.certificateCount} 证书</span>}
                  </span>
                )}
                <span className="whitespace-nowrap ml-auto">
                  <Link to={buildCrossNavUrl('/integrated', { lab: lab.name })} className="text-accent-primary hover:underline">综合匹配</Link>
                  <span className="text-warm-300 mx-1">·</span>
                  <Link to={buildCrossNavUrl('/network', { lab: lab.name })} className="text-accent-primary hover:underline">课程图谱</Link>
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
