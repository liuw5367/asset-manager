/**
 * 校验来自 query string 的 `next` 参数是否安全可用作站内跳转。
 *
 * 仅允许形如 `/foo/bar` 的站内绝对路径；过滤掉 `//evil.com/x` 这种
 * protocol-relative URL，避免 open redirect 漏洞。
 */
export function safeRedirect(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next)
    return fallback
  if (typeof next !== 'string')
    return fallback
  if (!next.startsWith('/'))
    return fallback
  if (next.startsWith('//'))
    return fallback
  if (next.startsWith('/\\'))
    return fallback
  return next
}
