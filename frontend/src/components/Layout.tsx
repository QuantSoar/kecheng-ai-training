import { NavLink, useNavigate, useLocation } from 'react-router-dom'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import {
  LayoutDashboard,
  Building2,
  Share2,
  Monitor,
  GitMerge,
  Briefcase,
  Database,
} from 'lucide-react'

import { useData } from '../context/DataContext'

import type { DataMode } from '../services/dataSource'

type NavLinkItem = { to: string; label: string; icon: LucideIcon }

const NAV: NavLinkItem[] = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/labs', label: '实训室全景', icon: Building2 },
  { to: '/jobs', label: '岗位图谱', icon: Briefcase },
  { to: '/network', label: '课程图谱', icon: Share2 },
  { to: '/integrated', label: '综合匹配', icon: GitMerge },
  { to: '/data', label: '数据管理', icon: Database },
]



interface LayoutProps {

  children: ReactNode

  courseMode: DataMode

  facultyMode: DataMode

  jobMapMode: DataMode

  compCertMode: DataMode

  curriculumMode: DataMode

}



export default function Layout({ children, courseMode, facultyMode, jobMapMode, compCertMode, curriculumMode }: LayoutProps) {
  const { data, loading } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const isFacultyPage =
    location.pathname.startsWith('/faculty') || location.pathname.startsWith('/labs/faculty')

  const isIntegratedPage = location.pathname.startsWith('/integrated')

  const isJobsPage = location.pathname.startsWith('/jobs')

  const isCompCertPage =
    location.pathname.startsWith('/compcerts') || location.pathname.startsWith('/labs/compcerts')

  const isDataPage = location.pathname.startsWith('/data')

  const skipCourseLoadingGate = isFacultyPage || isIntegratedPage || isJobsPage || isCompCertPage || isDataPage



  const modeLabel = (() => {

    if (courseMode === 'server' && facultyMode !== 'cloud') return '服务端'

    if (courseMode === 'server' || facultyMode === 'server') return '服务端（课程/师资）'

    if (courseMode === 'cloud' || facultyMode === 'cloud') return '云端数据'

    return '本地解析'

  })()



  const showModeHint = courseMode !== 'server' || facultyMode === 'cloud' || jobMapMode === 'cloud' || compCertMode === 'cloud' || curriculumMode === 'cloud'



  return (

    <div className="min-h-screen flex">

      <aside className="w-56 shrink-0 glass border-r border-warm-300 flex flex-col">

        <div className="p-5 border-b border-warm-300">

          <h1 className="text-lg font-bold text-gradient">人工智能实训基地</h1>

          <p className="text-xs text-warm-500 mt-1">

            {data ? `${data.meta.total_labs} 实训室 · ${data.meta.total_courses} 课程` : '加载中...'}

          </p>

          {showModeHint && (

            <p className="text-xs text-amber-600 mt-1" title="开发模式请确保 start.bat 已启动后端（8000 端口）">

              模式：{modeLabel}{jobMapMode === 'cloud' && courseMode === 'server' ? ' · 岗位走云端' : ''}{compCertMode === 'cloud' && courseMode === 'server' ? ' · 竞赛证书走云端' : ''}{curriculumMode === 'cloud' && courseMode === 'server' ? ' · 课程体系走云端' : ''}

            </p>

          )}

        </div>



        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, label, icon: Icon }) => {
            const labSection = to === '/labs'
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => {
                  const active = labSection
                    ? location.pathname === '/labs' || location.pathname.startsWith('/labs/')
                    : isActive
                  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-warm-600 hover:text-warm-900 hover:bg-warm-100'
                  }`
                }}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>



        <div className="p-3 border-t border-warm-300">

          <button

            onClick={() => navigate('/demo')}

            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-accent-secondary/20 to-accent-primary/20 border border-accent-primary/30 text-sm text-warm-800 hover:brightness-110 transition"

          >

            <Monitor size={16} />

            大屏演示

          </button>

        </div>

      </aside>



      <main className="flex-1 overflow-auto">

        {loading && !data && !skipCourseLoadingGate ? (

          <div className="flex items-center justify-center h-full">

            <div className="text-center">

              <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />

              <p className="mt-4 text-warm-600">加载课程数据中...</p>

            </div>

          </div>

        ) : (

          <div className={`p-6 mx-auto ${isJobsPage ? 'max-w-[1920px]' : 'max-w-[1600px]'}`}>
            {children}
          </div>

        )}

      </main>

    </div>

  )

}

