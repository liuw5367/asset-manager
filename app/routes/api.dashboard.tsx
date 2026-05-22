import { redirect } from 'react-router'
import { getDashboardData } from '~/db/queries/dashboard'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const data = await getDashboardData(user.id)
  return data
}
