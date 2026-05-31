import { useCallback, useMemo, useState } from 'react'

import { Cpu, Building2, Factory, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

import { useData } from '../context/DataContext'

import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'

import { TYPE_COLORS } from '../types'

import type { VendorDetail } from '../types'

import { normalizeVendorName } from '../utils/vendor'

import { selectClass } from '../styles/form'



const VENDOR_COLORS = [

  '#d97706', '#c45c26', '#b8860b', '#9a7b5f', '#6b8f3c',

  '#5b7fa5', '#8b6914', '#a0522d', '#cd853f', '#7a6555',

]



function shortLab(name: string) {

  return name.replace('实训室', '').replace('实验室', '')

}



function parseHours(v: VendorDetail['hours_total']) {

  if (v == null || v === '') return null

  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.]/g, ''))

  return Number.isFinite(n) && n > 0 ? n : null

}



interface VendorCoursesProps {
  embedded?: boolean
}

export default function VendorCourses({ embedded = false }: VendorCoursesProps) {

  const { data } = useData()

  const [vendor, setVendor] = useState('')

  const [lab, setLab] = useState('')

  const [expanded, setExpanded] = useState<number | null>(null)



  const vendors = useMemo(() => {

    if (!data) return []

    const map = new Map<string, { vendor: string; count: number; lab_count: number; labs: Set<string> }>()

    for (const v of data.vendor_courses) {

      const name = normalizeVendorName(v.vendor || '')

      if (!name) continue

      if (!map.has(name)) map.set(name, { vendor: name, count: 0, lab_count: 0, labs: new Set() })

      const entry = map.get(name)!

      entry.count += 1

      if (v.lab_name) entry.labs.add(v.lab_name)

      entry.lab_count = entry.labs.size

    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count)

  }, [data])



  const items = useMemo(() => {

    if (!data) return []

    let list = data.vendor_courses.map((v) => ({

      ...v,

      vendor: normalizeVendorName(v.vendor || ''),

    }))

    if (vendor) list = list.filter((v) => v.vendor === vendor)

    if (lab) list = list.filter((v) => v.lab_name === lab)

    return list

  }, [data, vendor, lab])



  const grouped = useMemo(() => {

    const map = new Map<string, typeof items>()

    for (const v of items) {

      const key = v.vendor || '未知'

      if (!map.has(key)) map.set(key, [])

      map.get(key)!.push(v)

    }

    return map

  }, [items])



  const summary = useMemo(() => {

    const labSet = new Set<string>()

    let hoursSum = 0

    let hoursCount = 0

    let hardware = 0

    for (const c of items) {

      if (c.lab_name) labSet.add(c.lab_name)

      if (c.hardware_bound) hardware += 1

      const h = parseHours(c.hours_total)

      if (h != null) {

        hoursSum += h

        hoursCount += 1

      }

    }

    return {

      labs: labSet.size,

      avgHours: hoursCount ? Math.round(hoursSum / hoursCount) : null,

      hardware,

    }

  }, [items])



  const vendorBarOption = useMemo(() => {

    if (!vendors.length) return {}

    const list = vendors.slice(0, 10)

    return {

      ...warmChartBase(),

      grid: { left: 88, right: 16, top: 8, bottom: 8 },

      tooltip: { trigger: 'axis', formatter: '{b}: {c} 门' },

      xAxis: { type: 'value', splitLine: { lineStyle: { color: WARM_CHART.splitLine } } },

      yAxis: {

        type: 'category',

        data: list.map((v) => v.vendor).reverse(),

        axisLabel: { color: WARM_CHART.muted, fontSize: 10 },

      },

      series: [

        {

          type: 'bar',

          data: list.map((v, i) => ({

            value: v.count,

            itemStyle: {

              color: VENDOR_COLORS[i % VENDOR_COLORS.length],

              opacity: !vendor || vendor === v.vendor ? 1 : 0.25,

              borderRadius: [0, 4, 4, 0],

            },

          })).reverse(),

        },

      ],

    }

  }, [vendors, vendor])



  const vendorPieOption = useMemo(() => {

    if (!vendors.length) return {}

    const top = vendors.slice(0, 6)

    const rest = vendors.slice(6).reduce((s, v) => s + v.count, 0)

    const pieData = top.map((v, i) => ({

      name: v.vendor,

      value: v.count,

      itemStyle: {

        color: VENDOR_COLORS[i % VENDOR_COLORS.length],

        opacity: !vendor || vendor === v.vendor ? 1 : 0.25,

      },

    }))

    if (rest > 0) {

      pieData.push({ name: '其他', value: rest, itemStyle: { color: '#c4a882', opacity: vendor ? 0.25 : 1 } })

    }

    return {

      ...warmChartBase(),

      tooltip: { trigger: 'item', formatter: '{b}: {c}门 ({d}%)' },

      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 9, color: WARM_CHART.muted } },

      series: [

        {

          type: 'pie',

          radius: ['38%', '62%'],

          center: ['50%', '42%'],

          label: { show: false },

          data: pieData,

        },

      ],

    }

  }, [vendors, vendor])



  const handleVendorChartClick = useCallback(

    (params: unknown) => {

      const p = params as { name?: string }

      if (!p.name || p.name === '其他') return

      setVendor((prev) => (prev === p.name ? '' : p.name!))

    },

    [],

  )



  if (!data) return null



  const kpis = [

    { label: '筛选结果', value: items.length, icon: BookOpen, color: 'text-accent-primary' },

    { label: '合作厂商', value: vendor ? 1 : vendors.length, icon: Factory, color: 'text-accent-orange' },

    { label: '覆盖实训室', value: summary.labs, icon: Building2, color: 'text-accent-blue' },

    { label: '绑定硬件', value: summary.hardware, icon: Cpu, color: 'text-accent-gold' },

  ]



  const summaryLine = (
    <>
      {data.meta.total_vendor_courses} 门厂商课程 · {vendors.length} 家合作厂商
      {summary.avgHours != null && ` · 平均 ${summary.avgHours} 学时`}
      {(vendor || lab) && (
        <button
          type="button"
          onClick={() => { setVendor(''); setLab('') }}
          className="ml-3 text-accent-primary hover:underline text-sm"
        >
          清除筛选
        </button>
      )}
    </>
  )

  return (

    <div className="space-y-6">

      {!embedded ? (
        <header>
          <h1 className="text-2xl font-bold text-gradient">厂商课程体系</h1>
          <p className="text-warm-600 mt-1">{summaryLine}</p>
        </header>
      ) : (
        <p className="text-sm text-warm-600 -mt-1">{summaryLine}</p>
      )}

      <div className="grid grid-cols-4 gap-3">

        {kpis.map(({ label, value, icon: Icon, color }) => (

          <div key={label} className="glass rounded-xl px-4 py-3 flex items-center justify-between">

            <div>

              <p className="text-xs text-warm-500">{label}</p>

              <p className={`text-2xl font-bold ${color}`}>{value}</p>

            </div>

            <Icon className={`${color} opacity-40`} size={24} />

          </div>

        ))}

      </div>



      <div className="grid grid-cols-3 gap-4">

        <div className="col-span-2 glass rounded-2xl p-4">

          <h3 className="text-sm font-medium text-warm-700 mb-2">厂商课程量分布</h3>

          <Chart option={vendorBarOption} height={260} onEvents={{ click: handleVendorChartClick }} />

        </div>

        <div className="glass rounded-2xl p-4">

          <h3 className="text-sm font-medium text-warm-700 mb-2">厂商占比</h3>

          <Chart option={vendorPieOption} height={260} onEvents={{ click: handleVendorChartClick }} />

        </div>

      </div>



      <div className="flex flex-wrap gap-2">

        {vendors.map((v, i) => (

          <button

            key={v.vendor}

            type="button"

            onClick={() => setVendor(vendor === v.vendor ? '' : v.vendor)}

            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition border ${

              vendor === v.vendor

                ? 'border-accent-orange/50 bg-accent-orange/15 text-accent-orange font-medium'

                : 'border-warm-300 bg-warm-50 text-warm-600 hover:border-accent-orange/30'

            }`}

          >

            <span

              className="w-2 h-2 rounded-full shrink-0"

              style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length] }}

            />

            {v.vendor}

            <span className="text-warm-400">{v.count}</span>

          </button>

        ))}

      </div>



      <div className="flex gap-3 flex-wrap items-center">

        <select value={lab} onChange={(e) => setLab(e.target.value)} className={selectClass}>

          <option value="">全部实训室</option>

          {data.labs.map((l) => (

            <option key={l.id} value={l.name}>

              {l.name}

            </option>

          ))}

        </select>

        {vendor && (

          <span className="text-xs px-2.5 py-1 rounded-full bg-accent-orange/10 text-accent-orange">

            当前厂商：{vendor}

          </span>

        )}

      </div>



      <div className="space-y-5">

        {Array.from(grouped.entries()).map(([vendorName, courses]) => (

          <section key={vendorName}>

            <div className="flex items-center gap-3 mb-3">

              <h2 className="text-base font-bold text-accent-orange">{vendorName}</h2>

              <span className="text-xs text-warm-500">{courses.length} 门课程</span>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

              {courses.map((c) => (

                <VendorCourseCard

                  key={c.id}

                  course={c}

                  expanded={expanded === c.id}

                  onToggle={() => setExpanded(expanded === c.id ? null : c.id)}

                />

              ))}

            </div>

          </section>

        ))}

      </div>



      {items.length === 0 && (

        <p className="text-center text-warm-500 py-10 text-sm">没有匹配的厂商课程</p>

      )}

    </div>

  )

}



function VendorCourseCard({

  course: c,

  expanded,

  onToggle,

}: {

  course: VendorDetail & { vendor: string }

  expanded: boolean

  onToggle: () => void

}) {

  const descPreview = c.description?.replace(/\s+/g, ' ').trim()



  return (

    <article

      className={`glass rounded-xl overflow-hidden border transition hover:border-accent-orange/30 ${

        expanded ? 'border-accent-orange/40 ring-1 ring-accent-orange/20' : 'border-transparent'

      }`}

    >

      <button type="button" onClick={onToggle} className="w-full text-left p-4">

        <div className="flex items-start gap-3">

          <div

            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"

            style={{ backgroundColor: TYPE_COLORS[c.type] ?? '#9a7b5f' }}

          >

            {(c.type_label || '课').slice(0, 1)}

          </div>

          <div className="flex-1 min-w-0">

            <div className="flex flex-wrap items-center gap-1.5 mb-1">

              <span

                className="text-[10px] px-1.5 py-0.5 rounded"

                style={{ backgroundColor: `${TYPE_COLORS[c.type]}33`, color: TYPE_COLORS[c.type] }}

              >

                {c.type_label}

              </span>

              {c.hardware_bound && (

                <span className="text-[10px] text-accent-primary inline-flex items-center gap-0.5">

                  <Cpu size={10} /> 硬件

                </span>

              )}

              {c.hours_total != null && (

                <span className="text-[10px] text-warm-500 ml-auto">{c.hours_total} 学时</span>

              )}

            </div>

            <h3 className="font-medium text-sm leading-snug line-clamp-2">{c.name}</h3>

            <p className="text-[11px] text-warm-500 mt-1 truncate">{shortLab(c.lab_name)}</p>

            {!expanded && descPreview && (

              <p className="text-[11px] text-warm-400 mt-2 line-clamp-2 leading-relaxed">{descPreview}</p>

            )}

            {(c.capability || c.jobs) && (

              <div className="mt-2 flex flex-wrap gap-1">

                {c.capability && (

                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-600 line-clamp-1">

                    {c.capability.split(/[,，/]/)[0]?.trim()}

                  </span>

                )}

                {c.jobs && (

                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary line-clamp-1">

                    {c.jobs.split(/[,，/]/)[0]?.trim()}

                  </span>

                )}

              </div>

            )}

          </div>

          <div className="shrink-0 text-warm-400 pt-1">

            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}

          </div>

        </div>

      </button>



      {expanded && (

        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-warm-200/80 mx-4 mb-4 animate-fade-in-up">

          {c.description && (

            <div>

              <h4 className="text-[10px] text-warm-500 mb-1">课程描述</h4>

              <p className="text-xs leading-relaxed text-warm-700 whitespace-pre-wrap bg-warm-100/80 p-3 rounded-lg">

                {c.description}

              </p>

            </div>

          )}

          {c.hardware && (

            <div>

              <h4 className="text-[10px] text-warm-500 mb-1">配套硬件</h4>

              <p className="text-xs text-accent-primary whitespace-pre-wrap">{c.hardware}</p>

            </div>

          )}

          <div className="grid grid-cols-3 gap-2">

            <MiniStat label="总课时" value={c.hours_total} />

            <MiniStat label="理论" value={c.hours_theory} />

            <MiniStat label="实训" value={c.hours_practice} />

          </div>

          {c.original_lab_name && c.original_lab_name !== c.lab_name && (

            <p className="text-[10px] text-warm-400">原始实训室：{c.original_lab_name}</p>

          )}

        </div>

      )}

    </article>

  )

}



function MiniStat({ label, value }: { label: string; value?: number | string | null }) {

  return (

    <div className="p-2 rounded-lg bg-warm-100 text-center">

      <div className="font-bold text-sm text-accent-primary">{value ?? '—'}</div>

      <div className="text-[10px] text-warm-500">{label}</div>

    </div>

  )

}


