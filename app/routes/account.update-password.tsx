import type { Route } from './+types/account.update-password'

import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, redirect, useFetcher } from 'react-router'
import { z } from 'zod'
import { createSupabaseServerClient } from '~/lib/supabase.server'

const updatePasswordSchema = z
  .object({
    password: z.string().min(1, '请输入新密码').min(8, '密码至少 8 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login', { headers })
  }
  return new Response(null, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login', { headers })
  }

  const formData = await request.formData()
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = updatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export default function UpdatePassword() {
  const fetcher = useFetcher<{ error?: string, success?: boolean }>()
  const [showPassword, setShowPassword] = useState(false)
  const isSubmitting = fetcher.state !== 'idle'

  if (fetcher.data?.success) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 24px 32px',
          textAlign: 'center',
          background: 'var(--color-canvas)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 42,
              color: 'var(--color-primary)',
              marginBottom: 20,
            }}
          >
            Holdly
          </div>
          <div
            style={{
              background: 'var(--color-surface-card)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
              密码已更新
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 8 }}>
              你可以用新密码继续使用 Holdly。
            </p>
            <Link to="/dashboard">
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  padding: '12px 20px',
                  width: '100%',
                  marginTop: 16,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-active)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                进入应用
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 24px 32px',
        textAlign: 'center',
        background: 'var(--color-canvas)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 42,
            color: 'var(--color-primary)',
            marginBottom: 20,
          }}
        >
          Holdly
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--color-ink)',
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          设置新密码
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 32 }}>
          输入你想要的新密码，至少 8 位。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {fetcher.data?.error && (
            <div
              style={{
                borderRadius: 8,
                padding: '10px 12px',
                textAlign: 'center',
                fontSize: 14,
                background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              {fetcher.data.error}
            </div>
          )}

          <fetcher.Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  marginBottom: 6,
                }}
              >
                新密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 8 位"
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 40px 0 12px',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 10,
                    fontSize: 15,
                    color: 'var(--color-ink)',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-muted)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-hairline)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword
                    ? (
                        <IconEyeOff size={18} />
                      )
                    : (
                        <IconEye size={18} />
                      )}
                </button>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  marginBottom: 6,
                }}
              >
                确认新密码
              </label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 12px',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 10,
                  fontSize: 15,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-muted)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-hairline)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                padding: '12px 20px',
                width: '100%',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-active)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isSubmitting ? '更新中...' : '更新密码'}
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  )
}
