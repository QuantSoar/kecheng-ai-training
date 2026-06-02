import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Layers, Target, BookOpen, Cpu, Database, Shield,
  Palette, Bot, LineChart, Users, Wrench, Sparkles, ChevronRight, Clock, GraduationCap, ExternalLink,
  Building2, Search, Trophy, Award,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useJobMap } from '../context/JobMapContext'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import { useCompCert } from '../context/CompCertContext'
import { useCurriculumDesign } from '../context/CurriculumDesignContext'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import JobCurriculumTracks from '../components/JobCurriculumTracks'
import {
  JOB_CATEGORY_COLORS,
  LEVEL_LABELS,
  type JobProfile,
  type JobSkillItem,
  type LabJobCourseRow,
  type LabLinkLevel,
} from '../types/jobMap'
import type { Course, Lab } from '../types'
import { resolveCourse, resolveLab } from '../utils/jobLink'
import {
  detailedCompetitionsForJob,
  detailedCertificatesForLab,
} from '../utils/certLink'
import { buildLabIntegrations } from '../utils/integrate'
import { useEcosystem } from '../context/EcosystemContext'
import { useCrossNavState } from '../utils/crossNav'
import { selectClass } from '../styles/form'

function shortLab(name: string) {
  return name.replace('实训室', '').replace('实验室', '')
}

