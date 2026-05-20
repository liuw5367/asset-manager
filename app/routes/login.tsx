import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div
      style={{ minHeight: '100dvh', background: 'var(--color-canvas)' }}
      className="flex items-center justify-center px-4"
    >
      <div className="w-full max-w-[360px] flex flex-col items-center py-12">
        {/* Brand */}
        <h1
          className="text-[42px] font-normal"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-primary)',
            lineHeight: 1.15,
          }}
        >
          Holdly
        </h1>
        <p
          className="mt-2 text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--color-ink)',
            lineHeight: 1.3,
          }}
        >
          把每一件资产，
          <br />
          变成看得清的日常成本。
        </p>
        <p
          className="mt-3 text-center"
          style={{ fontSize: 13, color: 'var(--color-muted)' }}
        >
          开始记录你的每件物品，追踪真实持有成本。
        </p>

        {/* Auth group */}
        <div className="mt-8 w-full flex flex-col gap-3">
          {/* GitHub OAuth */}
          <button
            type="button"
            className="h-11 w-full flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium"
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-hairline)',
              color: 'var(--color-ink)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            使用 GitHub 登录
          </button>

          {/* Google OAuth */}
          <button
            type="button"
            className="h-11 w-full flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium"
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-hairline)',
              color: 'var(--color-ink)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            使用 Google 登录
          </button>

          {/* Divider */}
          <div
            className="relative my-1 flex items-center justify-center"
            style={{ color: 'var(--color-muted)', fontSize: 13 }}
          >
            <span
              className="absolute inset-x-0 top-1/2"
              style={{
                height: 1,
                background: 'var(--color-hairline)',
              }}
            />
            <span
              className="relative px-3"
              style={{ background: 'var(--color-canvas)' }}
            >
              或
            </span>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                }}
              >
                邮箱
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="h-11 w-full rounded-[10px] px-3 text-[15px] outline-none"
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              />
            </div>
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                }}
              >
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-[10px] px-3 pr-10 text-[15px] outline-none"
                  style={{
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-hairline)',
                    color: 'var(--color-ink)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)' }}
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

            <button
              type="submit"
              className="h-11 w-full rounded-[10px] text-[15px] font-semibold mt-4"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              登录
            </button>
          </form>

          {/* Footer links */}
          <div
            className="flex justify-between mt-1"
            style={{ fontSize: 13 }}
          >
            <Link to="/forgot-password" style={{ color: 'var(--color-primary)' }}>
              忘记密码？
            </Link>
            <Link to="/register" style={{ color: 'var(--color-primary)' }}>
              没有账号？去注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
