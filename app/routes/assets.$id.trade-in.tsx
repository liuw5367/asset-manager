import type { Route } from './+types/assets.$id.trade-in'
import { IconCheck, IconDeviceFloppy, IconPencil } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { redirect, useLoaderData, useSubmit } from 'react-router'
import { AssetForm } from '~/components/asset-form'
import { SubPageHeader } from '~/components/page-header'
import { DatePicker } from '~/components/ui/date-picker'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  getAssetById,
  getCategoriesByUserId,
  getOrCreateTradeInTag,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  linkTradedFromAsset,
  markAssetAsTradedIn,
} from '~/db/queries/assets'

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
  const tradeInPrice = (formData.get('tradeInPrice') as string) || '0'
  const tradeInDate = (formData.get('tradeInDate') as string) || new Date().toISOString().split('T')[0]

  // 1. 标记旧资产为已换购（不再软删除）
  await markAssetAsTradedIn(params.id, userId, tradeInPrice, tradeInDate)

  // 2. 获取/创建「以旧换新购买」标签
  const tradeInTag = await getOrCreateTradeInTag(userId)

  // 3. 创建新资产
  const { createAsset } = await import('~/db/queries/assets')
  const assetType = (formData.get('assetType') as 'one_time' | 'subscription') || 'one_time'
  const tagIds = formData.getAll('tagIds').map(String)
  // 自动添加以旧换新标签
  if (!tagIds.includes(tradeInTag.id))
    tagIds.push(tradeInTag.id)

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
          purchasePrice: formData.get('newPrice') as string,
          purchaseDate: tradeInDate,
        }
      : {
          ...baseData,
          subscriptionPrice: (formData.get('subscriptionPrice') as string) || undefined,
          billingCycle: (formData.get('billingCycle') as 'monthly' | 'quarterly' | 'yearly') || undefined,
          subscriptionStartDate: (formData.get('subscriptionStartDate') as string) || undefined,
        },
  )

  // 4. 关联新旧资产
  await linkTradedFromAsset(newAssetId, params.id)

  return redirect(`/assets/${newAssetId}`, { headers })
}

export default function AssetsTradeIn() {
  const { asset, categories, tags, paymentTypes, paymentAccounts } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const submitRef = useRef<HTMLButtonElement>(null)

  const [tradeInPrice, setTradeInPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [tradeInDate, setTradeInDate] = useState(() => new Date().toISOString().split('T')[0])

  const tradeVal = Number.parseFloat(tradeInPrice) || 0
  const newP = Number.parseFloat(newPrice) || 0
  const showCalc = tradeVal > 0 || newP > 0
  const actualSpend = newP - tradeVal

  // 旧设备持有成本 = 购买价格 - 回收价格
  const oldHoldingCost = asset.purchasePrice ? Number(asset.purchasePrice) - tradeVal : 0
  // 旧设备持有天数 = 回收日期 - 购买日期
  const oldHoldingDays = asset.purchaseDate
    ? Math.max(1, Math.floor((new Date(tradeInDate).getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1
  // 旧设备持有成本/天
  const oldDailyCost = oldHoldingDays > 0 ? oldHoldingCost / oldHoldingDays : 0
  // 新设备实际花费
  const newActualCost = newP - tradeVal

  function handleAssetFormSubmit(fd: FormData) {
    fd.append('tradeInDate', tradeInDate)
    fd.append('tradeInPrice', tradeInPrice || '0')
    fd.append('newPrice', newPrice || '0')
    fd.append('actualSpend', String(actualSpend))
    submit(fd, { method: 'post' })
  }

  return (
    <div>
      <SubPageHeader
        backTo={`/assets/${asset.id}`}
        backLabel="返回"
        title="以旧换新"
        primaryAction={{
          label: '换新',
          icon: IconCheck,
          onClick: () => submitRef.current?.click(),
        }}
      />
      <AssetForm
        categories={categories}
        tags={tags}
        paymentTypes={paymentTypes}
        paymentAccounts={paymentAccounts}
        mode="asset"
        hideOneTimeFields
        hideHeader
        submitLabel="完成换新"
        onSubmit={handleAssetFormSubmit}
        submitRef={submitRef}
        topContent={(
          <>
            <div
              className="mb-3 text-sm font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-muted-soft)' }}
            >
              旧设备回收
            </div>
            <div className="mb-4 rounded-lg p-4" style={{ background: 'var(--color-surface-soft)' }}>
              <p className="mb-3 text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>{asset.name}</p>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                购买价
              </Label>
              <Input
                className="mb-3"
                readOnly
                value={asset.purchasePrice ? Number(asset.purchasePrice).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              />
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
      >
        {/* 计算面板 - T-08 */}
        {showCalc && (
          <div
            className="mb-4 rounded-lg p-4"
            style={{ background: 'var(--color-surface-card)' }}
          >
            <div className="mb-2 flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--color-muted)' }}>旧设备持有成本</span>
              <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
                {oldHoldingCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-[14px]">
              <span style={{ color: 'var(--color-muted)' }}>旧设备持有成本/天</span>
              <span className="font-mono font-medium" style={{ color: 'var(--color-muted-soft)' }}>
                {oldDailyCost.toFixed(2)}
                /天
              </span>
            </div>
            <div className="my-2 h-px" style={{ background: 'var(--color-hairline)' }} />
            <div className="flex items-center justify-between text-[14px]">
              <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>新设备实际花费</span>
              <span className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
                {newActualCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </AssetForm>
    </div>
  )
}
