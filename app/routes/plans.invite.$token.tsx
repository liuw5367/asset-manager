import type { Route } from './+types/plans.invite.$token'
import { redirect } from 'react-router'
import { acceptInviteByToken } from '~/db/queries/plans'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect(`/login?next=/plans/invite/${params.token}`)

  const token = params.token
  const accepted = await acceptInviteByToken(token, user.id)

  if (!accepted)
    return redirect('/plans?invite=invalid', { headers })

  return redirect(`/plans/${accepted.planId}?invite=${accepted.joined ? 'joined' : 'already'}`, { headers })
}

export default function PlanInviteJoinPage() {
  return null
}
