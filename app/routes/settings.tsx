import type { Route } from './+types/settings'
import {
  IconChevronRight,
  IconDeviceDesktop,
  IconDownload,
  IconLoader2,
  IconLogout,
  IconMail,
  IconMoon,
  IconSun,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, redirect, useFetcher } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  await supabase.auth.signOut()
  return redirect('/login', { headers })
}

const modes = [
  { key: 'auto', label: '自动', icon: IconDeviceDesktop },
  { key: 'light', label: '浅色', icon: IconSun },
  { key: 'dark', label: '深色', icon: IconMoon },
] as const

type ThemeMode = (typeof modes)[number]['key']

export default function SettingsPage() {
  const [emailReminder, setEmailReminder] = useState(true)
  const [activeMode, setActiveMode] = useState<ThemeMode>('auto')
  const logoutFetcher = useFetcher()
  const isLoggingOut = logoutFetcher.state !== 'idle'

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Page header */}
      <h1
        className="mb-6 text-2xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
      >
        设置
      </h1>

      {/* User card */}
      <div
        className="mb-8 flex items-center gap-4 rounded-2xl p-5"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          W
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-base font-medium"
            style={{ color: 'var(--color-ink)' }}
          >
            Wang Liu
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-muted-soft)' }}
          >
            wang@example.com
          </p>
        </div>
        <logoutFetcher.Form method="post">
          <button
            type="submit"
            disabled={isLoggingOut}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--color-error)' }}
          >
            {isLoggingOut ? <IconLoader2 size={16} className="animate-spin" /> : <IconLogout size={16} />}
            退出登录
          </button>
        </logoutFetcher.Form>
      </div>

      {/* Section: Notifications */}
      <section className="mb-8">
        <h2
          className="mb-3 text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-muted-soft)' }}
        >
          通知
        </h2>
        <div
          className="rounded-2xl p-1"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <IconMail
                size={20}
                style={{ color: 'var(--color-primary)' }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  邮件到期提醒
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: 'var(--color-muted-soft)' }}
                >
                  订阅续费和保修到期前发送邮件提醒
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={emailReminder}
                onChange={e => setEmailReminder(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className="h-6 w-11 rounded-full transition-colors peer-checked:bg-[var(--color-primary)] peer-focus:outline-none"
                style={{
                  backgroundColor: emailReminder
                    ? 'var(--color-primary)'
                    : 'var(--color-surface-strong)',
                }}
              >
                <div
                  className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white transition-transform"
                  style={{
                    transform: emailReminder
                      ? 'translateX(20px)'
                      : 'translateX(0)',
                  }}
                />
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Section: Data Management */}
      <section className="mb-8">
        <h2
          className="mb-3 text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-muted-soft)' }}
        >
          数据管理
        </h2>
        <div
          className="overflow-hidden rounded-2xl"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          {[
            { label: '分类管理', to: '/settings/categories' },
            { label: '标签管理', to: '/settings/tags' },
            { label: '支付类型管理', to: '/settings/payment-types' },
            { label: '支付账户管理', to: '/settings/payment-accounts' },
          ].map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between px-4 py-3.5 transition-colors"
              style={{
                borderBottom:
                  i < 3 ? '1px solid var(--color-hairline)' : undefined,
              }}
            >
              <span
                className="text-sm"
                style={{ color: 'var(--color-ink)' }}
              >
                {item.label}
              </span>
              <IconChevronRight
                size={18}
                style={{ color: 'var(--color-muted-soft)' }}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Section: Display */}
      <section className="mb-8">
        <h2
          className="mb-3 text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-muted-soft)' }}
        >
          显示
        </h2>
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div
            className="flex gap-2 rounded-xl p-1"
            style={{ backgroundColor: 'var(--color-surface-strong)' }}
          >
            {modes.map((m) => {
              const Icon = m.icon
              const isActive = activeMode === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMode(m.key)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--color-surface-card)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--color-ink)'
                      : 'var(--color-muted-soft)',
                    boxShadow: isActive
                      ? '0 1px 3px rgba(0,0,0,0.08)'
                      : 'none',
                  }}
                >
                  <Icon size={16} />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Export button */}
      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          color: 'var(--color-body)',
        }}
      >
        <IconDownload size={18} />
        导出数据
      </button>
    </div>
  )
}
