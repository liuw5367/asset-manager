import type { Route } from './+types/plans.new'
import { redirect, useActionData, useLoaderData, useNavigation, useSubmit } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'
import { PlanEditorPage } from './plans.editor-page'
import { handlePlanEditorAction, loadPlanEditorData } from './plans.shared'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const origin = new URL(request.url).origin
  const data = await loadPlanEditorData({
    planId: undefined,
    userId: user.id,
    origin,
    userEmail: user.email,
  })

  if (!data)
    throw new Response('Not Found', { status: 404 })

  return data
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const origin = new URL(request.url).origin

  try {
    const result = await handlePlanEditorAction({
      planId: undefined,
      userId: user.id,
      origin,
      formData,
    })

    if (result.intent === 'save-plan')
      return redirect(`/plans/${result.planId}`, { headers })

    return result
  }
  catch (error) {
    return { error: error instanceof Error ? error.message : '操作失败' }
  }
}

export default function PlansNewRoute() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submit = useSubmit()

  const isSubmitting = navigation.state !== 'idle'

  function submitIntent(intent: string, payload?: unknown) {
    const fd = new FormData()
    fd.set('intent', intent)
    if (payload)
      fd.set('payload', JSON.stringify(payload))
    submit(fd, { method: 'post' })
  }

  return (
    <PlanEditorPage
      data={data}
      actionData={actionData || undefined}
      isSubmitting={isSubmitting}
      onSubmitSave={payload => submitIntent('save-plan', payload)}
      onRegenerateInvite={() => submitIntent('regenerate-invite')}
      onRevokeInvite={() => submitIntent('revoke-invite')}
    />
  )
}
