import type { Route } from './+types/register'

import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, redirect, useFetcher } from 'react-router'
import { registerSchema } from '~/lib/auth.schema'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    return redirect('/dashboard')
  }
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const formData = await request.formData()

  const raw = {
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { displayName, email, password } = parsed.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    return redirect('/dashboard', { headers })
  }

  return { success: true }
}

export default function Register() {
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
              注册成功
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 8 }}>
              确认邮件已发送到你的邮箱，请点击链接完成验证。
            </p>
            <Link to="/login">
              <button
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
                返回登录
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
        {/* Brand */}
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
          创建账号
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 32 }}>
          开始记录你的每件资产，追踪真实持有成本。
        </p>

        {/* Auth group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {/* Error */}
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
            {/* 昵称 */}
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
                昵称
              </label>
              <input
                name="displayName"
                type="text"
                placeholder="例：王六"
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
                maxLength={30}
              />
            </div>

            {/* 邮箱 */}
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
                邮箱
              </label>
              <input
                name="email"
                type="email"
                placeholder="your@email.com"
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
              />
            </div>

            {/* 密码 */}
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
                密码
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

            {/* 确认密码 */}
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
                确认密码
              </label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="再次输入密码"
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

            {/* Register button */}
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
              {isSubmitting ? '注册中...' : '注册'}
            </button>
          </fetcher.Form>

          {/* Terms */}
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 12, textAlign: 'center' }}>
            注册即表示同意
            {' '}
            <a href="#" style={{ color: 'var(--color-primary)' }}>服务条款</a>
            {' '}
            和
            {' '}
            <a href="#" style={{ color: 'var(--color-primary)' }}>隐私政策</a>
          </p>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              marginTop: 20,
              fontSize: 14,
            }}
          >
            <Link to="/login" style={{ color: 'var(--color-primary)' }}>
              已有账号？去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
