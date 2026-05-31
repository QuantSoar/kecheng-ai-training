import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen, Factory, Share2, Layers, ChevronDown, ChevronRight, Briefcase, Users, Building2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import type { Course, Lab } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import type { JobProfile, LabJobCourseRow } from '../types/jobMap'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import { selectClass, inputClass } from '../styles/form'



const TYPE_ORDER = ['general', 'foundation', 'core', 'practice'] as const



function parseHours(h: Course['hours']): number | null {

  if (h == null || h === '') return null

  const n = typeof h === 'number' ? h : Number(String(h).replace(/[^\d.]/g, ''))

  return Number.isFinite(n) && n > 0 ? n : null

}



function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function normText(s: string) {
  return s.trim().replace(/\s/g, '').toLowerCase()
}

function courseNameMatch(a: string, b: string) {
  const na = normText(a)
  const nb = normText(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

function facultyForCourse(course: Course, teachers: FacultyTeacher[]) {
  const name = course.name
  return teachers
    .filter((t) => {
      if (t.lab_list.includes(course.lab_name)) return true
      if (t.capable_courses) {
        const parts = t.capable_courses.split(/[,，、;/\n]+/)
        if (parts.some((p) => p.trim() && courseNameMatch(p, name))) return true
      }
      return false
    })
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .slice(0, 6)
}

function jobsForCourse(course: Course, jobs: JobProfile[], rows: LabJobCourseRow[]) {
  const matched = new Map<string, JobProfile>()
  for (const job of jobs) {
    for (const row of rows) {
      if (row.job !== job.name || row.lab !== course.lab_name) continue
      if (row.courses.some((c) => courseNameMatch(c, course.name))) matched.set(job.name, job)
    }
    for (const skill of job.skills) {
      if (skill.courses.some((c) => courseNameMatch(c, course.name))) matched.set(job.name, job)
    }
  }
  if (course.vendor_detail?.jobs) {
    const hints = course.vendor_detail.jobs.split(/[,，、;/\n]+/).map((s) => s.trim()).filter(Boolean)
    for (const job of jobs) {
      if (hints.some((h) => courseNameMatch(job.name, h) || courseNameMatch(h, job.name))) {
        matched.set(job.name, job)
      }
    }
  }
  return [...matched.values()].slice(0, 6)
}



interface LabMatrixRow {

  labName: string

  shortName: string

  cells: { type: (typeof TYPE_ORDER)[number]; count: number }[]

  total: number

}



interface CourseSearchProps {
  embedded?: boolean
}

export default function CourseSearch({ embedded = false }: CourseSearchProps) {
  const { data } = useData()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const [q, setQ] = useState('')
  const [lab, setLab] = useState('')
  const [type, setType] = useState('')
  const [source, setSource] = useState('')
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null)
  const [view, setView] = useState<'list' | 'table'>('list')



  const filtered = useMemo(() => {

    if (!data) return []

    let list = data.courses

    if (q) {

      const lower = q.toLowerCase()

      list = list.filter(

        (c) =>

          c.name.toLowerCase().includes(lower) ||

          c.textbook?.toLowerCase().includes(lower) ||

          c.platform?.toLowerCase().includes(lower) ||

          c.source.toLowerCase().includes(lower),

      )

    }

    if (lab) list = list.filter((c) => c.lab_name === lab)

    if (type) list = list.filter((c) => c.type === type)

    if (source === 'vendor') list = list.filter((c) => c.is_vendor)

    if (source === 'university') list = list.filter((c) => !c.is_vendor)

    return list

  }, [data, q, lab, type, source])



  const sharedMap = useMemo(() => {

    if (!data) return new Map<string, number>()

    return new Map(data.shared_courses.map((s) => [s.name, s.lab_count]))

  }, [data])



  const mapCourses = useMemo(() => {

    if (!data) return []

    let list = data.courses

    if (q) {

      const lower = q.toLowerCase()

      list = list.filter(

        (c) =>

          c.name.toLowerCase().includes(lower) ||

          c.textbook?.toLowerCase().includes(lower) ||

          c.platform?.toLowerCase().includes(lower) ||

          c.source.toLowerCase().includes(lower),

      )

    }

    if (source === 'vendor') list = list.filter((c) => c.is_vendor)

    if (source === 'university') list = list.filter((c) => !c.is_vendor)

    return list

  }, [data, q, source])



  const labMatrix = useMemo((): LabMatrixRow[] => {

    if (!data) return []

    const counts = new Map<string, Map<string, number>>()

    for (const c of mapCourses) {

      if (!counts.has(c.lab_name)) counts.set(c.lab_name, new Map())

      const m = counts.get(c.lab_name)!

      m.set(c.type, (m.get(c.type) ?? 0) + 1)

    }

    return data.labs

      .map((labItem) => {

        const types = counts.get(labItem.name) ?? new Map()

        const cells = TYPE_ORDER.map((t) => ({ type: t, count: types.get(t) ?? 0 }))

        const total = cells.reduce((s, c) => s + c.count, 0)

        return {

          labName: labItem.name,

          shortName: shortLab(labItem.name),

          cells,

          total,

        }

      })

      .filter((row) => row.total > 0)

      .sort((a, b) => b.total - a.total)

  }, [data, mapCourses])



  const columnMax = useMemo(() => {

    const max = { general: 0, foundation: 0, core: 0, practice: 0 }

    for (const row of labMatrix) {

      for (const cell of row.cells) {

        max[cell.type] = Math.max(max[cell.type], cell.count)

      }

    }

    return max

  }, [labMatrix])



  const analytics = useMemo(() => {

    const typeCounts = new Map<string, number>()

    const labCounts = new Map<string, number>()

    let vendor = 0

    let hoursSum = 0

    let hoursCount = 0

    let shared = 0



    for (const c of filtered) {

      typeCounts.set(c.type, (typeCounts.get(c.type) ?? 0) + 1)

      labCounts.set(c.lab_name, (labCounts.get(c.lab_name) ?? 0) + 1)

      if (c.is_vendor) vendor += 1

      const h = parseHours(c.hours)

      if (h != null) {

        hoursSum += h

        hoursCount += 1

      }

      if ((sharedMap.get(c.name) ?? 0) >= 2) shared += 1

    }



    return {

      typeCounts,

      labCounts,

      vendor,

      university: filtered.length - vendor,

      avgHours: hoursCount ? Math.round(hoursSum / hoursCount) : null,

      shared,

    }

  }, [filtered, sharedMap])



  const mapFilterLabel = useMemo(() => {

    const parts: string[] = []

    if (lab) parts.push(shortLab(lab))

    if (type) parts.push(TYPE_LABELS[type] ?? type)

    return parts.join(' · ')

  }, [lab, type])



  const typePieOption = useMemo(() => {

    const items = TYPE_ORDER.map((t) => ({

      name: TYPE_LABELS[t],

      value: analytics.typeCounts.get(t) ?? 0,

      itemStyle: { color: TYPE_COLORS[t] },

    })).filter((d) => d.value > 0)

    if (!items.length) return {}

    return {

      ...warmChartBase(),

      tooltip: { trigger: 'item', formatter: '{b}: {c}门 ({d}%)' },

      series: [

        {

          type: 'pie',

          radius: ['42%', '68%'],

          center: ['50%', '48%'],

          itemStyle: { borderRadius: 4, borderColor: WARM_CHART.pieBorder, borderWidth: 2 },

          label: { color: WARM_CHART.muted, fontSize: 10 },

          data: items,

        },

      ],

    }

  }, [analytics.typeCounts])

  const labRankList = useMemo(() => {
    const map = new Map<
      string,
      { labName: string; shortName: string; total: number; types: Record<string, number> }
    >()
    for (const c of filtered) {
      if (!map.has(c.lab_name)) {
        map.set(c.lab_name, { labName: c.lab_name, shortName: shortLab(c.lab_name), total: 0, types: {} })
      }
      const entry = map.get(c.lab_name)!
      entry.total += 1
      entry.types[c.type] = (entry.types[c.type] ?? 0) + 1
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filtered])

  const sourcePieOption = useMemo(() => {

    if (!filtered.length) return {}

    return {

      ...warmChartBase(),

      tooltip: { trigger: 'item' },

      series: [

        {

          type: 'pie',

          radius: ['38%', '62%'],

          center: ['50%', '50%'],

          label: { fontSize: 10, color: WARM_CHART.muted },

          data: [

            { name: '厂商课', value: analytics.vendor, itemStyle: { color: '#d97706' } },

            { name: '高校/其他', value: analytics.university, itemStyle: { color: '#5b7fa5' } },

          ].filter((d) => d.value > 0),

        },

      ],

    }

  }, [filtered.length, analytics.vendor, analytics.university])



  const clearMapFilter = useCallback(() => {

    setLab('')

    setType('')

  }, [])



  const handleCellClick = useCallback(

    (labName: string, typeKey: string) => {

      if (lab === labName && type === typeKey) {

        clearMapFilter()

      } else {

        setLab(labName)

        setType(typeKey)

      }

    },

    [lab, type, clearMapFilter],

  )



  const handleLabNameClick = useCallback(

    (labName: string) => {

      if (lab === labName && !type) {

        clearMapFilter()

      } else {

        setLab(labName)

        setType('')

      }

    },

    [lab, type, clearMapFilter],

  )



  const handleTypePieClick = useCallback((params: unknown) => {

    const p = params as { name?: string }

    const entry = Object.entries(TYPE_LABELS).find(([, label]) => label === p.name)

    if (!entry) return

    setType((prev) => (prev === entry[0] ? '' : entry[0]))

  }, [])

  const clearFilters = () => {

    setQ('')

    setLab('')

    setType('')

    setSource('')

  }



  const hasFilter = Boolean(q || lab || type || source)

  const labByName = useMemo(() => {
    if (!data) return new Map<string, Lab>()
    return new Map(data.labs.map((l) => [l.name, l]))
  }, [data])

  const courseRelations = useMemo(() => {
    const teachers = facultyData?.teachers ?? []
    const jobs = jobMapData?.jobs ?? []
    const rows = jobMapData?.labCourseRows ?? []
    const map = new Map<number, { faculty: FacultyTeacher[]; jobs: JobProfile[] }>()
    for (const c of filtered) {
      map.set(c.id, {
        faculty: facultyForCourse(c, teachers),
        jobs: jobsForCourse(c, jobs, rows),
      })
    }
    return map
  }, [filtered, facultyData, jobMapData])

  if (!data) return null



  const kpis = [

    { label: '筛选结果', value: filtered.length, icon: BookOpen, color: 'text-accent-primary' },

    { label: '厂商课', value: analytics.vendor, icon: Factory, color: 'text-accent-orange' },

    { label: '跨室共用', value: analytics.shared, icon: Share2, color: 'text-accent-gold' },

    {

      label: '平均学时',

      value: analytics.avgHours != null ? analytics.avgHours : '—',

      icon: Layers,

      color: 'text-accent-blue',

    },

  ]



  return (

    <div className="space-y-6">

      {!embedded && (
        <header>
          <h1 className="text-2xl font-bold text-gradient">课程分析</h1>
          <p className="text-warm-600 mt-1">
            共 {data.meta.total_courses} 门课程 · 矩阵地图与筛选联动
            {hasFilter && (
              <button type="button" onClick={clearFilters} className="ml-3 text-accent-primary hover:underline text-sm">
                清除筛选
              </button>
            )}
          </p>
        </header>
      )}

      {embedded && (
        <p className="text-sm text-warm-600 -mt-1">
          共 {data.meta.total_courses} 门课程 · 矩阵地图与筛选联动
          {hasFilter && (
            <button type="button" onClick={clearFilters} className="ml-3 text-accent-primary hover:underline text-sm">
              清除筛选
            </button>
          )}
        </p>
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

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">

            <div>

              <h3 className="text-sm font-medium text-warm-700">课程分布矩阵</h3>

              <p className="text-[11px] text-warm-500 mt-0.5">行 = 实训室 · 列 = 课程类型 · 数字 = 门数</p>

            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">

              {mapFilterLabel ? (

                <>

                  <span className="text-[11px] text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full">

                    已选：{mapFilterLabel}

                  </span>

                  <button

                    type="button"

                    onClick={clearMapFilter}

                    className="text-[11px] px-2.5 py-1 rounded-full bg-warm-200 text-warm-800 hover:bg-accent-primary/15 hover:text-accent-primary transition"

                  >

                    返回全景

                  </button>

                </>

              ) : (

                <span className="text-[11px] text-warm-500">点击数字筛选 · 点击实训室名筛选整室</span>

              )}

            </div>

          </div>



          <div className="flex flex-wrap gap-2 mb-3">

            {TYPE_ORDER.map((t) => (

              <span

                key={t}

                className="inline-flex items-center gap-1 text-[10px] text-warm-600"

              >

                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: TYPE_COLORS[t] }} />

                {TYPE_LABELS[t]}

              </span>

            ))}

          </div>



          {labMatrix.length > 0 ? (

            <div className="overflow-auto max-h-[300px] scrollbar-thin rounded-xl border border-warm-300/80">

              <table className="w-full text-xs min-w-[520px]">

                <thead className="sticky top-0 z-10 bg-warm-50/95 backdrop-blur-sm">

                  <tr className="border-b border-warm-300 text-warm-500">

                    <th className="p-2 text-left font-medium min-w-[100px]">实训室</th>

                    {TYPE_ORDER.map((t) => (

                      <th key={t} className="p-2 text-center font-medium w-16">

                        <span style={{ color: TYPE_COLORS[t] }}>{TYPE_LABELS[t].replace('专业', '').replace('通识课程', '通识')}</span>

                      </th>

                    ))}

                    <th className="p-2 text-center font-medium w-12">合计</th>

                  </tr>

                </thead>

                <tbody>

                  {labMatrix.map((row) => {

                    const rowSelected = lab === row.labName && !type

                    const rowDimmed = lab && lab !== row.labName

                    return (

                      <tr

                        key={row.labName}

                        className={`border-b border-warm-200/80 transition ${

                          rowDimmed ? 'opacity-35' : ''

                        } ${rowSelected ? 'bg-accent-primary/5' : 'hover:bg-warm-100/50'}`}

                      >

                        <td className="p-1.5">

                          <button

                            type="button"

                            onClick={() => handleLabNameClick(row.labName)}

                            className={`text-left font-medium truncate max-w-[120px] block px-1 py-0.5 rounded transition ${

                              rowSelected

                                ? 'text-accent-primary bg-accent-primary/10'

                                : 'text-warm-800 hover:text-accent-primary'

                            }`}

                            title={row.labName}

                          >

                            {row.shortName}

                          </button>

                        </td>

                        {row.cells.map((cell) => {

                          const selected = lab === row.labName && type === cell.type

                          const dimmed = (lab && lab !== row.labName) || (type && type !== cell.type)

                          const max = columnMax[cell.type] || 1

                          const intensity = cell.count > 0 ? 0.12 + (cell.count / max) * 0.48 : 0



                          return (

                            <td key={cell.type} className="p-1">

                              <button

                                type="button"

                                disabled={cell.count === 0}

                                onClick={() => handleCellClick(row.labName, cell.type)}

                                className={`w-full min-h-[32px] rounded-md flex items-center justify-center font-semibold transition ${

                                  cell.count === 0

                                    ? 'text-warm-300 cursor-default bg-warm-100/50'

                                    : selected

                                      ? 'ring-2 ring-accent-primary ring-offset-1 text-warm-900'

                                      : dimmed

                                        ? 'text-warm-500'

                                        : 'text-warm-800 hover:ring-1 hover:ring-warm-400'

                                }`}

                                style={

                                  cell.count > 0

                                    ? { backgroundColor: `${TYPE_COLORS[cell.type]}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` }

                                    : undefined

                                }

                                title={`${row.shortName} · ${TYPE_LABELS[cell.type]}：${cell.count} 门`}

                              >

                                {cell.count || '—'}

                              </button>

                            </td>

                          )

                        })}

                        <td className="p-1.5 text-center font-bold text-warm-600">{row.total}</td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="h-[300px] flex items-center justify-center text-sm text-warm-500">暂无数据</div>

          )}

        </div>



        <div className="glass rounded-2xl p-4">

          <h3 className="text-sm font-medium text-warm-700 mb-2">类型分布</h3>

          {Object.keys(typePieOption).length > 0 ? (

            <Chart option={typePieOption} height={300} onEvents={{ click: handleTypePieClick }} />

          ) : (

            <div className="h-[300px] flex items-center justify-center text-sm text-warm-500">暂无数据</div>

          )}

        </div>

      </div>



      <div className="grid grid-cols-2 gap-4">

        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-medium text-warm-700 mb-1">
            {labRankList.length === 1 ? '当前实训室 · 类型构成' : '实训室课程排名'}
          </h3>
          <p className="text-[11px] text-warm-500 mb-3">彩色条 = 通识/基础/核心/实践占比 · 点击行筛选</p>
          {labRankList.length > 0 ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
              {labRankList.map((item, i) => {
                const selected = lab === item.labName && !type
                return (
                  <button
                    key={item.labName}
                    type="button"
                    onClick={() => handleLabNameClick(item.labName)}
                    className={`w-full text-left p-2.5 rounded-xl transition border ${
                      selected
                        ? 'bg-accent-primary/10 border-accent-primary/30'
                        : 'bg-warm-100/80 border-transparent hover:bg-warm-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i < 3 ? 'bg-accent-primary/20 text-accent-primary' : 'bg-warm-200 text-warm-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{item.shortName}</span>
                      <span className="text-sm font-bold text-accent-primary shrink-0">{item.total} 门</span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-warm-200 ml-7">
                      {TYPE_ORDER.map((t) => {
                        const count = item.types[t] ?? 0
                        if (!count) return null
                        const w = (count / item.total) * 100
                        return (
                          <div
                            key={t}
                            style={{ width: `${w}%`, backgroundColor: TYPE_COLORS[t] }}
                            title={`${TYPE_LABELS[t]} ${count} 门`}
                          />
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-warm-500">暂无数据</div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">

          <h3 className="text-sm font-medium text-warm-700 mb-2">来源结构</h3>

          {Object.keys(sourcePieOption).length > 0 ? (

            <Chart option={sourcePieOption} height={220} />

          ) : (

            <div className="h-[220px] flex items-center justify-center text-sm text-warm-500">暂无数据</div>

          )}

        </div>

      </div>



      <div className="glass rounded-2xl p-4 space-y-4">

        <div className="relative">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />

          <input

            value={q}

            onChange={(e) => setQ(e.target.value)}

            placeholder="搜索课程名称、教材、平台、来源..."

            className={`${inputClass} pl-10 rounded-xl`}

          />

        </div>



        <div className="flex flex-wrap gap-3">

          <select value={lab} onChange={(e) => setLab(e.target.value)} className={selectClass}>

            <option value="">全部实训室</option>

            {data.labs.map((l) => (

              <option key={l.id} value={l.name}>

                {l.name}

              </option>

            ))}

          </select>



          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>

            <option value="">全部类型</option>

            {Object.entries(TYPE_LABELS).map(([k, v]) => (

              <option key={k} value={k}>

                {v}

              </option>

            ))}

          </select>



          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>

            <option value="">全部来源</option>

            <option value="vendor">厂商课程</option>

            <option value="university">高校/其他</option>

          </select>



          <div className="ml-auto flex gap-2">

            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded-lg text-sm ${view === 'list' ? 'bg-accent-primary/15 text-accent-primary' : 'glass text-warm-600'}`}
            >
              列表
            </button>

            <button

              onClick={() => setView('table')}

              className={`px-3 py-2 rounded-lg text-sm ${view === 'table' ? 'bg-accent-primary/15 text-accent-primary' : 'glass text-warm-600'}`}

            >

              表格

            </button>

          </div>

        </div>

      </div>



      {view === 'list' ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-warm-200/80">
          <p className="px-4 py-2 text-[11px] text-warm-500 bg-warm-50/80">
            默认折叠 · 点击课程行展开详情，联动实训室、师资、岗位三表数据
          </p>
          {filtered.slice(0, 200).map((c) => (
            <CourseAccordionItem
              key={c.id}
              course={c}
              lab={labByName.get(c.lab_name)}
              faculty={courseRelations.get(c.id)?.faculty ?? []}
              jobs={courseRelations.get(c.id)?.jobs ?? []}
              sharedCount={sharedMap.get(c.name) ?? 0}
              expanded={expandedCourseId === c.id}
              onToggle={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
            />
          ))}
        </div>
      ) : (

        <div className="glass rounded-2xl overflow-hidden">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-warm-300 text-warm-500 text-left">

                <th className="p-3">课程名称</th>

                <th className="p-3">实训室</th>

                <th className="p-3">类型</th>

                <th className="p-3">学时</th>

                <th className="p-3">来源</th>

              </tr>

            </thead>

            <tbody>

              {filtered.slice(0, 200).map((c) => {
                const isExpanded = expandedCourseId === c.id
                return (
                  <CourseTableRows
                    key={c.id}
                    course={c}
                    lab={labByName.get(c.lab_name)}
                    faculty={courseRelations.get(c.id)?.faculty ?? []}
                    jobs={courseRelations.get(c.id)?.jobs ?? []}
                    expanded={isExpanded}
                    onToggle={() => setExpandedCourseId(isExpanded ? null : c.id)}
                  />
                )
              })}

            </tbody>

          </table>

          {filtered.length > 200 && (

            <p className="p-3 text-center text-warm-500 text-xs">仅显示前 200 条，请缩小筛选范围</p>

          )}

        </div>

      )}



      {filtered.length === 0 && (

        <p className="text-center text-warm-500 py-8 text-sm">没有匹配的课程，请调整筛选条件</p>

      )}



    </div>
  )
}

function CourseAccordionItem({
  course: c,
  lab,
  faculty,
  jobs,
  sharedCount,
  expanded,
  onToggle,
}: {
  course: Course
  lab?: Lab
  faculty: FacultyTeacher[]
  jobs: JobProfile[]
  sharedCount: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className={expanded ? 'bg-accent-primary/[0.03]' : ''}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-warm-100/70 transition text-sm"
      >
        <span className="text-warm-400 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span
          className="shrink-0 text-[10px] px-1 py-0.5 rounded"
          style={{ backgroundColor: `${TYPE_COLORS[c.type]}33`, color: TYPE_COLORS[c.type] }}
        >
          {c.type_label.replace('专业', '').replace('通识课程', '通识')}
        </span>
        <span className="flex-1 font-medium truncate min-w-0">{c.name}</span>
        <span className="hidden sm:inline text-[11px] text-warm-500 truncate max-w-[88px]">{shortLab(c.lab_name)}</span>
        {c.is_vendor && <span className="text-[10px] text-accent-orange shrink-0">厂商</span>}
        {sharedCount >= 2 && (
          <span className="text-[10px] text-accent-gold shrink-0">{sharedCount}室共用</span>
        )}
        {c.hours != null && <span className="text-[11px] text-warm-500 shrink-0">{c.hours}学时</span>}
      </button>
      {expanded && (
        <CourseLinkedPanel course={c} lab={lab} faculty={faculty} jobs={jobs} />
      )}
    </div>
  )
}

function CourseTableRows({
  course: c,
  lab,
  faculty,
  jobs,
  expanded,
  onToggle,
}: {
  course: Course
  lab?: Lab
  faculty: FacultyTeacher[]
  jobs: JobProfile[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-warm-200 cursor-pointer transition ${expanded ? 'bg-accent-primary/5' : 'hover:bg-warm-100'}`}
      >
        <td className="p-2.5 font-medium">
          <span className="inline-flex items-center gap-1">
            {expanded ? <ChevronDown size={12} className="text-warm-400" /> : <ChevronRight size={12} className="text-warm-400" />}
            {c.name}
            {c.is_vendor && <span className="text-[10px] text-accent-orange">厂商</span>}
          </span>
        </td>
        <td className="p-2.5 text-warm-600 text-xs">{shortLab(c.lab_name)}</td>
        <td className="p-2.5 text-warm-600 text-xs">{c.type_label}</td>
        <td className="p-2.5 text-warm-600 text-xs">{c.hours ?? '—'}</td>
        <td className="p-2.5 text-warm-600 text-xs truncate max-w-[160px]">{c.source}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-warm-200 bg-warm-50/80">
          <td colSpan={5} className="p-3">
            <CourseLinkedPanel course={c} lab={lab} faculty={faculty} jobs={jobs} compact />
          </td>
        </tr>
      )}
    </>
  )
}

function CourseLinkedPanel({
  course: c,
  lab,
  faculty,
  jobs,
  compact,
}: {
  course: Course
  lab?: Lab
  faculty: FacultyTeacher[]
  jobs: JobProfile[]
  compact?: boolean
}) {
  const vd = c.vendor_detail
  return (
    <div className={`px-3 pb-3 ${compact ? '' : 'pl-8'} animate-fade-in-up`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        <section className="rounded-xl border border-warm-300/80 bg-warm-50/60 p-3">
          <h4 className="text-[11px] font-semibold text-warm-600 mb-2 flex items-center gap-1">
            <BookOpen size={12} /> 课程详情
          </h4>
          <dl className="space-y-1 text-xs">
            <Row k="来源" v={c.source} />
            <Row k="教材" v={c.textbook} />
            <Row k="平台" v={c.platform} />
            <Row k="学时" v={c.hours != null ? String(c.hours) : undefined} />
            {vd?.capability && <Row k="培养能力" v={vd.capability} />}
          </dl>
          {(c.description || vd?.description) && (
            <p className="text-[11px] text-warm-600 mt-2 line-clamp-3 leading-relaxed">
              {c.description || vd?.description}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-warm-300/80 bg-warm-50/60 p-3">
          <h4 className="text-[11px] font-semibold text-warm-600 mb-2 flex items-center gap-1">
            <Building2 size={12} /> 实训室
          </h4>
          {lab ? (
            <>
              <p className="text-sm font-medium text-warm-800">{shortLab(lab.name)}</p>
              <p className="text-[11px] text-warm-500 mt-1">
                共 {lab.course_counts.total} 门 · 厂商 {lab.vendor_course_count} 门
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(['general', 'foundation', 'core', 'practice'] as const).map((t) =>
                  lab.course_counts[t] > 0 ? (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${TYPE_COLORS[t]}22`, color: TYPE_COLORS[t] }}>
                      {TYPE_LABELS[t].replace('专业', '').slice(0, 2)} {lab.course_counts[t]}
                    </span>
                  ) : null,
                )}
              </div>
              <Link to={`/labs/${lab.id}`} className="text-[11px] text-accent-primary hover:underline mt-2 inline-block">
                查看实训室详情 →
              </Link>
            </>
          ) : (
            <p className="text-xs text-warm-500">{c.lab_name}</p>
          )}
        </section>

        <section className="rounded-xl border border-warm-300/80 bg-warm-50/60 p-3">
          <h4 className="text-[11px] font-semibold text-warm-600 mb-2 flex items-center gap-1">
            <Users size={12} /> 匹配师资
            <span className="font-normal text-warm-400">({faculty.length})</span>
          </h4>
          {faculty.length > 0 ? (
            <ul className="space-y-1">
              {faculty.map((t) => (
                <li key={t.id} className="text-xs flex items-center justify-between gap-2">
                  <span className="font-medium text-warm-800">{t.name}</span>
                  <span className="text-[10px] text-warm-500 shrink-0">{t.title_dim || t.source}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-warm-500">暂无匹配师资（按实训室 / 可授课程关联）</p>
          )}
        </section>

        <section className="rounded-xl border border-warm-300/80 bg-warm-50/60 p-3">
          <h4 className="text-[11px] font-semibold text-warm-600 mb-2 flex items-center gap-1">
            <Briefcase size={12} /> 关联岗位
            <span className="font-normal text-warm-400">({jobs.length})</span>
          </h4>
          {jobs.length > 0 ? (
            <ul className="space-y-1">
              {jobs.map((j) => (
                <li key={j.id} className="text-xs">
                  <span className="font-medium text-warm-800">{j.name}</span>
                  <span className="text-[10px] text-warm-500 ml-1">{j.category}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-warm-500">暂无岗位映射关联</p>
          )}
          {vd?.jobs && <p className="text-[10px] text-warm-500 mt-2">厂商标注岗位：{vd.jobs}</p>}
          <Link to="/jobs" className="text-[11px] text-accent-primary hover:underline mt-2 inline-block">
            岗位技能图谱 →
          </Link>
        </section>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v?.trim()) return null
  return (
    <div className="flex gap-1">
      <dt className="text-warm-500 shrink-0">{k}：</dt>
      <dd className="text-warm-800 break-words">{v}</dd>
    </div>
  )
}


