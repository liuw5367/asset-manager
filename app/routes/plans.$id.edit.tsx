import type { Route } from './+types/plans.$id.edit'
import { data as loaderDataFn, redirect, useActionData, useLoaderData, useNavigation, useSubmit } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'
import { PlanEditorPage } from './plans.editor-page'
import { handlePlanEditorAction, loadPlanEditorData } from './plans.shared'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const origin = new URL(request.url).origin
  const editorData = await loadPlanEditorData({
    planId: params.id,
    userId: user.id,
    origin,
    userEmail: user.email,
  })

  if (!editorData)
    throw new Response('Not Found', { status: 404 })

  return loaderDataFn(editorData, { headers })
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const formData = await request.formData()
  const origin = new URL(request.url).origin

  try {
    const result = await handlePlanEditorAction({
      planId: params.id,
      userId: user.id,
      origin,
      formData,
    })

    if (result.intent === 'save-plan')
      return redirect(`/plans/${result.planId}`, { headers })

    return loaderDataFn(result, { headers })
  }
  catch (error) {
    return loaderDataFn({ error: error instanceof Error ? error.message : '操作失败' }, { headers })
  }
}

export default function PlansEditRoute() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submit = useSubmit()

  const submittingIntent = String(navigation.formData?.get('intent') || '')
  const isSaving = navigation.state !== 'idle' && submittingIntent === 'save-plan'
  const isRegeneratingInvite = navigation.state !== 'idle' && submittingIntent === 'regenerate-invite'
  const isRevokingInvite = navigation.state !== 'idle' && submittingIntent === 'revoke-invite'
  const isImportingHistory = navigation.state !== 'idle' && submittingIntent === 'import-history'

  function submitIntent(intent: string, payload?: unknown, file?: File) {
    const fd = new FormData()
    fd.set('intent', intent)
    if (payload)
      fd.set('payload', JSON.stringify(payload))
    if (file)
      fd.set('csvFile', file)
    submit(fd, {
      method: 'post',
      encType: file ? 'multipart/form-data' : 'application/x-www-form-urlencoded',
    })
  }

  return (
    <PlanEditorPage
      data={data}
      actionData={actionData || undefined}
      isSaving={isSaving}
      isRegeneratingInvite={isRegeneratingInvite}
      isRevokingInvite={isRevokingInvite}
      isImportingHistory={isImportingHistory}
      onSubmitSave={payload => submitIntent('save-plan', payload)}
      onRegenerateInvite={() => submitIntent('regenerate-invite')}
      onRevokeInvite={() => submitIntent('revoke-invite')}
      onImportHistory={file => submitIntent('import-history', undefined, file)}
    />
  )
}
