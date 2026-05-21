import type { Route } from './+types/assets.$id.edit'
import { redirect, useActionData, useLoaderData, useSubmit } from 'react-router'
import { AssetForm } from '~/components/asset-form'
import {
  getAssetById,
  getAssetWithTags,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  updateAsset,
} from '~/db/queries/assets'
import { assetFormSchema } from '~/lib/asset.schema'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const assetId = params.id

  const asset = await getAssetById(assetId, userId)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  const [tagIds, categories, tags, paymentTypes, paymentAccounts] = await Promise.all([
    getAssetWithTags(assetId),
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
  ])

  return { asset, tagIds, categories, tags, paymentTypes, paymentAccounts }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const raw = Object.fromEntries(formData)
  const tagIds = formData.getAll('tagIds').map(String)
  const assetType = raw.assetType as 'one_time' | 'subscription'

  const baseData = {
    name: raw.name as string,
    emoji: (raw.emoji as string) || '📦',
    categoryId: raw.categoryId as string,
    assetType,
    paymentTypeId: (raw.paymentTypeId as string) || undefined,
    paymentAccountId: (raw.paymentAccountId as string) || undefined,
    tagIds,
    notes: (raw.notes as string) || undefined,
    purchasePrice: (raw.purchasePrice as string) || undefined,
    currentValue: (raw.currentValue as string) || undefined,
    purchaseDate: (raw.purchaseDate as string) || undefined,
    subscriptionPrice: (raw.subscriptionPrice as string) || undefined,
    billingCycle: (raw.billingCycle as 'monthly' | 'quarterly' | 'yearly') || undefined,
    nextRenewalDate: (raw.nextRenewalDate as string) || undefined,
    subscriptionStartDate: (raw.subscriptionStartDate as string) || undefined,
  }

  const parsed = assetFormSchema.safeParse(baseData)
  if (!parsed.success)
    return { errors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  await updateAsset(params.id, user.id, {
    name: data.name,
    emoji: data.emoji,
    categoryId: data.categoryId,
    assetType: data.assetType,
    paymentTypeId: data.paymentTypeId,
    paymentAccountId: data.paymentAccountId,
    notes: data.notes,
    tagIds: data.tagIds,
    purchasePrice: data.purchasePrice,
    currentValue: data.currentValue,
    purchaseDate: data.purchaseDate,
    subscriptionPrice: data.subscriptionPrice,
    billingCycle: data.billingCycle,
    nextRenewalDate: data.nextRenewalDate,
    subscriptionStartDate: data.subscriptionStartDate,
  })

  return redirect(`/assets/${params.id}`, { headers })
}

export default function AssetsEdit() {
  const { asset, tagIds, categories, tags, paymentTypes, paymentAccounts } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()

  return (
    <AssetForm
      categories={categories}
      tags={tags}
      paymentTypes={paymentTypes}
      paymentAccounts={paymentAccounts}
      defaultValues={{
        name: asset.name,
        emoji: asset.emoji,
        categoryId: asset.categoryId || '',
        assetType: asset.assetType,
        tagIds,
        notes: asset.notes || '',
        paymentTypeId: asset.paymentTypeId || '',
        paymentAccountId: asset.paymentAccountId || '',
        purchasePrice: asset.purchasePrice || '',
        currentValue: asset.currentValue || '',
        purchaseDate: asset.purchaseDate || '',
        subscriptionPrice: asset.subscriptionPrice || '',
        billingCycle: asset.billingCycle || undefined,
        nextRenewalDate: asset.nextRenewalDate || '',
        subscriptionStartDate: asset.subscriptionStartDate || '',
      }}
      showSubscriptionToggle
      submitLabel="保存资产"
      backLabel="‹ 返回详情"
      backTo={`/assets/${asset.id}`}
      title="编辑资产"
      errors={actionData?.errors}
      onSubmit={fd => submit(fd, { method: 'post' })}
    />
  )
}
