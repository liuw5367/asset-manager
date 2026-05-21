import type { RouteConfig } from '@react-router/dev/routes'
import {
  index,
  layout,
  route,

} from '@react-router/dev/routes'

export default [
  index('routes/_index.tsx'),

  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  route('forgot-password', 'routes/forgot-password.tsx'),
  route('auth/callback', 'routes/auth.callback.tsx'),

  layout('components/layout/app-shell.tsx', [
    route('dashboard', 'routes/dashboard.tsx'),
    route('assets', 'routes/assets._index.tsx'),
    route('assets/new', 'routes/assets.new.tsx'),
    route('assets/:id', 'routes/assets.$id.tsx'),
    route('assets/:id/edit', 'routes/assets.$id.edit.tsx'),
    route('assets/:id/trade-in', 'routes/assets.$id.trade-in.tsx'),
    route('plans', 'routes/plans._index.tsx'),
    route('plans/new', 'routes/plans.new.tsx'),
    route('plans/:id', 'routes/plans.$id.tsx'),
    route('plans/:id/edit', 'routes/plans.$id.edit.tsx'),
    route('plans/:id/records/:month', 'routes/plans.$id.records.$month.tsx'),
    route('plans/:id/records/:month/edit', 'routes/plans.$id.records.$month.edit.tsx'),
    route('settings', 'routes/settings.tsx'),
    route('settings/categories', 'routes/settings/categories.tsx'),
    route('settings/tags', 'routes/settings/tags.tsx'),
    route('settings/payment-types', 'routes/settings/payment-types.tsx'),
    route('settings/payment-accounts', 'routes/settings/payment-accounts.tsx'),
  ]),
] satisfies RouteConfig
