import type { Route } from './+types/assets.new'
import { useRef } from 'react'
import { redirect, useActionData, useLoaderData, useSubmit } from 'react-router'
import { AssetForm } from '~/components/asset-form'
import { SubPageHeader } from '~/components/page-header'
import {
  createAsset,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
} from '~/db/queries/assets'
import { getAssetDetailPath } from '~/lib/asset-meta'
import { assetFormSchema } from '~/lib/asset.schema'

import { createSupabaseServerClient } from '~/lib/supabase.server'

type FormMode = 'asset' | 'subscription'

function getModeFromPath(pathname: string): FormMode {
  return pathname.startsWith('/subscriptions') ? 'subscription' : 'asset'
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const [categories, tags, paymentTypes, paymentAccounts] = await Promise.all([
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
  ])

  const mode = getModeFromPath(new URL(request.url).pathname)

  return { categories, tags, paymentTypes, paymentAccounts, mode }
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const raw = Object.fromEntries(formData)
  const tagIds = formData.getAll('tagIds').map(String)
  const mode = getModeFromPath(new URL(request.url).pathname)
  const assetType = mode === 'subscription' ? 'subscription' : 'one_time'

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

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const data = parsed.data
  const assetId = await createAsset({
    userId: user.id,
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

  return redirect(getAssetDetailPath({ id: assetId, assetType: data.assetType }), { headers })
}

export default function AssetsNew() {
  const { categories, tags, paymentTypes, paymentAccounts, mode } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const submitRef = useRef<HTMLButtonElement>(null)

  const isSubscription = mode === 'subscription'

  return (
    <div>
      <SubPageHeader
        backTo="/assets"
        backLabel="返回"
        title={isSubscription ? '新增订阅' : '新增资产'}
        primaryAction={{
          label: '保存',
          onClick: () => submitRef.current?.click(),
        }}
      />
      <AssetForm
        categories={categories}
        tags={tags}
        paymentTypes={paymentTypes}
        paymentAccounts={paymentAccounts}
        mode={mode}
        hideHeader
        submitLabel={isSubscription ? '保存订阅' : '保存资产'}
        errors={actionData?.errors}
        onSubmit={fd => submit(fd, { method: 'post' })}
        submitRef={submitRef}
      />
    </div>
  )
}
