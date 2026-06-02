import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, Trophy, Award, Users, Briefcase, Layers, BookOpen } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Lab } from '../types'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import CourseCard from '../components/CourseCard'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import Chart, { warmChartBase, WARM_CHART } from '../components/Chart'
import type { Course } from '../types'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import {
  detailedCompetitionsForLab,
  detailedCertificatesForLab,
} from '../utils/certLink'
import { buildLabJobIndex } from '../utils/integrate'
import { useEcosystem } from '../context/EcosystemContext'
import { useCompCert } from '../context/CompCertContext'
import {
  designTrackCourseToDisplay,
  resolveDesignCourse,
  sumDesignTrackHours,
  trackCoursesForLabTier,
} from '../utils/curriculumLink'
import {
  CURRICULUM_TIERS,
  TIER_BY_ID,
  selectCoursesForTier,
  sumCourseHours,
  tierFitStatus,
  TIER_FIT_LABEL,
  type CurriculumTierId,
} from '../types/curriculumTier'

const TYPE_ORDER = ['general', 'foundation', 'core', 'practice'] as const

function countByType(courses: Course[]) {
  const counts = { general: 0, foundation: 0, core: 0, practice: 0, total: 0 }
  for (const c of courses) {
    if (c.type in counts && c.type !== 'other') {
      counts[c.type as keyof Omit<typeof counts, 'total'>] += 1
    }
    counts.total += 1
  }
  return counts
}

