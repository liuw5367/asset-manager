import { describe, expect, it } from 'vitest'
import { getDisplayedLoginError, getPendingLoginIntent } from '~/lib/login-state'

describe('login page helpers', () => {
  it('shows OAuth callback errors from the URL when there is no form error', () => {
    expect(getDisplayedLoginError(undefined, 'OAuth account not linked')).toBe('OAuth account not linked')
  })

  it('prefers the latest form error over the URL error', () => {
    expect(getDisplayedLoginError('不支持的登录方式', 'OAuth account not linked')).toBe('不支持的登录方式')
  })

  it('only marks the submitted login intent as pending', () => {
    const pendingIntent = getPendingLoginIntent('submitting', 'oauth:github')

    expect(pendingIntent).toBe('oauth:github')
    expect(pendingIntent).not.toBe('oauth:google')
    expect(pendingIntent).not.toBe('password')
  })

  it('derives the pending OAuth intent from submitted form fields', () => {
    expect(getPendingLoginIntent('submitting', 'oauth', 'google')).toBe('oauth:google')
  })

  it('has no pending intent when the fetcher is idle', () => {
    expect(getPendingLoginIntent('idle', 'oauth:github')).toBeNull()
  })
})
