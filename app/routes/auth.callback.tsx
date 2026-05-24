import type { Route } from './+types/auth.callback'
import { redirect } from 'react-router'
import { safeRedirect } from '~/lib/redirect'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const target = safeRedirect(next, '/dashboard')

  if (!code) {
    return redirect('/login?error=missing_code')
  }

  const { supabase, headers } = createSupabaseServerClient(request)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`, { headers })
  }

  return redirect(target, { headers })
}