export default function LabDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data } = useData()
  const { data: design } = useCurriculumDesign()
  const { data: compCertData } = useCompCert()
  const { data: facultyData } = useFaculty()
  const { data: jobMapData } = useJobMap()
  const { setFocus } = useEcosystem()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Course | null>(null)
  const [coursesExpanded, setCoursesExpanded] = useState(false)

  const tierParam = searchParams.get('tier') as CurriculumTierId | null
  const tierFilter = tierParam && TIER_BY_ID[tierParam] ? tierParam : null

  const lab = useMemo(() => {
    if (!data || !id) return null
    return data.labs.find((l) => String(l.id) === id)
  }, [data, id])

  const allLabCourses = useMemo(() => {
    if (!data || !lab) return []
    return data.courses.filter((c) => c.lab_name === lab.name)
  }, [data, lab])

  const labTotalHours = useMemo(() => sumCourseHours(allLabCourses), [allLabCourses])

  const labSummary = useMemo(() => {
    if (!design || !lab) return null
    return design.labSummaries.find((s) => s.lab === lab.name) ?? null
  }, [design, lab])

  const designTierEntries = useMemo(() => {
    if (!design || !lab || !tierFilter) return null
    return trackCoursesForLabTier(design, lab.name, tierFilter)
  }, [design, lab, tierFilter])

  const usingDesignTier = Boolean(design && tierFilter && designTierEntries != null)

  const tierRecommended = useMemo(() => {
    if (!tierFilter || !data || !lab) return null
    if (usingDesignTier) {
      return (designTierEntries ?? []).map((entry, i) =>
        designTrackCourseToDisplay(
          entry,
          lab.name,
          resolveDesignCourse(entry.courseName, lab.name, data.courses, data.labs),
          i,
        ),
      )
    }
    return selectCoursesForTier(allLabCourses, TIER_BY_ID[tierFilter])
  }, [tierFilter, data, lab, usingDesignTier, designTierEntries, allLabCourses])

  const tierCourseCount = (tierId: CurriculumTierId) => {
    if (!labSummary) return null
    if (tierId === 'enterprise') return labSummary.enterpriseCount
    if (tierId === 'internship') return labSummary.internshipCount
    return labSummary.industryCount
  }

  useEffect(() => {
    if (lab) setFocus({ kind: 'lab', id: lab.name, label: lab.name })
  }, [lab?.id])

  useEffect(() => {
    setTypeFilter('all')
    setSelected(null)
    setCoursesExpanded(false)
  }, [id])

  const labCompetitions = useMemo(() => {
    if (!lab || !compCertData || !data) return []
    return detailedCompetitionsForLab(lab.name, compCertData, data.labs)
  }, [lab, compCertData, data])

  const labCertificates = useMemo(() => {
    if (!lab || !compCertData || !data) return []
    return detailedCertificatesForLab(lab.name, compCertData, data.labs)
  }, [lab, compCertData, data])

  const labFaculty = useMemo(() => {
    if (!lab || !facultyData) return []
    return facultyData.teachers
      .filter((t) => t.lab_list.includes(lab.name))
      .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
  }, [lab, facultyData])

  const labJobs = useMemo(() => {
    if (!lab) return []
    const names = new Map<string, string>()
    if (jobMapData && data) {
      const idx = buildLabJobIndex(jobMapData.jobs, data.labs)
      for (const j of idx.get(lab.name) ?? []) names.set(j, '岗位映射')
    }
    if (labSummary) {
      for (const j of labSummary.coreJobs) names.set(j, '核心岗位')
      for (const j of labSummary.importantJobs) if (!names.has(j)) names.set(j, '重要岗位')
      for (const j of labSummary.basicJobs) if (!names.has(j)) names.set(j, '基础岗位')
    }
    return [...names.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
      .map(([name, level]) => ({ name, level }))
  }, [lab, jobMapData, data, labSummary])

  const hasResourceLinks =
    labCompetitions.length > 0
    || labCertificates.length > 0
    || labFaculty.length > 0
    || labJobs.length > 0

  const displayCourses = useMemo(() => {
    if (!data || !lab) return []
    const base = tierFilter && tierRecommended ? tierRecommended : allLabCourses
    if (typeFilter === 'vendor') return base.filter((c) => c.is_vendor)
    if (typeFilter !== 'all') return base.filter((c) => c.type === typeFilter)
    return base
  }, [data, lab, typeFilter, tierFilter, tierRecommended, allLabCourses])

  const activeCounts = useMemo(() => {
    if (tierFilter && tierRecommended) return countByType(tierRecommended)
    return lab?.course_counts ?? { general: 0, foundation: 0, core: 0, practice: 0, total: 0 }
  }, [tierFilter, tierRecommended, lab])

  const setTier = (tierId: CurriculumTierId | null) => {
    if (tierId) setSearchParams({ tier: tierId })
    else setSearchParams({})
  }

  const funnelChart = useMemo(() => {
    const c = activeCounts
    return {
      ...warmChartBase(),
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'funnel' as const,
        left: '10%',
        width: '80%',
        sort: 'none' as const,
        gap: 4,
        label: { color: WARM_CHART.text, fontSize: 12 },
        data: TYPE_ORDER.map((t) => ({
          name: `${TYPE_LABELS[t]} (${c[t]})`,
          value: c[t] || 0,
          itemStyle: { color: TYPE_COLORS[t] },
        })).filter((d) => d.value > 0),
      }],
    }
  }, [activeCounts])

  if (!data || !lab) {
    return <div className="text-center py-20 text-warm-600">实训室不存在</div>
  }

  const tierHours = usingDesignTier && designTierEntries
    ? sumDesignTrackHours(designTierEntries)
    : tierRecommended
      ? sumCourseHours(tierRecommended)
      : 0

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <LabDetailNav labs={data.labs} current={lab} tierFilter={tierFilter} layout="header" />
        </div>
        <div className="text-right shrink-0">
          <div className="text-4xl font-bold text-gradient">{lab.course_counts.total}</div>
          <div className="text-sm text-warm-500">门课程 · 约 {labTotalHours || '—'} 学时</div>
          {lab.vendor_course_count > 0 && (
            <div className="text-xs text-warm-400">厂商 {lab.vendor_course_count} 门</div>
          )}
        </div>
      </header>

      <div className="glass rounded-xl p-4 border border-warm-300 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-warm-500 mr-1">体系层级</span>
          <FilterBtn active={!tierFilter} onClick={() => setTier(null)}>全部模块</FilterBtn>
          {CURRICULUM_TIERS.map((tier) => {
            const designCount = tierCourseCount(tier.id)
            const status = tierFitStatus(labTotalHours, tier)
            const badge = designCount != null
              ? (designCount > 0 ? `${designCount} 门` : '暂无')
              : TIER_FIT_LABEL[status]
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setTier(tier.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                  tierFilter === tier.id
                    ? 'text-white border-transparent'
                    : 'text-warm-600 border-warm-300 hover:bg-warm-100'
                }`}
                style={tierFilter === tier.id ? { backgroundColor: tier.color } : undefined}
              >
                {tier.shortLabel}
                <span className="ml-1 text-xs opacity-75">({badge})</span>
              </button>
            )
          })}
        </div>
        {tierFilter && tierRecommended && (
          <p className="text-xs text-warm-600 leading-relaxed">
            <strong className="text-warm-800">{TIER_BY_ID[tierFilter].label}</strong>
            ：{TIER_BY_ID[tierFilter].period} · {TIER_BY_ID[tierFilter].hours} · {TIER_BY_ID[tierFilter].format}。
            {usingDesignTier ? (
              <>
                已配置 <strong className="text-warm-800">{tierRecommended.length}</strong> 门教学模块
                {tierHours > 0 && <>（约 {tierHours} 学时）</>}
                <span className="text-accent-primary ml-1">· 来源：实训室课程体系设计</span>
              </>
            ) : (
              <>
                已推荐 {tierRecommended.length} 门教学模块（约 {tierHours} 学时）。
                {!design && <span className="text-warm-400 ml-1">（课程库学时估算，未加载设计表）</span>}
              </>
            )}
          </p>
        )}
        {tierFilter && usingDesignTier && tierRecommended?.length === 0 && (
          <p className="text-xs text-amber-700">该实训室在此层体系中暂无课程配置。</p>
        )}
      </div>

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
                {activeCounts[t]}
              </div>
              <div className="text-xs text-warm-600 mt-1">{TYPE_LABELS[t]}</div>
            </button>
          ))}
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs text-warm-500 mb-2">
            {tierFilter ? `${TIER_BY_ID[tierFilter].shortLabel} · 课程层次` : '课程体系分布'}
          </h3>
          <Chart option={funnelChart} height={180} />
        </div>
      </div>

      {hasResourceLinks && (
        <div className="glass rounded-xl p-4 border border-warm-300 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers size={16} className="text-accent-primary" />
            <h3 className="text-sm font-bold text-warm-900">
              资源要素联动
              <span className="font-normal text-warm-600 ml-2 text-xs">
                {[
                  labCompetitions.length > 0 && `${labCompetitions.length} 项竞赛`,
                  labCertificates.length > 0 && `${labCertificates.length} 张证书`,
                  labFaculty.length > 0 && `${labFaculty.length} 位师资`,
                  labJobs.length > 0 && `${labJobs.length} 个岗位`,
                ].filter(Boolean).join(' · ')}
              </span>
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {labCompetitions.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Trophy size={12} className="text-[#e65100]" />
                  关联竞赛
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
                  {labCompetitions.map((c) => (
                    <span
                      key={c.id}
                      title={[c.level, c.rating, c.organizer].filter(Boolean).join(' · ')}
                      className="px-2.5 py-1 rounded-lg bg-[#e65100]/10 text-xs text-[#bf360c] border border-[#e65100]/15"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {labCertificates.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Award size={12} className="text-[#00897b]" />
                  关联证书
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
                  {labCertificates.map((c) => (
                    <span
                      key={c.id}
                      title={[c.level, c.org, c.field].filter(Boolean).join(' · ')}
                      className="px-2.5 py-1 rounded-lg bg-[#00897b]/10 text-xs text-[#00695c] border border-[#00897b]/15"
                    >
                      {c.shortName || c.fullName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {labFaculty.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Users size={12} className="text-accent-green" />
                  关联师资
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
                  {labFaculty.map((t) => (
                    <span
                      key={t.id}
                      title={[t.title_dim, t.source, `${t.level}级`, t.field].filter(Boolean).join(' · ')}
                      className="px-2.5 py-1 rounded-lg bg-accent-green/10 text-xs text-accent-green border border-accent-green/20"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {labJobs.length > 0 && (
              <div>
                <h4 className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                  <Briefcase size={12} className="text-accent-primary" />
                  关联岗位
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin pr-1">
                  {labJobs.map(({ name, level }) => (
                    <span
                      key={name}
                      title={level}
                      className="px-2.5 py-1 rounded-lg bg-accent-primary/10 text-xs text-accent-primary border border-accent-primary/20"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <FilterBtn active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>全部</FilterBtn>
        {TYPE_ORDER.map((t) => (
          <FilterBtn key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
            {TYPE_LABELS[t]}
          </FilterBtn>
        ))}
        {!usingDesignTier && (
          <FilterBtn active={typeFilter === 'vendor'} onClick={() => setTypeFilter(typeFilter === 'vendor' ? 'all' : 'vendor')}>
            仅厂商课
          </FilterBtn>
        )}
      </div>

      <div className="glass rounded-xl border border-warm-300 overflow-hidden">
        <button
          type="button"
          onClick={() => setCoursesExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-warm-100/60 transition"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-warm-900">
            <BookOpen size={16} className="text-accent-primary" />
            课程列表
            <span className="font-normal text-warm-500">
              {displayCourses.length} 门
              {typeFilter !== 'all' && ` · 已筛选`}
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`text-warm-500 shrink-0 transition-transform ${coursesExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {coursesExpanded && (
          <div className="px-4 pb-4 border-t border-warm-200">
            {displayCourses.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 pt-4">
                {displayCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    onClick={() => {
                      setSelected(c)
                      setFocus({ kind: 'course', id: String(c.id), label: c.name, subtitle: c.lab_name })
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-500 text-center py-8">
                {tierFilter && usingDesignTier ? '该层体系暂无匹配课程' : '暂无课程'}
              </p>
            )}
          </div>
        )}
      </div>

      <CourseDetailDrawer course={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`px-3 py-1.5 rounded-lg text-sm transition ${
        active ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/40' : 'glass text-warm-600 hover:text-warm-900'
      }`}
    >
      {children}
    </button>
  )
}

function LabDetailNav({
  labs,
  current,
  tierFilter,
  layout = 'bar',
}: {
  labs: Lab[]
  current: Lab
  tierFilter: CurriculumTierId | null
  layout?: 'header' | 'bar'
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const idx = labs.findIndex((l) => l.id === current.id)
  const prevLab = idx > 0 ? labs[idx - 1] : null
  const nextLab = idx >= 0 && idx < labs.length - 1 ? labs[idx + 1] : null

  const goToLab = (target: Lab) => {
    setOpen(false)
    const q = new URLSearchParams()
    q.set('lab', target.name)
    if (tierFilter) q.set('tier', tierFilter)
    navigate(`/labs/${target.id}?${q.toString()}`)
  }

  useEffect(() => {
    setOpen(false)
  }, [current.id])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const navBtnClass =
    'p-2 rounded-xl border border-warm-300 text-warm-600 hover:bg-warm-100 hover:border-accent-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0'
  const selectClass =
    'w-full min-w-0 px-3 py-2 rounded-xl border border-warm-300 bg-warm-50 text-warm-900 focus:outline-none focus:border-accent-primary/50 cursor-pointer'
  const labOptions = labs.map((l) => (
    <option key={l.id} value={l.id}>
      {l.name}
    </option>
  ))

  if (layout === 'header') {
    return (
      <div ref={rootRef} className="flex items-center gap-2 min-w-0 max-w-3xl">
        <button
          type="button"
          onClick={() => prevLab && goToLab(prevLab)}
          disabled={!prevLab}
          title={prevLab ? `上一个：${prevLab.name}` : undefined}
          aria-label="上一个实训室"
          className={navBtnClass}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border bg-warm-50 text-left transition ${
              open ? 'border-accent-primary/50 ring-2 ring-accent-primary/20' : 'border-warm-300 hover:border-accent-primary/40 hover:bg-warm-100/70'
            }`}
          >
            <span className="text-xl font-bold text-warm-900 truncate flex-1" title={current.name}>
              {current.name}
            </span>
            <ChevronDown
              size={20}
              className={`shrink-0 text-warm-500 transition-transform ${open ? 'rotate-180 text-accent-primary' : ''}`}
            />
          </button>
          {open && (
            <ul
              role="listbox"
              aria-label="实训室列表"
              className="absolute z-40 top-full left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-warm-300 bg-[#fffdf9] shadow-lg py-1 scrollbar-thin"
            >
              {labs.map((l) => {
                const active = l.id === current.id
                return (
                  <li key={l.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => goToLab(l)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition ${
                        active
                          ? 'bg-accent-primary/10 text-accent-primary font-semibold'
                          : 'text-warm-800 hover:bg-warm-100'
                      }`}
                    >
                      {l.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => nextLab && goToLab(nextLab)}
          disabled={!nextLab}
          title={nextLab ? `下一个：${nextLab.name}` : undefined}
          aria-label="下一个实训室"
          className={navBtnClass}
        >
          <ChevronRight size={20} />
        </button>
        <span className="text-sm text-warm-400 tabular-nums shrink-0 hidden sm:inline">
          {idx + 1} / {labs.length}
        </span>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl px-3 py-2.5 border border-warm-300 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-warm-500 shrink-0">切换实训室</span>
      <button
        type="button"
        onClick={() => prevLab && goToLab(prevLab)}
        disabled={!prevLab}
        title={prevLab ? prevLab.name : undefined}
        className={`${navBtnClass} p-1.5 rounded-lg`}
      >
        <ChevronLeft size={18} />
      </button>
      <select
        value={current.id}
        onChange={(e) => {
          const target = labs.find((l) => l.id === Number(e.target.value))
          if (target) goToLab(target)
        }}
        className={`${selectClass} flex-1 min-w-[12rem] max-w-md text-sm`}
      >
        {labOptions}
      </select>
      <button
        type="button"
        onClick={() => nextLab && goToLab(nextLab)}
        disabled={!nextLab}
        title={nextLab ? nextLab.name : undefined}
        className={`${navBtnClass} p-1.5 rounded-lg`}
      >
        <ChevronRight size={18} />
      </button>
      <span className="text-xs text-warm-400 ml-auto tabular-nums">
        {idx + 1} / {labs.length}
      </span>
    </div>
  )
}
