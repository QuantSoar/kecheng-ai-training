import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Building2, GitMerge, Briefcase, Network, Trophy, ChevronRight,
  BookOpen, Users, Award,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { buildCrossNavUrl, type CrossNavParams, resolveLabId } from '../utils/crossNav'

interface CrossLinkStripProps {
  params: CrossNavParams
  labs?: { id: number; name: string }[]
  className?: string
  compact?: boolean
}

const LINKS = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/labs', label: '实训室', icon: Building2, needsLab: false },
  { path: '/integrated', label: '综合匹配', icon: GitMerge },
  { path: '/jobs', label: '岗位图谱', icon: Briefcase },
  { path: '/network', label: '课程图谱', icon: Network },
  { path: '/labs/compcerts', label: '竞赛·证书', icon: Trophy },
] as const

export default function CrossLinkStrip({ params, labs = [], className = '', compact }: CrossLinkStripProps) {
  const hasContext = Boolean(params.lab || params.job)

  return (
    <div className={`glass rounded-xl border border-warm-300 px-3 py-2.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-warm-400 shrink-0">
          {hasContext ? '四表联动' : '全域导航'}
        </span>
        {params.job && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20 max-w-[140px] truncate" title={params.job}>
            岗位：{params.job}
          </span>
        )}
        {params.lab && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-700 border border-warm-200 max-w-[140px] truncate" title={params.lab}>
            实训室：{params.lab.replace('实训室', '').replace('实验室', '')}
          </span>
        )}
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {LINKS.map(({ path, label, icon: Icon }) => {
            let to = buildCrossNavUrl(path, params)
            if (path === '/labs' && params.lab) {
              const id = resolveLabId(params.lab, labs)
              if (id) to = buildCrossNavUrl(`/labs/${id}`, params)
            }
            return (
              <Link
                key={path}
                to={to}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition ${
                  compact ? 'bg-warm-50 text-warm-600 hover:bg-warm-100' : 'bg-white/80 text-warm-700 hover:text-accent-primary hover:border-accent-primary/30 border border-warm-200'
                }`}
              >
                <Icon size={12} />
                {label}
                {hasContext && <ChevronRight size={10} className="opacity-40" />}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface EcosystemBadgesProps {
  labs?: number
  courses?: number
  faculty?: number
  jobs?: number
  competitions?: number
  certificates?: number
  coursesLoaded?: boolean
  facultyLoaded?: boolean
  jobsLoaded?: boolean
  certsLoaded?: boolean
  /** inline=小标签 | cards=总览大卡片 | compact=能力图谱单行紧凑 */
  variant?: 'inline' | 'cards' | 'compact'
  className?: string
}

const STAT_ITEMS: {
  key: string
  label: string
  color: string
  icon: LucideIcon
  loadedKey: 'coursesLoaded' | 'facultyLoaded' | 'jobsLoaded' | 'certsLoaded'
  valueKey: 'labs' | 'courses' | 'faculty' | 'jobs' | 'competitions' | 'certificates'
}[] = [
  { key: 'jobs', label: '岗位', color: 'text-amber-700', icon: Briefcase, loadedKey: 'jobsLoaded', valueKey: 'jobs' },
  { key: 'labs', label: '实训室', color: 'text-accent-blue', icon: Building2, loadedKey: 'coursesLoaded', valueKey: 'labs' },
  { key: 'courses', label: '课程', color: 'text-accent-primary', icon: BookOpen, loadedKey: 'coursesLoaded', valueKey: 'courses' },
  { key: 'faculty', label: '师资', color: 'text-accent-green', icon: Users, loadedKey: 'facultyLoaded', valueKey: 'faculty' },
  { key: 'competitions', label: '竞赛', color: 'text-orange-600', icon: Trophy, loadedKey: 'certsLoaded', valueKey: 'competitions' },
  { key: 'certificates', label: '证书', color: 'text-teal-700', icon: Award, loadedKey: 'certsLoaded', valueKey: 'certificates' },
]

export function EcosystemBadges({
  labs,
  courses,
  faculty,
  jobs,
  competitions,
  certificates,
  coursesLoaded = true,
  facultyLoaded = true,
  jobsLoaded = true,
  certsLoaded = true,
  variant = 'inline',
  className = '',
}: EcosystemBadgesProps) {
  const values = { labs, courses, faculty, jobs, competitions, certificates }
  const loaded = { coursesLoaded, facultyLoaded, jobsLoaded, certsLoaded }

  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
        {STAT_ITEMS.map(({ key, label, color, icon: Icon, loadedKey, valueKey }) => {
          const ok = loaded[loadedKey]
          const value = values[valueKey]
          return (
            <div key={key} className="glass rounded-2xl p-4 glow-warm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-warm-600">{label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${ok ? color : 'text-warm-400'}`}>
                    {ok ? (value ?? '—') : '未加载'}
                  </p>
                </div>
                <Icon className={`${ok ? color : 'text-warm-300'} opacity-50 shrink-0`} size={26} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 ${className}`}>
        {STAT_ITEMS.map(({ key, label, color, icon: Icon, loadedKey, valueKey }) => {
          const ok = loaded[loadedKey]
          const value = values[valueKey]
          return (
            <div key={key} className="glass rounded-lg px-3 py-2 flex items-center justify-between gap-1 min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] text-warm-500 truncate">{label}</p>
                <p className={`text-lg font-bold leading-tight ${ok ? color : 'text-warm-400'}`}>
                  {ok ? (value ?? '—') : '—'}
                </p>
              </div>
              <Icon size={16} className={`shrink-0 ${ok ? color : 'text-warm-300'} opacity-50`} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {STAT_ITEMS.map(({ key, label, color, loadedKey, valueKey }) => {
        const ok = loaded[loadedKey]
        const value = values[valueKey]
        return (
          <span
            key={key}
            className={`text-xs px-2.5 py-1 rounded-lg border ${ok ? 'bg-white border-warm-200' : 'bg-warm-100 border-warm-200 text-warm-400'}`}
          >
            <span className="text-warm-500">{label}</span>{' '}
            <strong className={ok ? color : ''}>{ok ? (value ?? '—') : '未加载'}</strong>
          </span>
        )
      })}
    </div>
  )
}
