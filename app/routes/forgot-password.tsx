import { Link, useNavigate } from 'react-router'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/login')
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
          重置密码
        </p>
        <p
          className="mt-3 text-center"
          style={{ fontSize: 13, color: 'var(--color-muted)' }}
        >
          输入注册邮箱，我们会发送重置链接到你的邮箱。
        </p>

        {/* Auth group */}
        <div className="mt-8 w-full flex flex-col gap-3">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label
                className="block mb-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                }}
              >
                注册邮箱
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

            <button
              type="submit"
              className="h-11 w-full rounded-[10px] text-[15px] font-semibold mt-4"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              发送重置链接
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-1" style={{ fontSize: 13 }}>
            <Link to="/login" style={{ color: 'var(--color-primary)' }}>
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
