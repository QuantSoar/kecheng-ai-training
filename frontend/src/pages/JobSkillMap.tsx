import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Layers, Target, BookOpen, Cpu, Database, Shield,
  Palette, Bot, LineChart, Users, Wrench, Sparkles, ChevronRight, Clock, GraduationCap, ExternalLink,
  Building2, Search, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useJobMap } from '../context/JobMapContext'
import { useData } from '../context/DataContext'
import { useFaculty } from '../context/FacultyContext'
import CourseDetailDrawer from '../components/CourseDetailDrawer'
import {
  JOB_CATEGORY_COLORS,
  LEVEL_LABELS,
  LEVEL_PERSONA_SUFFIX,
  type JobProfile,
  type JobSkillItem,
  type LabJobCourseRow,
  type LabLinkLevel,
} from '../types/jobMap'
import type { Course, Lab } from '../types'
import { TYPE_COLORS } from '../types'
import type { FacultyTeacher } from '../types/faculty'
import { selectClass } from '../styles/form'
import {
  resolveCourse,
  resolveLab,
  facultyForJob,
  jobLinkStats,
  collectJobCourseNames,
} from '../utils/jobLink'
import { buildLabIntegrations, type LabIntegration } from '../utils/integrate'

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

function facultyMatchesCourses(teacher: FacultyTeacher, courseNames: string[]) {
  if (!courseNames.length || !teacher.capable_courses) return false
  const parts = teacher.capable_courses.split(/[,，、;/\n]+/).map((s) => s.trim()).filter(Boolean)
  return courseNames.some((cn) => parts.some((p) => courseNameMatch(p, cn)))
}

const MATCH_STEPS = [
  { id: 1 as const, label: '选择岗位', icon: Briefcase },
  { id: 2 as const, label: '匹配实训室', icon: Building2 },
  { id: 3 as const, label: '匹配课程', icon: BookOpen },
  { id: 4 as const, label: '匹配师资', icon: Users },
]

