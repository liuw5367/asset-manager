import type { Route } from './+types/app-shell'
import {
  IconBox,
  IconFileText,
  IconLayoutDashboard,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react'
import { NavLink, Outlet, redirect, useLocation } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL(request.url)
    return redirect(`/login?next=${encodeURIComponent(url.pathname)}`)
  }

  return { user: { id: user.id, email: user.email } }
}

const navItems = [
  { to: '/dashboard', label: '统计', icon: IconLayoutDashboard },
  { to: '/assets', label: '资产', icon: IconBox },
  { to: '/plans', label: '月度计划', icon: IconFileText },
  { to: '/settings', label: '设置', icon: IconSettings },
]

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <nav
        className="hidden md:flex fixed top-0 left-0 z-50 h-screen w-[220px] flex-col border-r px-3 py-6"
        style={{
          background: 'var(--color-surface-soft)',
          borderColor: 'var(--color-hairline)',
        }}
      >
        <div
          className="mb-6 px-2 font-[family-name:var(--font-display)] text-[22px]"
          style={{ color: 'var(--color-primary)' }}
        >
          Holdly
        </div>

        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/assets' || item.to === '/plans' || item.to === '/settings'}
            className={({ isActive }) =>
              `flex h-11 items-center gap-2.5 rounded-md px-3 text-[15px] transition-colors ${
                isActive
                  ? 'font-medium'
                  : ''
              }`}
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-primary)' : 'var(--color-body)',
              background: isActive ? 'var(--color-primary-muted)' : 'transparent',
            })}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <div className="flex-1" />

        <NavLink
          to="/assets/new"
          className="flex h-11 items-center gap-2.5 rounded-md px-3 text-[15px] font-medium transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconPlus size={18} />
          新建资产
        </NavLink>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:ml-[220px] md:pb-6">
        <div className="mx-auto max-w-[640px] px-4 md:max-w-[800px] md:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-start justify-around border-t pt-2 md:hidden"
        style={{
          height: 'var(--tab-bar-height)',
          background: 'var(--color-canvas)',
          borderColor: 'var(--color-hairline)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        {navItems.slice(0, 2).map(item => (
          <TabItem key={item.to} {...item} locationPath={location.pathname} />
        ))}

        <NavLink
          to="/assets/new"
          className="flex h-[52px] w-[52px] -mt-2.5 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 4px 16px rgba(204,120,92,0.4)',
          }}
        >
          <IconPlus size={24} />
        </NavLink>

        {navItems.slice(2).map(item => (
          <TabItem key={item.to} {...item} locationPath={location.pathname} />
        ))}
      </nav>
    </div>
  )
}

function TabItem({
  to,
  label,
  icon: Icon,
  locationPath,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  locationPath: string
}) {
  const isActive = locationPath.startsWith(to)
  return (
    <NavLink
      to={to}
      className="flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors"
      style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-muted)' }}
    >
      <Icon size={22} />
      <span className="font-medium" style={{ color: 'inherit' }}>
        {label}
      </span>
    </NavLink>
  )
}
