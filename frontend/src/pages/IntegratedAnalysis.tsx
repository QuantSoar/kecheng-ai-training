import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Users, AlertTriangle, Briefcase,
  Layers, ExternalLink, Trophy, ChevronDown,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useJobMap } from '../context/JobMapContext'
import { useCompCert } from '../context/CompCertContext'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import JobMatchingFlow from '../components/JobMatchingFlow'
import GapDiagnosisTable from '../components/GapDiagnosisTable'
import { TYPE_COLORS, TYPE_LABELS } from '../types'
import type { Course } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import { selectClass } from '../styles/form'
import { useCrossNavState, buildCrossNavUrl } from '../utils/crossNav'
import { useEcosystem } from '../context/EcosystemContext'
import {
  buildLabIntegrations,
  MATCH_COLORS,
  facultyCanTeachCourse,
  type LabIntegration,
} from '../utils/integrate'

type LabScope = 'all' | 'attention' | 'low-map' | 'good'

const LAB_SCOPE_OPTIONS: { id: LabScope; label: string; needsFaculty?: boolean }[] = [
  { id: 'all', label: '全部' },
  { id: 'attention', label: '待关注', needsFaculty: true },
  { id: 'low-map', label: '映射偏低', needsFaculty: true },
  { id: 'good', label: '匹配良好', needsFaculty: true },
]

function labsInScope(items: LabIntegration[], scope: LabScope): LabIntegration[] {
  if (scope === 'attention') {
    return items.filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy' || i.strictCoveragePct < 40)
  }
  if (scope === 'low-map') {
    return items.filter((i) => i.strictCoveragePct < 40)
  }
  if (scope === 'good') {
    return items.filter((i) => i.matchLevel === 'good' || i.matchLevel === 'faculty-heavy')
  }
  return items
}

