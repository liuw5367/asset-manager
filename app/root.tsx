import type { Route } from './+types/root'
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteError,
} from 'react-router'
import './app.css'

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap',
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="theme-color" content="#cc785c" />
        <title>Holdly</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1
          className="mb-2 font-[family-name:var(--font-display)] text-4xl"
          style={{ color: 'var(--color-primary)' }}
        >
          {isRouteErrorResponse(error) ? error.status : 'Error'}
        </h1>
        <p className="mb-6" style={{ color: 'var(--color-muted)' }}>
          {isRouteErrorResponse(error)
            ? error.statusText
            : 'Something went wrong'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
