import { safeRedirect } from './redirect'

export function getAuthCallbackTarget(next: string | null, registered: string | null): string {
  const target = safeRedirect(next, '/dashboard')
  if (target === '/dashboard' && registered === '1')
    return '/dashboard?registered=1'
  return target
}