function MatchStepBar({
  activeStep,
  counts,
  onStepClick,
}: {
  activeStep: number
  counts: { labs: number; courses: number; faculty: number }
  onStepClick: (step: number) => void
}) {
  const progressPct = Math.min(100, ((activeStep - 1) / 3) * 100)

  return (
    <div>
      <div className="hidden md:block relative h-1 rounded-full bg-warm-200/80 mb-4 mx-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-primary to-accent-primary transition-all duration-500"
          style={{ width: `${activeStep <= 1 ? 8 : progressPct}%` }}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {MATCH_STEPS.map((step) => {
          const Icon = step.icon
          const done = activeStep > step.id
          const active = activeStep === step.id
          const countLabel =
            step.id === 2 ? `${counts.labs} 室` :
            step.id === 3 ? `${counts.courses} 门` :
            step.id === 4 ? `${counts.faculty} 人` : null
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-br from-accent-primary/15 to-accent-primary/5 border border-accent-primary/35 shadow-sm scale-[1.02]'
                  : done
                    ? 'bg-accent-green/8 border border-accent-green/25 hover:bg-accent-green/12'
                    : 'bg-warm-50/80 border border-warm-200/60 hover:border-warm-300 hover:bg-white'
              }`}
            >
              <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                active
                  ? 'bg-accent-primary text-white'
                  : done
                    ? 'bg-accent-green text-white'
                    : 'bg-white text-warm-500 border border-warm-200 group-hover:border-warm-300'
              }`}>
                {done ? <CheckCircle2 size={15} /> : step.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold leading-tight ${active ? 'text-accent-primary' : done ? 'text-warm-800' : 'text-warm-700'}`}>
                  {step.label}
                </span>
                {countLabel && (
                  <span className={`block text-[10px] mt-0.5 ${active ? 'text-accent-primary/80' : 'text-warm-500'}`}>{countLabel}</span>
                )}
              </span>
              <Icon size={15} className={`shrink-0 ${active ? 'text-accent-primary' : done ? 'text-accent-green' : 'text-warm-400'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function JobPickerSidebar({
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
  const list = useMemo(() => {
    let items = jobs
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (j) => j.name.toLowerCase().includes(q) || j.category.toLowerCase().includes(q) || j.keywords.toLowerCase().includes(q),
      )
    }
    return items
  }, [jobs, search])

  return (
    <div className={`flex flex-col h-full min-h-[520px] ${
      embedded ? 'bg-warm-50/40' : 'glass rounded-2xl border border-warm-300 h-[min(720px,calc(100vh-12rem))]'
    }`}>
      <div className="p-4 border-b border-warm-200/80 space-y-2.5 shrink-0 bg-white/50">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-warm-900 flex items-center gap-2">
            <Briefcase size={15} className="text-accent-primary" />
            岗位列表
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-200/80 text-warm-600">{list.length} 项</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索岗位…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-warm-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary/40"
          />
        </div>
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} className={`${selectClass} w-full text-sm`}>
          <option value="">全部大类</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {list.map((j) => {
          const active = j.name === selectedName
          const labCount = j.labLinks.length
          return (
            <button
              key={j.name}
              type="button"
              onClick={() => onSelect(j.name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border-l-2 ${
                active
                  ? 'bg-white border-l-accent-primary shadow-sm border border-warm-200/80'
                  : 'border-l-transparent hover:bg-white/70 hover:border-l-warm-300'
              }`}
            >
              <p className={`text-sm font-medium leading-snug ${active ? 'text-accent-primary' : 'text-warm-900'}`}>{j.name}</p>
              <p className="text-[10px] text-warm-500 mt-0.5 truncate">{j.category} · {labCount} 实训室</p>
            </button>
          )
        })}
        {!list.length && (
          <p className="text-center text-warm-400 text-sm py-8">无匹配岗位</p>
        )}
      </div>
    </div>
  )
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

function LabSelectCard({
  lab,
  level,
  integration,
  selected,
  courseCount,
  onClick,
}: {
  lab: string
  level: LabLinkLevel
  integration?: LabIntegration
  selected: boolean
  courseCount: number
  onClick: () => void
}) {
  const badge = LINK_BADGE[level]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden ${
        selected
          ? 'border-accent-primary/50 bg-gradient-to-br from-accent-primary/10 to-white shadow-md ring-1 ring-accent-primary/20'
          : 'border-warm-200/80 bg-white hover:border-accent-primary/25 hover:shadow-sm'
      }`}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary rounded-l-xl" />}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${badge.cls}`}>{badge.label}</span>
        <Building2 size={16} className={`shrink-0 ${selected ? 'text-accent-primary' : 'text-warm-300'}`} />
      </div>
      <p className="font-bold text-sm text-warm-900 mt-2.5 leading-snug pr-6">{shortLab(lab)}</p>
      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-warm-100">
        <div className="text-center">
          <p className="text-sm font-bold text-accent-primary">{courseCount}</p>
          <p className="text-[9px] text-warm-500">核心课</p>
        </div>
        <div className="text-center border-x border-warm-100">
          <p className="text-sm font-bold text-warm-800">{integration?.courses.length ?? '—'}</p>
          <p className="text-[9px] text-warm-500">总课程</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-warm-800">{integration?.faculty.length ?? '—'}</p>
          <p className="text-[9px] text-warm-500">师资</p>
        </div>
      </div>
      {selected && (
        <span className="absolute top-3 right-3">
          <CheckCircle2 size={18} className="text-accent-primary" />
        </span>
      )}
    </button>
  )
}

function MatchStepCard({
  step,
  title,
  subtitle,
  icon: Icon,
  accent,
  active,
  done,
  children,
}: {
  step: number
  title: string
  subtitle?: string
  icon: LucideIcon
  accent?: string
  active?: boolean
  done?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={`match-step-${step}`}
      className={`scroll-mt-24 rounded-xl border transition-all duration-300 ${
        active
          ? 'border-accent-primary/30 bg-white shadow-md ring-1 ring-accent-primary/10'
          : done
            ? 'border-warm-200/80 bg-white/90'
            : 'border-warm-200/60 bg-white/70'
      }`}
    >
      <div className={`px-4 py-3 border-b flex items-start gap-3 ${
        active ? 'border-accent-primary/15 bg-gradient-to-r from-accent-primary/5 to-transparent' : 'border-warm-100'
      }`}>
        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
          active
            ? 'bg-accent-primary text-white'
            : done
              ? 'bg-accent-green text-white'
              : 'bg-warm-100 text-warm-600 border border-warm-200'
        }`}>
          {done ? <CheckCircle2 size={16} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-warm-900 flex items-center gap-2 text-[15px]">
            <Icon size={17} style={{ color: accent ?? MAP.primary }} />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-warm-500 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function FacultyMatchCard({
  teacher,
  directMatch,
  onClick,
}: {
  teacher: FacultyTeacher
  directMatch: boolean
  onClick: () => void
}) {
  const initial = teacher.name.slice(0, 1)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all duration-200 ${
        directMatch
          ? 'bg-gradient-to-br from-accent-green/10 to-white border-accent-green/30 hover:shadow-sm hover:border-accent-green/45'
          : 'bg-white border-warm-200/80 hover:border-warm-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
          directMatch ? 'bg-accent-green/15 text-accent-green' : 'bg-warm-100 text-warm-600'
        }`}>
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-sm text-warm-900">{teacher.name}</span>
            {directMatch && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green/15 text-accent-green shrink-0 font-medium">
                可授核心课
              </span>
            )}
          </div>
          <p className="text-xs text-warm-500 mt-0.5 truncate">{teacher.title_dim} · {teacher.source}</p>
          <p className="text-[10px] text-warm-400 truncate mt-0.5">{teacher.field}</p>
        </div>
      </div>
    </button>
  )
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

function buildPersonas(job: JobProfile) {
  const texts = [
    job.skills.map((s) => s.junior).filter(Boolean).join(' '),
    job.skills.map((s) => s.mid).filter(Boolean).join(' '),
    job.skills.map((s) => s.senior).filter(Boolean).join(' '),
  ]
  const keys = ['junior', 'mid', 'senior'] as const
  return LEVEL_LABELS.map((level, i) => ({
    level,
    key: keys[i],
    title: `${level} · ${job.name.replace(/^AI/, 'AI ')}${LEVEL_PERSONA_SUFFIX[i]}`,
    text: texts[i] || '请在 Excel「岗位能力分层拆解」中补充该层级描述。',
  }))
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

function SkillMapInfographic({
  job,
  resolveCourseByName,
  onCourseClick,
  embedded = false,
}: {
  job: JobProfile
  resolveCourseByName: (name: string) => Course | null
  onCourseClick: (course: Course) => void
  embedded?: boolean
}) {
  const personas = buildPersonas(job)
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

      {/* 岗位画像 */}
      <div className="text-white text-sm font-bold px-4 py-2" style={{ backgroundColor: MAP.primary }}>岗位画像</div>
      <div className="grid md:grid-cols-3 gap-0 bg-[#fafafa]">
        {personas.map((p) => {
          const t = LEVEL_THEME[p.key]
          return (
            <div key={p.level} className={`p-5 border-r last:border-r-0 border-[#e0e0e0] ${t.box}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-8 h-8 rounded-lg ${t.header} flex items-center justify-center text-white text-xs font-bold`}>
                  {p.level.slice(0, 1)}
                </span>
                <p className={`text-sm font-bold ${t.text}`}>{p.title}</p>
              </div>
              <p className="text-[11px] leading-relaxed text-[#616161]">{p.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ROADMAP_STAGES = [
  { stage: 0 as const, label: '第一阶段', title: '入门筑基', hint: '对应初级技能 · 先修通识与基础', theme: LEVEL_THEME.junior },
  { stage: 1 as const, label: '第二阶段', title: '核心精进', hint: '对应中级技能 · 核心课与主干能力', theme: LEVEL_THEME.mid },
  { stage: 2 as const, label: '第三阶段', title: '进阶实践', hint: '对应高级技能 · 实践课与综合应用', theme: LEVEL_THEME.senior },
]

type RoadmapStage = 0 | 1 | 2

interface RoadmapCourseItem {
  key: string
  name: string
  matched: Course | null
  stage: RoadmapStage
  source: string
  skillDomain?: string
  inLab: boolean
}

function typeToStage(type: string): RoadmapStage {
  if (type === 'general' || type === 'foundation') return 0
  if (type === 'core') return 1
  return 2
}

function skillAppliesToLab(skill: JobSkillItem, labCanonical: string, labs: Lab[]): boolean {
  if (!skill.labs.length) return true
  return skill.labs.some((l) => {
    const r = resolveLab(l, labs)?.name ?? l.trim()
    return r === labCanonical
  })
}

function resolveCourseInLab(
  name: string,
  labCanonical: string,
  courses: Course[],
  resolveCourseByName: (n: string) => Course | null,
): Course | null {
  const inLab = courses.find((c) => c.lab_name === labCanonical && courseNameMatch(c.name, name))
  if (inLab) return inLab
  const any = resolveCourseByName(name)
  if (any?.lab_name === labCanonical) return any
  return any
}

function buildCourseRoadmap(
  job: JobProfile,
  labCanonical: string,
  labRow: LabJobCourseRow | null,
  labCourseRows: LabJobCourseRow[],
  courses: Course[],
  labs: Lab[],
  resolveCourseByName: (n: string) => Course | null,
): RoadmapCourseItem[] {
  const map = new Map<string, RoadmapCourseItem>()

  const upsert = (name: string, partial: Omit<RoadmapCourseItem, 'key' | 'name' | 'matched' | 'inLab'> & { matched?: Course | null }) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const key = normText(trimmed)
    const matched = partial.matched ?? resolveCourseInLab(trimmed, labCanonical, courses, resolveCourseByName)
    const inLab = matched?.lab_name === labCanonical
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        name: trimmed,
        matched,
        stage: partial.stage,
        source: partial.source,
        skillDomain: partial.skillDomain,
        inLab,
      })
      return
    }
    if (partial.stage < existing.stage) existing.stage = partial.stage
    if (matched && (!existing.matched || (inLab && existing.matched.lab_name !== labCanonical))) {
      existing.matched = matched
      existing.inLab = inLab
    }
    if (!existing.skillDomain && partial.skillDomain) existing.skillDomain = partial.skillDomain
    if (!existing.source.includes(partial.source)) {
      existing.source = `${existing.source}、${partial.source}`
    }
  }

  for (const skill of job.skills) {
    if (!skillAppliesToLab(skill, labCanonical, labs)) continue
    skill.courses.forEach((name, i) => {
      upsert(name, {
        stage: (i % 3) as RoadmapStage,
        source: '技能图谱',
        skillDomain: skill.domain,
      })
    })
  }

  if (labRow) {
    const n = labRow.courses.length
    labRow.courses.forEach((name, i) => {
      const matched = resolveCourseInLab(name, labCanonical, courses, resolveCourseByName)
      const stage = matched ? typeToStage(matched.type) : (Math.min(2, Math.floor((i / Math.max(n, 1)) * 3)) as RoadmapStage)
      upsert(name, { stage, source: '岗位×实训室映射', matched })
    })
  }

  const jobNames = collectJobCourseNames(job, labCourseRows)
  for (const c of courses) {
    if (c.lab_name !== labCanonical) continue
    if (!jobNames.some((n) => courseNameMatch(c.name, n))) continue
    upsert(c.name, {
      stage: typeToStage(c.type),
      source: '本室岗位关联课',
      matched: c,
    })
  }

  return [...map.values()].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    const ta = a.matched ? typeToStage(a.matched.type) : a.stage
    const tb = b.matched ? typeToStage(b.matched.type) : b.stage
    if (ta !== tb) return ta - tb
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

function CourseLearningRoadmap({
  items,
  onCourseClick,
  labLabel,
}: {
  items: RoadmapCourseItem[]
  onCourseClick: (course: Course) => void
  labLabel: string
}) {
  const matchedCount = items.filter((i) => i.matched).length
  const inLabCount = items.filter((i) => i.inLab && i.matched).length

  return (
    <div className="rounded-xl border border-warm-200/80 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-warm-100 bg-gradient-to-r from-warm-50/80 to-white flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-warm-800">课程学习路线图</p>
          <p className="text-[11px] text-warm-500 mt-0.5">
            {labLabel} · 共 {items.length} 门推荐 · 已入库 {matchedCount} 门（本室 {inLabCount} 门）· 按先修 → 核心 → 实践顺序学习
          </p>
        </div>
        <div className="flex gap-2 text-[10px]">
          {ROADMAP_STAGES.map((s) => (
            <span key={s.stage} className="inline-flex items-center gap-1 text-warm-600">
              <span className={`w-2 h-2 rounded-sm ${s.theme.header}`} />
              {s.title}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-5">
        {ROADMAP_STAGES.map((stageDef, stageIdx) => {
          const stageItems = items.filter((i) => i.stage === stageDef.stage)
          if (!stageItems.length) return null
          return (
            <div key={stageDef.stage}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`shrink-0 w-7 h-7 rounded-lg ${stageDef.theme.header} text-white text-xs font-bold flex items-center justify-center`}>
                  {stageIdx + 1}
                </span>
                <div>
                  <p className={`text-sm font-bold ${stageDef.theme.text}`}>{stageDef.label} · {stageDef.title}</p>
                  <p className="text-[10px] text-warm-500">{stageDef.hint}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-stretch gap-2">
                {stageItems.map((item, idx) => (
                  <div key={item.key} className="flex items-center gap-1 min-w-[200px] max-w-[280px] flex-1">
                    {idx > 0 && (
                      <ChevronRight size={16} className="shrink-0 text-warm-300 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0 relative">
                      <span className="absolute -top-2 -left-1 z-10 w-5 h-5 rounded-full bg-warm-800 text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="pt-1">
                        <RoadmapCourseCard item={item} onCourseClick={onCourseClick} theme={stageDef.theme} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {!items.length && (
          <p className="text-sm text-warm-500 text-center py-6">暂无推荐课程，请在岗位映射 Excel 中补充</p>
        )}
      </div>
    </div>
  )
}

function RoadmapCourseCard({
  item,
  onCourseClick,
  theme,
}: {
  item: RoadmapCourseItem
  onCourseClick: (course: Course) => void
  theme: (typeof LEVEL_THEME)[keyof typeof LEVEL_THEME]
}) {
  const { name, matched, source, skillDomain, inLab } = item

  if (!matched) {
    return (
      <div className={`rounded-xl border-2 border-dashed p-3 min-h-[88px] ${theme.box}`}>
        <p className="text-sm font-medium text-warm-800 leading-snug pr-2">{name}</p>
        <p className="text-[10px] text-warm-400 mt-1">待入库 · {source}</p>
        {skillDomain && <p className="text-[10px] text-warm-500 mt-0.5">能力域：{skillDomain}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onCourseClick(matched)}
      className={`w-full text-left rounded-xl border-2 p-3 min-h-[88px] transition hover:brightness-[0.98] ${theme.box} ${
        matched.is_vendor ? 'border-l-4 border-l-accent-orange' : ''
      }`}
    >
      <div className="flex flex-wrap gap-1 mb-1">
        <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: `${TYPE_COLORS[matched.type]}22`, color: TYPE_COLORS[matched.type] }}>
          {matched.type_label}
        </span>
        {!inLab && (
          <span className="text-[10px] text-accent-orange">他室课程</span>
        )}
        {matched.is_vendor && <span className="text-[10px] text-accent-orange">厂商</span>}
      </div>
      <p className="text-sm font-medium text-warm-900 leading-snug">{matched.name}</p>
      <p className="text-[10px] text-warm-500 mt-1 line-clamp-1">{source}{skillDomain ? ` · ${skillDomain}` : ''}</p>
      {matched.hours != null && matched.hours !== '' && (
        <p className="text-[10px] text-warm-400 mt-0.5">{matched.hours} 学时</p>
      )}
    </button>
  )
}

function splitCapability(text: string): string[] {
  if (!text.trim()) return []
  return text.split(/[/、,，;；|]\s*/).map((s) => s.trim()).filter(Boolean)
}

export default function JobSkillMap() {
  const { data, loading, error } = useJobMap()
  const { data: graphData } = useData()
  const { data: facultyData } = useFaculty()
  const [jobName, setJobName] = useState('')
  const [category, setCategory] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [selectedLabName, setSelectedLabName] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(2)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyTeacher | null>(null)

  const courses = graphData?.courses ?? []
  const labs = graphData?.labs ?? []
  const teachers = facultyData?.teachers ?? []

  const resolveCourseByName = useCallback(
    (name: string) => resolveCourse(name, courses),
    [courses],
  )

  const handleCourseClick = useCallback((course: Course) => {
    setSelectedCourse(course)
  }, [])

  const scrollToStep = useCallback((step: number) => {
    setActiveStep(step)
    document.getElementById(`match-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
    if (jobName && filteredJobs.some((j) => j.name === jobName)) {
      return filteredJobs.find((j) => j.name === jobName) ?? filteredJobs[0]
    }
    return filteredJobs[0]
  }, [filteredJobs, jobName])

  const labCourses = useMemo(() => {
    if (!data || !selectedJob) return []
    return data.labCourseRows.filter((r) => r.job === selectedJob.name)
  }, [data, selectedJob])

  const linkedFaculty = useMemo(() => {
    if (!selectedJob || !teachers.length) return []
    return facultyForJob(selectedJob, teachers, labs)
  }, [selectedJob, teachers, labs])

  const labIntegrations = useMemo(() => {
    if (!labs.length) return []
    return buildLabIntegrations(labs, courses, teachers)
  }, [labs, courses, teachers])

  const linkStats = useMemo(() => {
    if (!selectedJob || !data) {
      return { courseNames: 0, matchedCourses: 0, linkedLabs: 0, faculty: 0 }
    }
    return jobLinkStats(selectedJob, data.labCourseRows, courses, teachers, labs)
  }, [selectedJob, data, courses, teachers, labs])

  useEffect(() => {
    if (!selectedJob?.labLinks.length) {
      setSelectedLabName(null)
      return
    }
    const preferred =
      selectedJob.labLinks.find((l) => l.level === 'core') ??
      selectedJob.labLinks.find((l) => l.level === 'important') ??
      selectedJob.labLinks[0]
    setSelectedLabName(preferred.lab)
    setActiveStep(2)
  }, [selectedJob?.name, selectedJob?.labLinks])

  const selectedLabRow = useMemo(() => {
    if (!selectedLabName) return null
    return labCourses.find((r) => {
      const resolved = resolveLab(r.lab, labs)
      return r.lab === selectedLabName || resolved?.name === selectedLabName
    }) ?? null
  }, [selectedLabName, labCourses, labs])

  const selectedLabCanonical = useMemo(() => {
    if (!selectedLabName) return null
    return resolveLab(selectedLabName, labs)?.name ?? selectedLabName
  }, [selectedLabName, labs])

  const selectedLabFaculty = useMemo(() => {
    if (!selectedLabCanonical) return linkedFaculty
    return teachers.filter((t) => t.lab_list.includes(selectedLabCanonical))
  }, [selectedLabCanonical, linkedFaculty, teachers])

  const courseRoadmap = useMemo(() => {
    if (!selectedJob || !selectedLabCanonical || !data) return []
    return buildCourseRoadmap(
      selectedJob,
      selectedLabCanonical,
      selectedLabRow,
      data.labCourseRows,
      courses,
      labs,
      resolveCourseByName,
    )
  }, [selectedJob, selectedLabCanonical, selectedLabRow, data, courses, labs, resolveCourseByName])

  const selectedCourseNames = useMemo(() => {
    if (courseRoadmap.length) return courseRoadmap.map((i) => i.name)
    if (!selectedLabRow) return []
    return selectedLabRow.courses.filter(Boolean)
  }, [courseRoadmap, selectedLabRow])

  const stepCounts = useMemo(() => ({
    labs: selectedJob?.labLinks.length ?? 0,
    courses: courseRoadmap.length || selectedLabRow?.courses.length || linkStats.matchedCourses,
    faculty: selectedLabFaculty.length,
  }), [selectedJob, courseRoadmap.length, selectedLabRow, linkStats.matchedCourses, selectedLabFaculty.length])

  const handleSelectJob = useCallback((name: string) => {
    setJobName(name)
    setActiveStep(1)
    scrollToStep(2)
  }, [scrollToStep])

  const handleSelectJobOnly = useCallback((name: string) => {
    setJobName(name)
    setActiveStep(1)
  }, [])

  const handleSelectLab = useCallback((lab: string) => {
    setSelectedLabName(lab)
    setActiveStep(3)
    scrollToStep(3)
  }, [scrollToStep])

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

  const accent = JOB_CATEGORY_COLORS[selectedJob?.category ?? ''] ?? MAP.primary

  const roadmapMatchedCount = courseRoadmap.filter((c) => c.matched).length
  const capabilities = selectedLabRow ? splitCapability(selectedLabRow.capability) : []

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gradient">岗位图谱</h1>
        <p className="text-warm-600 text-sm mt-1">
          {data.meta.total_jobs} 个岗位 · 按「岗位 → 实训室 → 课程 → 师资」四步完成培养资源匹配
        </p>
      </header>

      {selectedJob && (
        <div className="rounded-2xl overflow-hidden shadow-xl border border-warm-300 bg-warm-100">
          <JobSelectorToolbar
            embedded
            jobs={filteredJobs}
            categories={categories}
            category={category}
            onCategoryChange={(c) => { setCategory(c); setJobName('') }}
            selectedName={selectedJob.name}
            onSelect={handleSelectJobOnly}
            search={jobSearch}
            onSearchChange={setJobSearch}
          />
          <SkillMapInfographic
            embedded
            job={selectedJob}
            resolveCourseByName={resolveCourseByName}
            onCourseClick={handleCourseClick}
          />
        </div>
      )}

      {selectedJob && (
        <div className="rounded-2xl border border-warm-300/80 bg-gradient-to-b from-warm-50/90 to-white shadow-lg overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-warm-200/80 bg-white/70 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-warm-900">培养资源匹配流程</h2>
                <p className="text-xs text-warm-500 mt-0.5">按步骤完成岗位 → 实训室 → 课程 → 师资的匹配浏览</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-medium border border-accent-primary/15">
                当前：{selectedJob.name}
              </span>
            </div>
            <MatchStepBar
              activeStep={activeStep}
              counts={stepCounts}
              onStepClick={scrollToStep}
            />
          </div>

          <div className="grid lg:grid-cols-[248px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-warm-200/80">
            <JobPickerSidebar
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

            <div className="p-4 lg:p-5 space-y-4 min-w-0">
              <MatchStepCard
                step={1}
                title={`当前岗位：${selectedJob.name}`}
                subtitle={`${selectedJob.category} · ${selectedJob.heat}`}
                icon={Briefcase}
                accent={accent}
                active={activeStep === 1}
                done={activeStep > 1}
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: '关联实训室', value: `${linkStats.linkedLabs} 个` },
                    { label: '课程入库', value: `${linkStats.matchedCourses}/${linkStats.courseNames}` },
                    { label: '能力域', value: `${selectedJob.skills.length} 项` },
                  ].map((kpi) => (
                    <span key={kpi.label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200/80">
                      <span className="text-warm-500">{kpi.label}</span>
                      <span className="font-bold text-warm-900">{kpi.value}</span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedJob.keywords || '').split(/[,，/]/).map((k) => k.trim()).filter(Boolean).slice(0, 10).map((k) => (
                    <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-accent-primary/8 text-warm-700 border border-accent-primary/12">
                      {k}
                    </span>
                  ))}
                </div>
              </MatchStepCard>

              {selectedJob.labLinks.length > 0 ? (
                <>
                  <MatchStepCard
                    step={2}
                    title="选择关联实训室"
                    subtitle="点击实训室卡片，下方将展示该室为本岗位匹配的核心课程与师资"
                    icon={Building2}
                    accent={accent}
                    active={activeStep === 2}
                    done={activeStep > 2}
                  >
                    <div className="grid sm:grid-cols-2 gap-3">
                      {selectedJob.labLinks.map(({ lab, level }) => {
                        const labObj = resolveLab(lab, labs)
                        const canonical = labObj?.name ?? lab
                        const integration = labIntegrations.find((i) => i.lab.name === canonical)
                        const row = labCourses.find((r) => r.lab === lab || resolveLab(r.lab, labs)?.name === canonical)
                        const isSelected = selectedLabName === lab || selectedLabName === canonical
                        return (
                          <LabSelectCard
                            key={lab}
                            lab={lab}
                            level={level}
                            integration={integration}
                            selected={isSelected}
                            courseCount={row?.courses.length ?? 0}
                            onClick={() => handleSelectLab(lab)}
                          />
                        )
                      })}
                    </div>
                  </MatchStepCard>

                  <MatchStepCard
                    step={3}
                    title={selectedLabCanonical ? `「${shortLab(selectedLabCanonical)}」匹配课程` : '匹配课程'}
                    subtitle={
                      selectedLabCanonical
                        ? `学习路线图 · 综合技能图谱、岗位映射与本室课程 · 已入库 ${roadmapMatchedCount}/${courseRoadmap.length} 门`
                        : '请先在上方选择实训室'
                    }
                    icon={BookOpen}
                    accent={accent}
                    active={activeStep === 3}
                    done={activeStep > 3}
                  >
                    {selectedLabCanonical && courseRoadmap.length > 0 ? (
                      <div className="space-y-3">
                        {capabilities.length > 0 && (
                          <div className="rounded-xl border border-accent-primary/15 bg-gradient-to-r from-accent-primary/5 to-warm-50/50 px-4 py-3">
                            <p className="text-[11px] font-semibold text-warm-700 mb-2 flex items-center gap-1">
                              <GraduationCap size={13} style={{ color: accent }} />
                              培养能力目标
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {capabilities.map((cap) => (
                                <span key={cap} className="text-[11px] px-2 py-1 rounded-lg bg-white/80 text-warm-700 border border-warm-200/80 shadow-sm">
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <CourseLearningRoadmap
                          items={courseRoadmap}
                          onCourseClick={handleCourseClick}
                          labLabel={shortLab(selectedLabCanonical)}
                        />
                      </div>
                    ) : selectedLabCanonical ? (
                      <p className="text-sm text-warm-500 py-8 text-center rounded-xl border border-dashed border-warm-300 bg-warm-50/50">
                        该实训室暂无推荐课程，请检查岗位映射或技能图谱配置
                      </p>
                    ) : (
                      <p className="text-sm text-warm-500 py-8 text-center rounded-xl border border-dashed border-warm-300 bg-warm-50/50">
                        请在步骤 2 选择一个实训室
                      </p>
                    )}
                  </MatchStepCard>

                  <MatchStepCard
                    step={4}
                    title={selectedLabCanonical ? `「${shortLab(selectedLabCanonical)}」匹配师资` : '匹配师资'}
                    subtitle={
                      selectedLabCanonical
                        ? `本实训室共 ${selectedLabFaculty.length} 位师资 · 标注「可授核心课」表示与上方课程直接相关`
                        : '请先选择实训室'
                    }
                    icon={Users}
                    active={activeStep === 4}
                  >
                    {selectedLabFaculty.length > 0 ? (
                      <>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto scrollbar-thin pr-0.5">
                          {selectedLabFaculty.slice(0, 18).map((t) => (
                            <FacultyMatchCard
                              key={t.id}
                              teacher={t}
                              directMatch={facultyMatchesCourses(t, selectedCourseNames)}
                              onClick={() => { setSelectedFaculty(t); setActiveStep(4) }}
                            />
                          ))}
                        </div>
                        {selectedLabFaculty.length > 18 && (
                          <p className="text-xs text-warm-500 mt-3 pt-3 border-t border-warm-100">
                            另有 {selectedLabFaculty.length - 18} 位师资 ·
                            <Link to="/faculty" className="text-accent-primary hover:underline ml-1">前往师资分析</Link>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-warm-500 py-8 text-center rounded-xl border border-dashed border-warm-300 bg-warm-50/50">
                        该实训室暂无关联师资数据
                      </p>
                    )}
                  </MatchStepCard>
                </>
              ) : (
                <div className="rounded-xl p-8 border border-dashed border-warm-300 bg-warm-50/50 text-center text-warm-500 text-sm">
                  该岗位尚未配置关联实训室，请在岗位映射 Excel 中补充 labLinks
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedJob && (
        <div className="grid lg:grid-cols-[248px_1fr] gap-5 items-start">
          <JobPickerSidebar
            jobs={filteredJobs}
            categories={categories}
            category={category}
            onCategoryChange={(c) => { setCategory(c); setJobName('') }}
            selectedName=""
            onSelect={handleSelectJob}
            search={jobSearch}
            onSearchChange={setJobSearch}
          />
          <div className="glass rounded-2xl p-10 border border-warm-300 text-center text-warm-500 text-sm">
            请从左侧选择一个岗位，开始培养资源匹配流程
          </div>
        </div>
      )}

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
              {selectedFaculty.lab_list.map((l) => {
                const labObj = resolveLab(l, labs)
                return labObj ? (
                  <Link
                    key={l}
                    to={`/labs/${labObj.id}`}
                    className="text-xs px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/15"
                  >
                    {l}
                  </Link>
                ) : (
                  <span key={l} className="text-xs px-2 py-1 rounded-lg bg-warm-100 text-warm-600 border border-warm-200">{l}</span>
                )
              })}
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
            <Link
              to="/faculty"
              className="inline-flex items-center gap-1 mt-6 text-sm text-accent-primary hover:underline"
            >
              在师资分析中查看 <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
