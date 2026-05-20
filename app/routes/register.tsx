import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
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
          className="mt-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--color-ink)',
            lineHeight: 1.3,
          }}
        >
          创建账号
        </p>
        <p
          className="mt-3 text-center"
          style={{ fontSize: 13, color: 'var(--color-muted)' }}
        >
          开始记录你的每件资产，追踪真实持有成本。
        </p>

        {/* Auth group */}
        <div className="mt-8 w-full flex flex-col gap-3">
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            {/* 昵称 */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                }}
              >
                昵称
              </label>
              <input
                type="text"
                placeholder="例：王六"
                className="h-11 w-full rounded-[10px] px-3 text-[15px] outline-none"
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              />
            </div>

            {/* 邮箱 */}
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

            {/* 密码 */}
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
                  placeholder="至少 8 位"
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

            {/* 确认密码 */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                }}
              >
                确认密码
              </label>
              <input
                type="password"
                placeholder="再次输入密码"
                className="h-11 w-full rounded-[10px] px-3 text-[15px] outline-none"
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              />
            </div>

            {/* Register button */}
            <button
              type="submit"
              className="h-11 w-full rounded-[10px] text-[15px] font-semibold mt-4"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              注册
            </button>
          </form>

          {/* Terms */}
          <p
            className="text-center mt-3"
            style={{ fontSize: 12, color: 'var(--color-muted)' }}
          >
            注册即表示同意
            {' '}
            <a href="#" style={{ color: 'var(--color-primary)' }}>
              服务条款
            </a>
            {' '}
            和
            {' '}
            <a href="#" style={{ color: 'var(--color-primary)' }}>
              隐私政策
            </a>
          </p>

          {/* Footer */}
          <div className="text-center mt-1" style={{ fontSize: 13 }}>
            <Link to="/login" style={{ color: 'var(--color-primary)' }}>
              已有账号？去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
