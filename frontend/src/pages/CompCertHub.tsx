import { useMemo, useState, useEffect } from 'react'
import {
  Trophy, Award, Building2, Briefcase, Lightbulb, Search, Star,
} from 'lucide-react'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import { useCompCert } from '../context/CompCertContext'
import { useData } from '../context/DataContext'
import { useEcosystem } from '../context/EcosystemContext'
import { useCrossNavState } from '../utils/crossNav'
import { RATING_COLORS } from '../types/compCert'
import { inputClass, selectClass } from '../styles/form'

type TabKey = 'competitions' | 'certificates' | 'labs' | 'jobs' | 'advice'

const TABS: { key: TabKey; label: string; icon: typeof Trophy }[] = [
  { key: 'competitions', label: '竞赛总览', icon: Trophy },
  { key: 'certificates', label: '证书总表', icon: Award },
  { key: 'labs', label: '实训室映射', icon: Building2 },
  { key: 'jobs', label: '岗位映射', icon: Briefcase },
  { key: 'advice', label: '建设建议', icon: Lightbulb },
]

export default function CompCertHub({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, error } = useCompCert()
  const { data: graphData } = useData()
  const { params } = useCrossNavState()
  const { setFocus } = useEcosystem()
  const [tab, setTab] = useState<TabKey>('competitions')
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [certCatFilter, setCertCatFilter] = useState('')
  const [labFilter, setLabFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')

  useEffect(() => {
    if (params.lab) { setLabFilter(params.lab); setTab('labs') }
    if (params.job) { setJobFilter(params.job); setTab('jobs') }
  }, [params.lab, params.job])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.competitions.map((c) => c.category).filter(Boolean))]
  }, [data])

  const certCategories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.certificates.map((c) => c.category).filter(Boolean))]
  }, [data])

  const ratings = useMemo(() => {
    if (!data) return []
    return [...new Set(data.competitions.map((c) => c.rating).filter(Boolean))]
  }, [data])

  const filteredCompetitions = useMemo(() => {
    if (!data) return []
    let list = data.competitions
    if (catFilter) list = list.filter((c) => c.category === catFilter)
    if (ratingFilter) list = list.filter((c) => c.rating === ratingFilter)
    if (q) {
      const lower = q.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.category.toLowerCase().includes(lower) ||
          c.summary.toLowerCase().includes(lower) ||
          c.labs.some((l) => l.toLowerCase().includes(lower)),
      )
    }
    return list
  }, [data, catFilter, ratingFilter, q])

  const filteredCerts = useMemo(() => {
    if (!data) return []
    let list = data.certificates
    if (certCatFilter) list = list.filter((c) => c.category === certCatFilter)
    if (q) {
      const lower = q.toLowerCase()
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          c.shortName.toLowerCase().includes(lower) ||
          c.org.toLowerCase().includes(lower) ||
          c.field.toLowerCase().includes(lower),
      )
    }
    return list
  }, [data, certCatFilter, q])

  const categoryChart = useMemo(() => {
    if (!data?.categoryStats.length) return {}
    const items = [...data.categoryStats].sort((a, b) => b.count - a.count).slice(0, 12)
    return {
      ...warmChartBase(),
      grid: { left: 120, right: 20, top: 10, bottom: 20 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },
      yAxis: {
        type: 'category',
        data: items.map((d) => d.category).reverse(),
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
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="glass rounded-2xl p-8 border border-warm-300 text-center max-w-lg mx-auto">
        <Trophy size={40} className="mx-auto text-warm-400 mb-3" />
        <h2 className="text-lg font-bold text-warm-900">竞赛·证书数据未加载</h2>
        <p className="text-sm text-warm-600 mt-2">{error ?? '请前往「数据管理」上传竞赛证书映射 Excel'}</p>
      </div>
    )
  }

  const showSearch = tab === 'competitions' || tab === 'certificates'

  return (
    <div className="space-y-6">
      {!embedded ? (
        <header>
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
            <Trophy size={26} className="text-accent-primary" />
            竞赛·证书中心
          </h1>
          <p className="text-warm-600 text-sm mt-1">
            {data.meta.total_competitions} 项竞赛 · {data.meta.total_certificates} 张证书 · {data.meta.total_labs_mapped} 个实训室已映射
          </p>
        </header>
      ) : (
        <p className="text-sm text-warm-600 -mt-1">
          {data.meta.total_competitions} 项竞赛 · {data.meta.total_certificates} 张证书 · {data.meta.total_labs_mapped} 个实训室已映射
        </p>
      )}

      {(labFilter || jobFilter) && (
        <p className="text-xs text-warm-600 glass rounded-lg px-3 py-2 border border-warm-300">
          联动筛选：
          {labFilter && <span className="text-accent-primary ml-1">实训室 {labFilter}</span>}
          {jobFilter && <span className="text-accent-primary ml-1">岗位 {jobFilter}</span>}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '竞赛', value: data.meta.total_competitions, icon: Trophy, color: 'text-accent-primary' },
          { label: '证书', value: data.meta.total_certificates, icon: Award, color: 'text-accent-secondary' },
          { label: '竞赛类别', value: data.categoryStats.length, icon: Star, color: 'text-accent-green' },
          { label: '实训室映射', value: data.meta.total_labs_mapped, icon: Building2, color: 'text-warm-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-warm-300">
            <div className="flex items-center gap-2 text-warm-500 text-xs">
              <Icon size={14} className={color} />
              {label}
            </div>
            <p className="text-2xl font-bold text-warm-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {data.categoryStats.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-warm-300">
          <h3 className="font-bold text-warm-900 mb-3">竞赛类别分布</h3>
          <Chart option={categoryChart} height={320} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-warm-200 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setQ('') }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
              tab === key
                ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {showSearch && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="search"
              placeholder={tab === 'competitions' ? '搜索竞赛名称、类别、实训室…' : '搜索证书名称、机构、方向…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          {tab === 'competitions' && (
            <>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={selectClass}>
                <option value="">全部类别</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className={selectClass}>
                <option value="">全部评级</option>
                {ratings.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </>
          )}
          {tab === 'certificates' && (
            <select value={certCatFilter} onChange={(e) => setCertCatFilter(e.target.value)} className={selectClass}>
              <option value="">全部认证类别</option>
              {certCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      )}

      {tab === 'competitions' && (
        <div className="space-y-3">
          <p className="text-xs text-warm-500">共 {filteredCompetitions.length} 项</p>
          <div className="grid gap-3">
            {filteredCompetitions.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setFocus({ kind: 'competition', id: c.name, label: c.name, subtitle: c.category })}
                onKeyDown={(e) => e.key === 'Enter' && setFocus({ kind: 'competition', id: c.name, label: c.name, subtitle: c.category })}
                className="glass rounded-xl p-4 border border-warm-300 cursor-pointer hover:border-accent-primary/30 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-warm-900">{c.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs">
                      {c.category && <span className="px-2 py-0.5 rounded bg-warm-100 text-warm-600">{c.category}</span>}
                      {c.level && <span className="px-2 py-0.5 rounded bg-warm-100 text-warm-600">{c.level}</span>}
                      {c.official && <span className="px-2 py-0.5 rounded bg-warm-100 text-warm-600">{c.official}</span>}
                    </div>
                  </div>
                  {c.rating && (
                    <span
                      className="text-sm font-medium px-2 py-1 rounded-lg border"
                      style={{ color: RATING_COLORS[c.rating] ?? WARM_CHART.muted, borderColor: `${RATING_COLORS[c.rating] ?? '#ccc'}40` }}
                    >
                      {c.rating}
                    </span>
                  )}
                </div>
                {c.summary && <p className="text-sm text-warm-600 mt-2 leading-relaxed">{c.summary}</p>}
                {(c.labs.length > 0 || c.jobs.length > 0) && (
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-warm-500">
                    {c.labs.length > 0 && <span>实训室：{c.labs.join('、')}</span>}
                    {c.jobs.length > 0 && <span>岗位：{c.jobs.join('、')}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'certificates' && (
        <div className="overflow-x-auto glass rounded-xl border border-warm-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 text-left text-warm-500">
                <th className="p-3 font-medium">证书</th>
                <th className="p-3 font-medium">类别</th>
                <th className="p-3 font-medium">机构</th>
                <th className="p-3 font-medium">等级</th>
                <th className="p-3 font-medium">方向</th>
                <th className="p-3 font-medium">适用实训室</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-warm-100 hover:bg-warm-50/50 cursor-pointer"
                  onClick={() => setFocus({ kind: 'certificate', id: c.fullName, label: c.shortName || c.fullName, subtitle: c.org })}
                >
                  <td className="p-3">
                    <div className="font-medium text-warm-900">{c.shortName || c.fullName}</div>
                    {c.shortName && c.fullName !== c.shortName && (
                      <div className="text-xs text-warm-400 mt-0.5">{c.fullName}</div>
                    )}
                  </td>
                  <td className="p-3 text-warm-600">{c.category}</td>
                  <td className="p-3 text-warm-600">{c.org}</td>
                  <td className="p-3 text-warm-600">{c.level}</td>
                  <td className="p-3 text-warm-600 max-w-[160px]">{c.field}</td>
                  <td className="p-3 text-warm-500 text-xs max-w-[200px]">{c.labs.join('、')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-xs text-warm-400 border-t border-warm-200">共 {filteredCerts.length} 张证书</p>
        </div>
      )}

      {tab === 'labs' && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.labCompetitions
            .filter((row) => !labFilter || row.lab.includes(labFilter.replace('实训室', '')) || labFilter.includes(row.lab.replace('实训室', '')))
            .map((row) => (
            <div
              key={row.lab}
              role="button"
              tabIndex={0}
              onClick={() => setFocus({ kind: 'lab', id: row.lab, label: row.lab, subtitle: `${row.count} 项竞赛` })}
              onKeyDown={(e) => e.key === 'Enter' && setFocus({ kind: 'lab', id: row.lab, label: row.lab, subtitle: `${row.count} 项竞赛` })}
              className="glass rounded-xl p-4 border border-warm-300 cursor-pointer hover:border-accent-primary/30 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-warm-900">{row.lab}</h3>
                <span className="text-xs px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary">
                  {row.count} 项竞赛
                </span>
              </div>
              {row.audience && <p className="text-xs text-warm-500 mt-1">适用：{row.audience}</p>}
              {row.competitionText && (
                <p className="text-sm text-warm-600 mt-2 leading-relaxed whitespace-pre-wrap">{row.competitionText}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-2">
          {data.jobCompetitions
            .filter((row) => row.isCategory || !jobFilter || row.label.includes(jobFilter) || jobFilter.includes(row.label))
            .map((row, i) =>
            row.isCategory ? (
              <h3 key={i} className="text-sm font-bold text-accent-primary pt-4 first:pt-0">{row.label}</h3>
            ) : (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => setFocus({ kind: 'job', id: row.label, label: row.label, subtitle: `${row.count} 项竞赛` })}
                onKeyDown={(e) => e.key === 'Enter' && setFocus({ kind: 'job', id: row.label, label: row.label, subtitle: `${row.count} 项竞赛` })}
                className="glass rounded-xl p-4 border border-warm-300 ml-2 cursor-pointer hover:border-accent-primary/30 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-warm-900">{row.label}</h4>
                  {row.count > 0 && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-warm-100 text-warm-600">{row.count} 项</span>
                  )}
                </div>
                {row.audience && <p className="text-xs text-warm-500 mt-1">{row.audience}</p>}
                {row.competitionText && (
                  <p className="text-sm text-warm-600 mt-2 leading-relaxed">{row.competitionText}</p>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {tab === 'advice' && (
        <div className="glass rounded-2xl p-5 border border-warm-300 space-y-4">
          {data.recommendations.map((line, i) => (
            <p key={i} className="text-sm text-warm-700 leading-relaxed border-l-2 border-accent-primary/40 pl-4">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
