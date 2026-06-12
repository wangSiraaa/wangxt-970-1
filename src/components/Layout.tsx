import { NavLink, useLocation } from 'react-router-dom'
import { useScheduleStore } from '@/store/useScheduleStore'
import { CalendarDays, ClipboardList, AlertTriangle, Scale } from 'lucide-react'
import type { Role } from '@/types'

const ROLE_LABELS: Record<Role, string> = {
  manager: '值班主管',
  lawyer: '律师',
  citizen: '群众',
  onsite: '现场人员',
}

const ROLES: Role[] = ['manager', 'lawyer', 'citizen', 'onsite']

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentRole, setRole } = useScheduleStore()
  const location = useLocation()

  const navItems = [
    { path: '/', label: '排班日历', icon: CalendarDays },
    { path: '/booking', label: '预约详情', icon: ClipboardList },
    { path: '/conflict', label: '冲突处理', icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-[#0F1923] text-gray-100">
      <header className="bg-[#1B2A4A] border-b border-[#2A3F5F] sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4A843] to-[#B8912E] flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#1B2A4A]" />
            </div>
            <h1 className="text-lg font-bold tracking-wide" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              法律咨询中心
            </h1>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={() => {
                  const active = location.pathname === item.path
                  return `flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    active
                      ? 'bg-[#D4A843]/15 text-[#D4A843] font-medium'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">当前角色：</span>
            <div className="flex bg-[#0F1923] rounded-lg p-0.5">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setRole(role)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all duration-200 ${
                    currentRole === role
                      ? 'bg-[#D4A843] text-[#1B2A4A] font-bold shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
