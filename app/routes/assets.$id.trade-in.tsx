import type { Route } from './+types/assets.$id.trade-in'
import { useState } from 'react'
import { redirect, useLoaderData, useSubmit } from 'react-router'
import { AssetForm } from '~/components/asset-form'
import { DatePicker } from '~/components/ui/date-picker'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  getAssetById,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  softDeleteAsset,
} from '~/db/queries/assets'
import { calcOneTimeDailyCost } from '~/lib/cost'

import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const asset = await getAssetById(params.id, userId)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  const [categories, tags, paymentTypes, paymentAccounts] = await Promise.all([
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
  ])

  return { asset, categories, tags, paymentTypes, paymentAccounts }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const formData = await request.formData()

  // 1. 软删除旧资产
  await softDeleteAsset(params.id, userId)

  // 2. 创建新资产
  const { createAsset } = await import('~/db/queries/assets')
  const assetType = (formData.get('assetType') as 'one_time' | 'subscription') || 'one_time'
  const tagIds = formData.getAll('tagIds').map(String)
  const baseData = {
    userId,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '📦',
    categoryId: formData.get('categoryId') as string,
    assetType,
    paymentTypeId: (formData.get('paymentTypeId') as string) || undefined,
    paymentAccountId: (formData.get('paymentAccountId') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    tagIds,
  }

  const newAssetId = await createAsset(
    assetType === 'one_time'
      ? {
          ...baseData,
          purchasePrice: formData.get('actualSpend') as string,
          purchaseDate: formData.get('tradeInDate') as string,
        }
      : {
          ...baseData,
          subscriptionPrice: (formData.get('subscriptionPrice') as string) || undefined,
          billingCycle: (formData.get('billingCycle') as 'monthly' | 'quarterly' | 'yearly') || undefined,
          nextRenewalDate: (formData.get('nextRenewalDate') as string) || undefined,
          subscriptionStartDate: (formData.get('subscriptionStartDate') as string) || undefined,
        },
  )

  return redirect(`/assets/${newAssetId}`, { headers })
}

export default function AssetsTradeIn() {
  const { asset, categories, tags, paymentTypes, paymentAccounts } = useLoaderData<typeof loader>()
  const submit = useSubmit()

  const [tradeInPrice, setTradeInPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [todayTs] = useState(() => Date.now())
  const [tradeInDate, setTradeInDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isSubscriptionNewAsset, setIsSubscriptionNewAsset] = useState(false)

  const tradeVal = Number.parseFloat(tradeInPrice) || 0
  const newP = Number.parseFloat(newPrice) || 0
  const showCalc = tradeVal > 0 || newP > 0
  const actualSpend = newP - tradeVal

  const oldHoldingDays = asset.purchaseDate
    ? Math.max(1, Math.floor((todayTs - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1
  const oldDailyCost = asset.purchasePrice
    ? calcOneTimeDailyCost(Number(asset.purchasePrice), asset.purchaseDate!)
    : 0
  const newDailyCost = actualSpend > 0 ? (actualSpend / oldHoldingDays) : 0

  function handleAssetFormSubmit(fd: FormData) {
    fd.append('tradeInDate', tradeInDate)
    fd.append('tradeInPrice', tradeInPrice || '0')
    if (!isSubscriptionNewAsset)
      fd.append('actualSpend', String(actualSpend))
    submit(fd, { method: 'post' })
  }

  return (
    <div>
      {/* Top bar - rendered by AssetForm, but we handle it manually here */}
      <AssetForm
        categories={categories}
        tags={tags}
        paymentTypes={paymentTypes}
        paymentAccounts={paymentAccounts}
        showSubscriptionToggle
        hideOneTimeFields
        submitLabel="完成换新"
        backLabel="‹ 返回详情"
        backTo={`/assets/${asset.id}`}
        title="以旧换新"
        onAssetTypeChange={setIsSubscriptionNewAsset}
        onSubmit={handleAssetFormSubmit}
        topContent={(
          <>
            <div className="mb-1 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
              <span>旧设备回收</span>
              <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
            </div>
            <div className="mb-4 rounded-lg p-4" style={{ background: 'var(--color-surface-soft)' }}>
              <p className="mb-3 text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>{asset.name}</p>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                回收价 *
              </Label>
              <Input
                className="mb-3"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tradeInPrice}
                onChange={e => setTradeInPrice(e.target.value)}
              />

              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                换新日 *
              </Label>
              <DatePicker
                value={tradeInDate}
                onChange={setTradeInDate}
              />
            </div>

            {!isSubscriptionNewAsset && (
              <>
                <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>新设备标价 *</Label>
                <Input
                  className="mb-3"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                />
                <p className="mb-3 text-[12px]" style={{ color: 'var(--color-muted)' }}>
                  标价用于计算，最终入账购入价 = 新设备标价 - 回收抵扣。
                </p>
              </>
            )}
          </>
        )}
      >
        {/* 计算面板 */}
        {!isSubscriptionNewAsset && showCalc && (
          <div
            className="mb-4 rounded-lg p-4"
            style={{ background: 'var(--color-surface-card)' }}
          >
            <div className="mb-2 flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--color-muted)' }}>新设备标价</span>
              <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                {newP.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--color-muted)' }}>旧设备回收抵扣</span>
              <span className="font-medium" style={{ color: 'var(--color-error)' }}>
                −
                {tradeVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="my-2 h-px" style={{ background: 'var(--color-hairline)' }} />
            <div className="mb-3 flex items-center justify-between text-[14px]">
              <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>实际支出</span>
              <span className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
                {actualSpend.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mb-3 rounded-md bg-[var(--color-primary-muted)] px-3 py-2 text-[12px]" style={{ color: 'var(--color-body)' }}>
              新资产将以「实际支出」作为购入价入账。
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span style={{ color: 'var(--color-muted)' }}>旧资产每日成本（历史）</span>
              <span className="font-mono" style={{ color: 'var(--color-muted-soft)' }}>
                {oldDailyCost.toFixed(2)}
                /天
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span style={{ color: 'var(--color-muted)' }}>新资产每日成本（预计）</span>
              <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                {newDailyCost > 0 ? `${newDailyCost.toFixed(2)}/天` : '—'}
              </span>
            </div>
          </div>
        )}
      </AssetForm>
    </div>
  )
}
