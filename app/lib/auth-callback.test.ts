import { describe, expect, it } from 'vitest'
import { getAuthCallbackTarget } from './auth-callback'

describe('getAuthCallbackTarget', () => {
  it('adds the registered welcome marker after email confirmation', () => {
    expect(getAuthCallbackTarget(null, '1')).toBe('/dashboard?registered=1')
  })

  it('keeps a safe next target unchanged', () => {
    expect(getAuthCallbackTarget('/assets', '1')).toBe('/assets')
  })

  it('falls back to dashboard for unsafe next targets', () => {
    expect(getAuthCallbackTarget('//evil.test', null)).toBe('/dashboard')
  })
})