function JobSelectorToolbar({
  jobs,
  categories,
  category,
  onCategoryChange,
  selectedName,
  onSelect,
  search,
  onSearchChange,
  embedded = false,
}: {
  jobs: JobProfile[]
  categories: string[]
  category: string
  onCategoryChange: (c: string) => void
  selectedName: string
  onSelect: (name: string) => void
  search: string
  onSearchChange: (q: string) => void
  embedded?: boolean
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.trim().toLowerCase()
    return jobs.filter(
      (j) => j.name.toLowerCase().includes(q) || j.category.toLowerCase().includes(q),
    )
  }, [jobs, search])

  const jobOptions = useMemo(() => {
    if (!selectedName || filtered.some((j) => j.name === selectedName)) return filtered
    const current = jobs.find((j) => j.name === selectedName)
    return current ? [current, ...filtered] : filtered
  }, [filtered, jobs, selectedName])

  const currentIndex = jobOptions.findIndex((j) => j.name === selectedName)

  const goPrev = () => {
    if (jobOptions.length < 2) return
    const idx = currentIndex <= 0 ? jobOptions.length - 1 : currentIndex - 1
    onSelect(jobOptions[idx].name)
  }

  const goNext = () => {
    if (jobOptions.length < 2) return
    const idx = currentIndex < 0 || currentIndex >= jobOptions.length - 1 ? 0 : currentIndex + 1
    onSelect(jobOptions[idx].name)
  }

  return (
    <div className={
      embedded
        ? 'px-4 py-3 bg-warm-50/90 border-b border-warm-300 space-y-2'
        : 'glass rounded-2xl p-4 border border-accent-primary/20 space-y-3'
    }>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`${embedded ? 'text-xs' : 'text-sm'} font-medium text-warm-800 flex items-center gap-2`}>
          <Briefcase size={embedded ? 14 : 16} className="text-accent-primary shrink-0" />
          选择岗位
          <span className="text-xs font-normal text-warm-500">
            {embedded ? '切换后图谱与下方流程同步更新' : '切换后上方技能图谱与下方匹配流程同步更新'}
          </span>
        </p>
        <span className="text-xs text-warm-500 shrink-0">
          {currentIndex >= 0 ? `${currentIndex + 1} / ${jobOptions.length}` : `共 ${jobOptions.length} 个`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={jobOptions.length < 2}
          className="p-2 rounded-lg border border-warm-300 bg-warm-50 hover:bg-warm-100 disabled:opacity-40 transition"
          aria-label="上一个岗位"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`${selectClass} min-w-[140px]`}
        >
          <option value="">全部大类</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={selectedName}
          onChange={(e) => onSelect(e.target.value)}
          className={`${selectClass} flex-1 min-w-[220px] font-medium text-accent-primary`}
        >
          {jobOptions.map((j) => (
            <option key={j.name} value={j.name}>{j.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={goNext}
          disabled={jobOptions.length < 2}
          className="p-2 rounded-lg border border-warm-300 bg-warm-50 hover:bg-warm-100 disabled:opacity-40 transition"
          aria-label="下一个岗位"
        >
          <ChevronRight size={18} />
        </button>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索岗位…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-warm-300 bg-warm-50 focus:outline-none focus:border-accent-primary/50"
          />
        </div>
      </div>
    </div>
  )
}

const LAB_LEVEL_ORDER: Record<LabLinkLevel, number> = {
  core: 0,
  important: 1,
  basic: 2,
  none: 3,
}

function sortLabLinks(links: { lab: string; level: LabLinkLevel }[]) {
  return [...links].sort((a, b) => LAB_LEVEL_ORDER[a.level] - LAB_LEVEL_ORDER[b.level])
}

const MAP = {
  primary: '#c45c26',
  primaryDark: '#9a4418',
  primaryLight: '#faf0e6',
  primaryBorder: '#e8dcc8',
  gradientFrom: '#e07a3a',
  gradientTo: '#c45c26',
  muted: '#7a6555',
  subtitle: '#9a7b5f',
} as const

const LEVEL_THEME = {
  junior: {
    label: '初级',
    header: 'bg-[#9e9e9e]',
    box: 'bg-[#f5f5f5] border-[#bdbdbd]',
    text: 'text-[#424242]',
    dot: 'bg-[#9e9e9e]',
    course: 'bg-[#eeeeee] border-[#bdbdbd] text-[#616161]',
  },
  mid: {
    label: '中级',
    header: 'bg-[#d97706]',
    box: 'bg-[#fff8f0] border-[#e8b896]',
    text: 'text-[#7a4418]',
    dot: 'bg-[#d97706]',
    course: 'bg-[#fff5eb] border-[#e8b896] text-[#9a4418]',
  },
  senior: {
    label: '高级',
    header: 'bg-[#5b7fa5]',
    box: 'bg-[#eef3f8] border-[#a8bdd4]',
    text: 'text-[#3d5a73]',
    dot: 'bg-[#5b7fa5]',
    course: 'bg-[#eef3f8] border-[#a8bdd4] text-[#5b7fa5]',
  },
} as const

const LINK_BADGE: Record<LabLinkLevel, { label: string; cls: string }> = {
  core: { label: '● 核心', cls: 'bg-accent-primary text-white' },
  important: { label: '◐ 重要', cls: 'bg-accent-secondary text-white' },
  basic: { label: '○ 基础', cls: 'bg-warm-400 text-white' },
  none: { label: '', cls: '' },
}

function domainIcon(domain: string): LucideIcon {
  const d = domain.toLowerCase()
  if (d.includes('产品') || d.includes('设计')) return Palette
  if (d.includes('数据') || d.includes('标注')) return Database
  if (d.includes('安全')) return Shield
  if (d.includes('运维') || d.includes('部署') || d.includes('平台')) return Wrench
  if (d.includes('算法') || d.includes('模型') || d.includes('训练')) return Cpu
  if (d.includes('agent') || d.includes('智能体')) return Bot
  if (d.includes('商业') || d.includes('交付') || d.includes('项目')) return Briefcase
  if (d.includes('运营')) return LineChart
  if (d.includes('协作') || d.includes('团队')) return Users
  return Target
}

function skillSubtitle(skill: JobSkillItem, jobKeywords: string): string {
  if (skill.labs.length) return skill.labs.slice(0, 2).join(' · ')
  const kw = jobKeywords.split(/[,，/]/).map((s) => s.trim()).filter(Boolean)
  if (kw.length) return kw.slice(0, 3).join(' · ')
  const brief = skill.junior.slice(0, 36)
  return brief ? `${brief}${skill.junior.length > 36 ? '…' : ''}` : skill.domain
}

function splitBullets(text: string): string[] {
  if (!text) return []
  return text.split(/[。；;]\s*/).map((s) => s.trim()).filter(Boolean)
}

function LevelBox({ level, text, showArrow }: { level: keyof typeof LEVEL_THEME; text: string; showArrow?: boolean }) {
  const t = LEVEL_THEME[level]
  const bullets = splitBullets(text)
  return (
    <div className="flex items-center flex-1 min-w-0">
      {showArrow && (
        <div className="shrink-0 px-1 text-[#bdbdbd]">
          <ChevronRight size={18} strokeWidth={2.5} />
        </div>
      )}
      <div className={`flex-1 rounded-xl border-2 px-3 py-2.5 min-h-[72px] ${t.box}`}>
        {bullets.length > 1 ? (
          <ul className={`text-[11px] leading-relaxed space-y-1 ${t.text}`}>
            {bullets.map((b) => (
              <li key={b} className="flex gap-1.5">
                <span className="shrink-0">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-[11px] leading-relaxed ${t.text}`}>{text || '—'}</p>
        )}
      </div>
    </div>
  )
}

function CourseColumn({
  courses,
  resolveCourseByName,
  onCourseClick,
}: {
  courses: string[]
  resolveCourseByName: (name: string) => Course | null
  onCourseClick: (course: Course) => void
}) {
  const levels = ['junior', 'mid', 'senior'] as const
  if (!courses.length) {
    return <div className="text-[11px] text-warm-500/50 py-4 text-center">—</div>
  }
  return (
    <div className="space-y-1.5 py-1">
      {courses.map((c, i) => {
        const lv = levels[i % 3]
        const t = LEVEL_THEME[lv]
        const matched = resolveCourseByName(c)
        const baseCls = `flex items-start gap-1.5 text-[10px] leading-snug px-2 py-1.5 rounded-lg border ${t.course}`
        if (matched) {
          return (
            <button
              key={`${c}-${i}`}
              type="button"
              onClick={() => onCourseClick(matched)}
              className={`${baseCls} w-full text-left hover:brightness-95 cursor-pointer transition`}
              title={`${matched.lab_name} · 点击查看详情`}
            >
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${t.dot}`} />
              <span className="underline-offset-2 hover:underline">{c}</span>
            </button>
          )
        }
        return (
          <div key={`${c}-${i}`} className={`${baseCls} opacity-60`} title="未在课程库中匹配">
            <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${t.dot}`} />
            <span>{c}</span>
          </div>
        )
      })}
    </div>
  )
}

function JobInfographicLinkage({
  job,
  labs,
  labCourses,
  compCertData,
  allJobs,
  selectedLabCanonical,
  onSelectLab,
  onFocus,
}: {
  job: JobProfile
  labs: Lab[]
  labCourses: LabJobCourseRow[]
  compCertData: import('../types/compCert').CompCertData | null | undefined
  allJobs: JobProfile[]
  selectedLabCanonical: string | null
  onSelectLab: (lab: string) => void
  onFocus: (ref: import('../utils/ecosystemIndex').EntityRef) => void
}) {
  const sortedLinks = sortLabLinks(job.labLinks)

  const jobComps = compCertData ? detailedCompetitionsForJob(job.name, compCertData, allJobs).slice(0, 8) : []

  const labCertItems = useMemo(() => {
    if (!compCertData) return []
    const seen = new Set<number>()
    const out: { cert: import('../types/compCert').CertificateItem; lab: string }[] = []
    for (const { lab } of sortLabLinks(job.labLinks)) {
      const canonical = resolveLab(lab, labs)?.name ?? lab
      for (const c of detailedCertificatesForLab(canonical, compCertData, labs)) {
        if (seen.has(c.id)) continue
        seen.add(c.id)
        out.push({ cert: c, lab: canonical })
        if (out.length >= 8) return out
      }
    }
    return out
  }, [compCertData, job.labLinks, labs])

  return (
    <>
      <div className="text-white text-sm font-bold px-4 py-2 flex items-center justify-between" style={{ backgroundColor: MAP.primary }}>
        <span>资源联动 · 实训室 · 证书 · 竞赛</span>
        <span className="text-[10px] font-normal opacity-90">点击条目可跳转下方匹配流程</span>
      </div>
      <div className="grid md:grid-cols-3 gap-0 bg-[#fafafa] divide-y md:divide-y-0 md:divide-x divide-[#e0e0e0]">
        {/* 实训室 */}
        <div className="p-4">
          <h4 className="text-xs font-bold text-warm-800 flex items-center gap-1.5 mb-2">
            <Building2 size={14} className="text-accent-primary" />
            关联实训室
            <span className="font-normal text-warm-500">({sortedLinks.length})</span>
          </h4>
          {sortedLinks.length === 0 ? (
            <p className="text-[11px] text-warm-500">暂无关联实训室</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sortedLinks.map(({ lab, level }) => {
                const canonical = resolveLab(lab, labs)?.name ?? lab
                const isSelected = selectedLabCanonical === canonical
                const row = labCourses.find((r) => r.lab === lab || resolveLab(r.lab, labs)?.name === canonical)
                const badge = LINK_BADGE[level]
                return (
                  <button
                    key={lab}
                    type="button"
                    onClick={() => { onSelectLab(lab); onFocus({ kind: 'lab', id: canonical, label: canonical }) }}
                    className={`text-left px-2 py-1.5 rounded-lg border text-[11px] transition max-w-full ${
                      isSelected
                        ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                        : 'border-warm-200 bg-white hover:border-accent-primary/30 text-warm-800'
                    }`}
                  >
                    {badge.label && (
                      <span className={`text-[9px] px-1 rounded mr-1 ${badge.cls}`}>{badge.label.trim()}</span>
                    )}
                    <span className="font-medium">{shortLab(canonical)}</span>
                    {row && (
                      <span className="text-warm-500 ml-1">· {row.courses.length}课</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 证书 */}
        <div className="p-4">
          <h4 className="text-xs font-bold text-warm-800 flex items-center gap-1.5 mb-2">
            <Award size={14} className="text-teal-700" />
            推荐证书
            <span className="font-normal text-warm-500">({labCertItems.length}{compCertData ? '' : ' · 未加载'})</span>
          </h4>
          {!compCertData ? (
            <p className="text-[11px] text-warm-500">上传竞赛·证书表后显示</p>
          ) : labCertItems.length === 0 ? (
            <p className="text-[11px] text-warm-500">关联实训室暂无证书映射</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
              {labCertItems.map(({ cert, lab }) => (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => onFocus({ kind: 'certificate', id: cert.fullName, label: cert.shortName || cert.fullName, subtitle: cert.org })}
                  className="w-full text-left px-2 py-1.5 rounded-lg border border-warm-200 bg-white hover:border-teal-300/60 text-[11px] transition"
                >
                  <span className="font-medium text-warm-900 line-clamp-1">{cert.shortName || cert.fullName}</span>
                  <span className="text-warm-500 ml-1">· {shortLab(lab)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 竞赛 */}
        <div className="p-4">
          <h4 className="text-xs font-bold text-warm-800 flex items-center gap-1.5 mb-2">
            <Trophy size={14} className="text-orange-600" />
            推荐竞赛
            <span className="font-normal text-warm-500">({jobComps.length}{compCertData ? '' : ' · 未加载'})</span>
          </h4>
          {!compCertData ? (
            <p className="text-[11px] text-warm-500">上传竞赛·证书表后显示</p>
          ) : jobComps.length === 0 ? (
            <p className="text-[11px] text-warm-500">该岗位暂无竞赛映射</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
              {jobComps.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onFocus({ kind: 'competition', id: c.name, label: c.name, subtitle: c.category })}
                  className="w-full text-left px-2 py-1.5 rounded-lg border border-warm-200 bg-white hover:border-orange-300/60 text-[11px] transition"
                >
                  <span className="font-medium text-warm-900 line-clamp-1">{c.name}</span>
                  {c.rating && <span className="text-orange-600 ml-1 text-[10px]">{c.rating}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SkillMapInfographic({
  job,
  resolveCourseByName,
  onCourseClick,
  embedded = false,
  labs = [],
  labCourses = [],
  compCertData,
  curriculumData,
  allJobs = [],
  selectedLabCanonical = null,
  onSelectLab,
  onFocus,
}: {
  job: JobProfile
  resolveCourseByName: (name: string) => Course | null
  onCourseClick: (course: Course) => void
  embedded?: boolean
  labs?: Lab[]
  labCourses?: LabJobCourseRow[]
  compCertData?: import('../types/compCert').CompCertData | null
  curriculumData?: import('../types/curriculumDesign').CurriculumDesignData | null
  allJobs?: JobProfile[]
  selectedLabCanonical?: string | null
  onSelectLab?: (lab: string) => void
  onFocus?: (ref: import('../utils/ecosystemIndex').EntityRef) => void
}) {
  const shortName = job.name.length > 8 ? job.name.replace(/工程师|专家|经理|专员/g, '').trim() : job.name

  return (
    <div className={embedded ? 'bg-warm-100' : 'rounded-2xl overflow-hidden shadow-xl border border-warm-300 bg-warm-100'}>
      {/* 顶部标题 */}
      <div className="relative bg-white px-6 py-5 border-b-4" style={{ borderColor: MAP.primary }}>
        <h2 className="text-center text-2xl md:text-3xl font-bold tracking-wide" style={{ color: MAP.primaryDark }}>
          {job.name} 岗位技能图谱
        </h2>
        <p className="text-center text-xs mt-2" style={{ color: MAP.subtitle }}>
          {job.category} · {job.heat} · {job.keywords || '能力分层培养路径'}
        </p>
        <div className="absolute right-4 top-4 flex flex-col gap-1 text-[10px]">
          {(['junior', 'mid', 'senior'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-[#616161]">
              <span className={`w-3 h-3 rounded-sm ${LEVEL_THEME[k].header}`} />
              {LEVEL_THEME[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* 列头 */}
      <div className="grid grid-cols-[88px_1fr] text-white text-xs font-bold" style={{ backgroundColor: MAP.primary }}>
        <div className="py-2.5 text-center border-r" style={{ borderColor: MAP.primaryDark }}>岗位能力项</div>
        <div className="grid grid-cols-[minmax(200px,240px)_1fr_1fr_1fr_minmax(160px,200px)]">
          <div className="py-2.5 px-2 border-r" style={{ borderColor: MAP.primaryDark }}>能力域</div>
          {LEVEL_LABELS.map((l) => (
            <div key={l} className="py-2.5 text-center border-r" style={{ borderColor: MAP.primaryDark }}>分层技能点 · {l}</div>
          ))}
          <div className="py-2.5 text-center flex items-center justify-center gap-1">
            <BookOpen size={12} /> 推荐课程
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1100px] grid grid-cols-[88px_1fr]">
          {/* 左侧大圆 — 岗位锚点 */}
          <div className="relative flex items-center justify-center py-8 border-r border-warm-300" style={{ backgroundColor: MAP.primaryLight }}>
            <div className="absolute inset-y-0 right-0 w-px bg-warm-300" />
            <div
              className="w-[72px] h-[72px] rounded-full shadow-lg flex flex-col items-center justify-center text-white text-center p-1"
              style={{ background: `linear-gradient(to bottom right, ${MAP.gradientFrom}, ${MAP.gradientTo})` }}
            >
              <Sparkles size={18} className="mb-0.5 opacity-90" />
              <span className="text-[10px] font-bold leading-tight">{shortName}</span>
            </div>
          </div>

          {/* 技能行 */}
          <div className="relative">
            {/* 连接线 */}
            <div className="absolute left-[28px] top-0 bottom-0 w-0.5 bg-[#bdbdbd]/60 z-0" />

            {job.skills.map((skill, idx) => {
              const Icon = domainIcon(skill.domain)
              const isLast = idx === job.skills.length - 1
              return (
                <div
                  key={`${skill.domain}-${idx}`}
                  className={`relative grid grid-cols-[minmax(200px,240px)_1fr_1fr_1fr_minmax(160px,200px)] items-stretch bg-white/80 ${!isLast ? 'border-b border-[#e0e0e0]' : ''}`}
                >
                  {/* 能力域：圆 + 胶囊标签 */}
                  <div className="flex items-center gap-2 p-3 border-r border-warm-200 relative z-10">
                    <div
                      className="shrink-0 w-14 h-14 rounded-full shadow-md flex items-center justify-center text-white ring-4 ring-white"
                      style={{ background: `linear-gradient(to bottom right, ${MAP.gradientFrom}, ${MAP.gradientTo})` }}
                    >
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="inline-block rounded-full text-white px-3 py-1 text-xs font-bold shadow-sm"
                        style={{ backgroundColor: MAP.primary }}
                      >
                        {skill.domain}
                      </div>
                      <p className="text-[10px] mt-1.5 leading-snug line-clamp-2" style={{ color: MAP.subtitle }}>
                        · {skillSubtitle(skill, job.keywords)}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 border-r border-[#eeeeee] flex">
                    <LevelBox level="junior" text={skill.junior} />
                  </div>
                  <div className="p-2 border-r border-[#eeeeee] flex">
                    <LevelBox level="mid" text={skill.mid} showArrow />
                  </div>
                  <div className="p-2 border-r border-[#eeeeee] flex">
                    <LevelBox level="senior" text={skill.senior} showArrow />
                  </div>
                  <div className="p-2 bg-warm-50/80">
                    <CourseColumn
                      courses={skill.courses}
                      resolveCourseByName={resolveCourseByName}
                      onCourseClick={onCourseClick}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {onSelectLab && onFocus ? (
        <JobInfographicLinkage
          job={job}
          labs={labs}
          labCourses={labCourses}
          compCertData={compCertData}
          allJobs={allJobs}
          selectedLabCanonical={selectedLabCanonical}
          onSelectLab={onSelectLab}
          onFocus={onFocus}
        />
      ) : null}

      {curriculumData && (
        <JobCurriculumTracks
          design={curriculumData}
          jobName={job.name}
          labCanonical={selectedLabCanonical}
          resolveCourseByName={resolveCourseByName}
          onCourseClick={onCourseClick}
        />
      )}
    </div>
  )
}

export default function JobSkillMap() {
  const { data, loading, error } = useJobMap()
  const { data: graphData } = useData()
  const { data: compCertData } = useCompCert()
  const { data: curriculumData } = useCurriculumDesign()
  const { params, setParams } = useCrossNavState()
  const { setFocus } = useEcosystem()
  const [jobName, setJobName] = useState('')
  const [category, setCategory] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const courses = graphData?.courses ?? []
  const labs = graphData?.labs ?? []

  const resolveCourseByName = useCallback(
    (name: string) => resolveCourse(name, courses),
    [courses],
  )

  const handleCourseClick = useCallback((course: Course) => {
    setSelectedCourse(course)
    setFocus({ kind: 'course', id: String(course.id), label: course.name, subtitle: course.lab_name })
  }, [setFocus])

  const categories = useMemo(() => {
    if (!data) return []
    return [...new Set(data.jobs.map((j) => j.category).filter(Boolean))]
  }, [data])

  const filteredJobs = useMemo(() => {
    if (!data) return []
    return data.jobs.filter((j) => !category || j.category === category)
  }, [data, category])

  const selectedJob = useMemo(() => {
    if (!filteredJobs.length) return null
    const prefer = params.job || jobName
    if (prefer && filteredJobs.some((j) => j.name === prefer)) {
      return filteredJobs.find((j) => j.name === prefer) ?? filteredJobs[0]
    }
    return filteredJobs[0]
  }, [filteredJobs, jobName, params.job])

  useEffect(() => {
    if (params.job && params.job !== jobName) setJobName(params.job)
  }, [params.job])

  const labCourses = useMemo(() => {
    if (!data || !selectedJob) return []
    return data.labCourseRows.filter((r) => r.job === selectedJob.name)
  }, [data, selectedJob])

  const selectedLabCanonical = useMemo(() => {
    if (!selectedJob) return null
    if (params.lab) return resolveLab(params.lab, labs)?.name ?? params.lab
    const preferred =
      selectedJob.labLinks.find((l) => l.level === 'core') ??
      selectedJob.labLinks.find((l) => l.level === 'important') ??
      selectedJob.labLinks[0]
    return preferred ? (resolveLab(preferred.lab, labs)?.name ?? preferred.lab) : null
  }, [selectedJob, params.lab, labs])

  const handleSelectJob = useCallback((name: string) => {
    setJobName(name)
    setParams({ job: name, lab: params.lab })
    setFocus({ kind: 'job', id: name, label: name })
  }, [setParams, params.lab, setFocus])

  const handleSelectLab = useCallback((lab: string) => {
    setParams({ job: selectedJob?.name, lab })
    setFocus({ kind: 'lab', id: lab, label: lab })
  }, [setParams, selectedJob?.name, setFocus])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || !data.jobs.length) {
    return (
      <div className="text-center py-16">
        <Layers className="mx-auto text-accent-primary mb-4" size={48} />
        <h1 className="text-xl font-bold text-warm-900">岗位技能图谱</h1>
        <p className="text-warm-600 mt-2 max-w-md mx-auto">
          {error || '请前往「数据管理」上传岗位映射 Excel，或将 jobs.xlsx 放到 data/ 目录后重新加载'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gradient">岗位图谱</h1>
        <p className="text-warm-600 text-sm mt-1">
          {data.meta.total_jobs} 个岗位 · 技能矩阵与资源联动预览 · 完整匹配请前往
          <Link to="/integrated" className="text-accent-primary hover:underline mx-1">综合匹配</Link>
        </p>
      </header>

      {selectedJob ? (
        <div className="rounded-2xl overflow-hidden shadow-xl border border-warm-300 bg-warm-100">
          <JobSelectorToolbar
            embedded
            jobs={filteredJobs}
            categories={categories}
            category={category}
            onCategoryChange={(c) => { setCategory(c); setJobName('') }}
            selectedName={selectedJob.name}
            onSelect={handleSelectJob}
            search={jobSearch}
            onSearchChange={setJobSearch}
          />
          <SkillMapInfographic
            embedded
            job={selectedJob}
            labs={labs}
            labCourses={labCourses}
            compCertData={compCertData}
            curriculumData={curriculumData}
            allJobs={data.jobs}
            selectedLabCanonical={selectedLabCanonical}
            onSelectLab={handleSelectLab}
            onFocus={setFocus}
            resolveCourseByName={resolveCourseByName}
            onCourseClick={handleCourseClick}
          />
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 border border-warm-300 text-center text-warm-500 text-sm">
          请选择岗位大类或调整筛选条件
        </div>
      )}

      <CourseDetailDrawer course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}

