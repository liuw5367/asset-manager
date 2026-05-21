import process from 'node:process'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const headers = new Headers()
  const cookieHeader = request.headers.get('Cookie') || ''
  const parsedCookies = parseCookieHeader(cookieHeader)

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => parsedCookies.map(c => ({ name: c.name, value: c.value ?? '' })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
          })
        },
      },
    },
  )

  return { supabase, headers }
}