const TYPE_ORDER = ['general', 'foundation', 'core', 'practice'] as const

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
  const { data: compCertData } = useCompCert()
  const { params, setParams } = useCrossNavState()
  const { setFocus } = useEcosystem()

  const [lab, setLab] = useState('')
  const [labScope, setLabScope] = useState<LabScope>('all')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyTeacher | null>(null)

  useEffect(() => {
    if (params.lab) setLab(params.lab)
  }, [])

  useEffect(() => {
    const nextLab = lab || undefined
    const nextJob = params.job
    if (nextLab !== params.lab || nextJob !== params.job) {
      setParams({ lab: nextLab, job: nextJob }, true)
    }
  }, [lab])

  const integrations = useMemo(() => {
    if (!data) return []
    return buildLabIntegrations(data.labs, data.courses, facultyData?.teachers ?? [], {
      jobs: jobMapData?.jobs,
      compCert: compCertData,
    })
  }, [data, facultyData, jobMapData, compCertData])

  const scopedLabs = useMemo(
    () => labsInScope(integrations, facultyData ? labScope : 'all'),
    [integrations, labScope, facultyData],
  )

  useEffect(() => {
    if (!lab) return
    if (!scopedLabs.some((i) => i.lab.name === lab)) setLab('')
  }, [lab, scopedLabs])

  const activeLab = useMemo(() => {
    if (!lab) return null
    return integrations.find((i) => i.lab.name === lab) ?? null
  }, [lab, integrations])

  const summary = useMemo(() => {
    const totalCourses = data?.meta.total_courses ?? 0
    const totalFaculty = facultyData?.meta.total_teachers ?? 0
    const totalJobs = jobMapData?.meta.total_jobs ?? 0
    const totalCompetitions = compCertData?.meta.total_competitions ?? 0
    const totalCertificates = compCertData?.meta.total_certificates ?? 0
    const gapLabs = integrations.filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy').length
    const goodLabs = integrations.filter((i) => i.matchLevel === 'good' || i.matchLevel === 'faculty-heavy').length
    const avgCoverage = integrations.length
      ? Math.round(integrations.reduce((s, i) => s + i.strictCoveragePct, 0) / integrations.length)
      : 0
    const totalShared = integrations.reduce((s, i) => s + i.sharedCourseCount, 0)
    const vendorTotal = data?.meta.total_vendor_courses ?? 0
    return { totalCourses, totalFaculty, totalJobs, totalCompetitions, totalCertificates, gapLabs, goodLabs, avgCoverage, totalShared, vendorTotal }
  }, [data, facultyData, jobMapData, compCertData, integrations])

  const gapItems = useMemo(
    () => integrations
      .filter((i) => i.matchLevel === 'gap' || i.matchLevel === 'course-heavy' || i.strictCoveragePct < 40)
      .sort((a, b) => a.strictCoveragePct - b.strictCoveragePct),
    [integrations],
  )

  const scopeCounts = useMemo(() => ({
    all: integrations.length,
    attention: labsInScope(integrations, 'attention').length,
    'low-map': labsInScope(integrations, 'low-map').length,
    good: labsInScope(integrations, 'good').length,
  }), [integrations])

  const scrollToGap = () => {
    document.getElementById('gap-diagnosis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!data) return null

  return (
    <div className="space-y-5">
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

      {!compCertData && (
        <div className="glass rounded-xl p-4 flex items-center gap-3 border border-warm-300">
          <Trophy className="text-warm-500 shrink-0" size={20} />
          <p className="text-sm text-warm-600">竞赛·证书表未加载，竞赛/证书联动不可用。请上传第四张 Excel 或放置 certs.xlsx。</p>
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

      <div className="glass rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-warm-500 shrink-0">聚焦实训室</span>
          <div className="relative min-w-[12rem]">
            <select
              value={lab}
              onChange={(e) => setLab(e.target.value)}
              className={`${selectClass} w-full pr-8`}
            >
              <option value="">选择实训室查看详情…</option>
              {scopedLabs.map((i) => (
                <option key={i.lab.id} value={i.lab.name}>
                  {i.lab.name.replace('实训室', '').replace('实验室', '')}
                  {facultyData ? ` · 映射 ${i.strictCoveragePct}%` : ` · ${i.courses.length} 门课`}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LAB_SCOPE_OPTIONS.map(({ id, label, needsFaculty }) => {
              const disabled = needsFaculty && !facultyData
              const active = labScope === id
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setLabScope(id)}
                  title={disabled ? '需加载师资数据' : undefined}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition border ${
                    active
                      ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/35'
                      : 'glass text-warm-600 border-warm-300 hover:text-warm-900 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {label}
                  <span className="ml-1 tabular-nums opacity-75">{scopeCounts[id]}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-warm-200 text-xs">
          <span className="text-warm-500 shrink-0">快捷入口</span>
          <Link to="/labs" className="text-accent-primary hover:underline">实训室全景</Link>
          <Link to="/jobs" className="text-accent-primary hover:underline">岗位图谱</Link>
          <Link to="/network" className="text-accent-primary hover:underline">课程图谱</Link>
          <button type="button" onClick={scrollToGap} className="text-accent-orange hover:underline">
            缺口诊断{gapItems.length > 0 ? `（${gapItems.length} 室）` : ''}
          </button>
          {lab && (
            <button type="button" onClick={() => setLab('')} className="text-warm-500 hover:text-warm-800 ml-auto">
              清除选中
            </button>
          )}
        </div>
      </div>

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
              <Link to={buildCrossNavUrl('/network', { lab: activeLab.lab.name })} className="text-xs px-3 py-1.5 rounded-lg bg-warm-100 text-accent-primary hover:bg-warm-200 inline-flex items-center gap-1">
                课程图谱 <ExternalLink size={12} />
              </Link>
              <Link to={buildCrossNavUrl('/labs/compcerts', { lab: activeLab.lab.name })} className="text-xs px-3 py-1.5 rounded-lg bg-warm-100 text-accent-primary hover:bg-warm-200 inline-flex items-center gap-1">
                竞赛·证书 <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {(activeLab.competitionCount > 0 || activeLab.certificateCount > 0) && (
            <div className="flex flex-wrap gap-4 text-xs">
              {activeLab.competitionCount > 0 && (
                <div>
                  <p className="text-warm-500 mb-1">关联赛事 {activeLab.competitionCount}</p>
                  <div className="flex flex-wrap gap-1">
                    {activeLab.linkedCompetitions.slice(0, 5).map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {activeLab.certificateCount > 0 && (
                <p className="text-teal-700">关联证书 {activeLab.certificateCount} 张</p>
              )}
            </div>
          )}

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
                    to={buildCrossNavUrl('/jobs', { job: j, lab: activeLab.lab.name })}
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
                      onClick={() => {
                        setSelectedCourse(c)
                        setFocus({ kind: 'course', id: String(c.id), label: c.name, subtitle: c.lab_name })
                      }}
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
                    onClick={() => {
                      setSelectedFaculty(t)
                      setFocus({ kind: 'faculty', id: String(t.id), label: t.name, subtitle: t.level })
                    }}
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

      <JobMatchingFlow />

      <div id="gap-diagnosis">
        <GapDiagnosisTable items={gapItems} facultyLoaded={!!facultyData} />
      </div>

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
