import type { Route } from './+types/assets.$id.trade-in'
import { IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { redirect, useLoaderData, useNavigate, useNavigation, useSubmit } from 'react-router'
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session)
    throw redirect('/login')

  const userId = session.user.id
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session)
    throw redirect('/login')

  const userId = session.user.id
  const formData = await request.formData()

  // 1. 软删除旧资产
  await softDeleteAsset(params.id, userId)

  // 2. 创建新资产
  const { createAsset } = await import('~/db/queries/assets')
  const tagIds = formData.getAll('tagIds').map(String)
  const newAssetId = await createAsset({
    userId,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '📦',
    categoryId: formData.get('categoryId') as string,
    assetType: 'one_time',
    purchasePrice: formData.get('actualSpend') as string,
    purchaseDate: formData.get('tradeInDate') as string,
    paymentTypeId: (formData.get('paymentTypeId') as string) || undefined,
    paymentAccountId: (formData.get('paymentAccountId') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    tagIds,
  })

  return redirect(`/assets/${newAssetId}`, { headers })
}

export default function AssetsTradeIn() {
  const { asset, categories, tags, paymentTypes, paymentAccounts } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const submit = useSubmit()
  const isSubmitting = navigation.state === 'submitting'

  const [tradeInPrice, setTradeInPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [tradeInDate, setTradeInDate] = useState(new Date().toISOString().split('T')[0])
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState(asset.categoryId || '')
  const [newPaymentTypeId, setNewPaymentTypeId] = useState(asset.paymentTypeId || '')
  const [newPaymentAccountId, setNewPaymentAccountId] = useState(asset.paymentAccountId || '')
  const [newNotes, setNewNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filteredAccounts = newPaymentTypeId
    ? paymentAccounts.filter(a => a.paymentTypeId === newPaymentTypeId)
    : paymentAccounts

  const tradeVal = Number.parseFloat(tradeInPrice) || 0
  const newP = Number.parseFloat(newPrice) || 0
  const showCalc = tradeVal > 0 || newP > 0
  const actualSpend = newP - tradeVal

  const oldHoldingDays = asset.purchaseDate
    ? Math.max(1, Math.floor((Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1
  const oldDailyCost = asset.purchasePrice
    ? calcOneTimeDailyCost(Number(asset.purchasePrice), asset.purchaseDate!)
    : 0
  const newDailyCost = actualSpend > 0 ? (actualSpend / oldHoldingDays) : 0

  function toggleTag(id: string) {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    )
  }

  function handleSubmit() {
    const fd = new FormData()
    fd.append('tradeInDate', tradeInDate)
    fd.append('tradeInPrice', tradeInPrice || '0')
    fd.append('actualSpend', String(actualSpend))
    fd.append('name', newName)
    fd.append('emoji', asset.emoji)
    fd.append('categoryId', newCategoryId)
    if (newPaymentTypeId)
      fd.append('paymentTypeId', newPaymentTypeId)
    if (newPaymentAccountId)
      fd.append('paymentAccountId', newPaymentAccountId)
    if (newNotes)
      fd.append('notes', newNotes)
    selectedTags.forEach(id => fd.append('tagIds', id))
    submit(fd, { method: 'post' })
  }

  return (
    <div>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between py-3"
        style={{ background: 'var(--color-canvas)' }}
      >
        <button
          onClick={() => navigate(`/assets/${asset.id}`)}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          ‹ 返回详情
        </button>
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          以旧换新
        </span>
        <span />
      </div>

      {/* Old device name */}
      <div className="py-2 text-center">
        <span className="text-base font-semibold" style={{ color: 'var(--color-body)' }}>
          {asset.name}
        </span>
      </div>

      {/* Section: Old device */}
      <div className="mb-1 mt-5 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
        <span>旧设备回收</span>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
      </div>
      <div className="rounded-lg p-4" style={{ background: 'var(--color-surface-soft)' }}>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          回收价 *
        </label>
        <input
          className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="number"
          step="0.01"
          placeholder="0.00"
          value={tradeInPrice}
          onChange={e => setTradeInPrice(e.target.value)}
        />

        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          换新日 *
        </label>
        <input
          className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="date"
          value={tradeInDate}
          onChange={e => setTradeInDate(e.target.value)}
        />
      </div>

      {/* Section: New device */}
      <div className="mb-1 mt-5 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
        <span>新设备</span>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
      </div>

      {/* Emoji */}
      <div className="flex flex-col items-center py-4 pb-6">
        <div
          className="flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-lg text-[30px]"
          style={{ background: 'var(--color-primary-muted)' }}
        >
          {asset.emoji}
        </div>
      </div>

      {/* Name */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        名称 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="text"
        placeholder="例：MacBook Pro M4"
        value={newName}
        onChange={e => setNewName(e.target.value)}
      />

      {/* Category */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        分类 *
      </label>
      <select
        className="mb-3 h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 text-[15px] outline-none"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        value={newCategoryId}
        onChange={e => setNewCategoryId(e.target.value)}
      >
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.emoji}
            {' '}
            {c.name}
          </option>
        ))}
      </select>

      {/* New price */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        购入价 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="number"
        step="0.01"
        placeholder="0.00"
        value={newPrice}
        onChange={e => setNewPrice(e.target.value)}
      />

      {/* Payment type + account */}
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>支付类型</label>
          <select
            className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 text-[15px] outline-none"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            value={newPaymentTypeId}
            onChange={(e) => {
              setNewPaymentTypeId(e.target.value)
              setNewPaymentAccountId('')
            }}
          >
            <option value="">可选</option>
            {paymentTypes.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>支付账户</label>
          <select
            className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 text-[15px] outline-none"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            value={newPaymentAccountId}
            onChange={e => setNewPaymentAccountId(e.target.value)}
          >
            <option value="">可选</option>
            {filteredAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>标签</label>
      <div className="mb-3 flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{
              background: selectedTags.includes(tag.id) ? `${tag.color}22` : 'var(--color-surface-strong)',
              color: selectedTags.includes(tag.id) ? tag.color : 'var(--color-body)',
              border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : 'transparent'}`,
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Notes */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>备注</label>
      <textarea
        className="mb-6 h-20 w-full resize-y rounded-[10px] border p-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        placeholder="可选备注..."
        value={newNotes}
        onChange={e => setNewNotes(e.target.value)}
      />

      {/* Calculation panel */}
      {showCalc && (
        <div
          className="mb-6 rounded-lg p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <div className="mb-2 flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--color-muted)' }}>新资产购入价</span>
            <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
              {newP.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mb-2 flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--color-muted)' }}>以旧换新优惠</span>
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

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !newName || !newPrice}
        className="sticky bottom-4 mb-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white transition-colors disabled:opacity-50"
        style={{ background: 'var(--color-primary)' }}
      >
        {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
        完成换新
      </button>
    </div>
  )
}
