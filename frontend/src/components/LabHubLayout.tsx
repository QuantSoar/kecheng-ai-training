import { NavLink, Outlet } from 'react-router-dom'
import { Building2, BookOpen, Factory } from 'lucide-react'

const TABS = [
  { to: '/labs', label: '实训室卡片', icon: Building2, end: true },
  { to: '/labs/courses', label: '课程分析', icon: BookOpen, end: false },
  { to: '/labs/vendors', label: '厂商课程', icon: Factory, end: false },
] as const

export default function LabHubLayout() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gradient">实训室全景</h1>
        <p className="text-warm-600 mt-1">按实训室维度浏览完整课程体系</p>
      </header>

      <nav className="flex flex-wrap gap-2 p-1 rounded-xl bg-warm-100/80 border border-warm-300 w-fit">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-accent-primary shadow-sm border border-accent-primary/20'
                  : 'text-warm-600 hover:text-warm-900 hover:bg-warm-50'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
