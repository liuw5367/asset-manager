import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { categories, getAssetById, paymentAccounts, paymentTypes } from '~/data/mock'

export default function AssetsEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const asset = getAssetById(id ?? '')
  const [isSubscription, setIsSubscription] = useState(asset?.assetType === 'subscription')
  const [emoji] = useState(asset?.emoji ?? '📦')

  if (!asset) {
    return <div className="py-10 text-center" style={{ color: 'var(--color-muted)' }}>资产不存在</div>
  }

  return (
    <div>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between py-3"
        style={{ background: 'var(--color-canvas)' }}
      >
        <button
          onClick={() => navigate(`/assets/${id}`)}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          ‹ 返回
        </button>
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          编辑资产
        </span>
        <button
          onClick={() => navigate(`/assets/${id}`)}
          className="text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          保存
        </button>
      </div>

      {/* Emoji */}
      <div className="flex flex-col items-center py-4 pb-6">
        <div
          className="flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-lg text-[30px]"
          style={{ background: 'var(--color-primary-muted)' }}
        >
          {emoji}
        </div>
      </div>

      {/* Name */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        名称 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{
          background: 'var(--color-canvas)',
          borderColor: 'var(--color-hairline)',
          color: 'var(--color-ink)',
        }}
        type="text"
        defaultValue={asset.name}
      />

      {/* Category */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        分类 *
      </label>
      <div className="relative mb-3">
        <select
          className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 pr-9 text-[15px] outline-none"
          style={{
            background: 'var(--color-canvas)',
            borderColor: 'var(--color-hairline)',
            color: 'var(--color-ink)',
          }}
          defaultValue={asset.categoryId}
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.emoji}
              {' '}
              {c.name}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-muted)' }}
        />
      </div>

      {/* Subscription toggle */}
      <div className="mb-3 flex items-center justify-between py-2">
        <span className="text-[14px]" style={{ color: 'var(--color-ink)' }}>
          订阅资产
        </span>
        <label className="relative inline-block h-6 w-11 cursor-pointer">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isSubscription}
            onChange={e => setIsSubscription(e.target.checked)}
          />
          <span
            className="absolute inset-0 rounded-full transition-colors peer-checked:bg-[var(--color-primary)]"
            style={{ background: 'var(--color-surface-strong)' }}
          />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {!isSubscription
        ? (
            <>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                购入价 *
              </label>
              <input
                className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                type="number"
                defaultValue={asset.purchasePrice}
              />

              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                当前估价
              </label>
              <input
                className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                type="number"
                defaultValue={asset.currentValue}
              />
            </>
          )
        : (
            <>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                订阅价 *
              </label>
              <input
                className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                type="number"
                defaultValue={asset.subscriptionPrice}
              />

              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                订阅周期
              </label>
              <div className="relative mb-3">
                <select
                  className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 pr-9 text-[15px] outline-none"
                  style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  defaultValue={asset.billingCycle ?? 'monthly'}
                >
                  <option value="monthly">月付</option>
                  <option value="quarterly">季付</option>
                  <option value="yearly">年付</option>
                </select>
                <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              </div>

              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                下次续费日期
              </label>
              <input
                className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                type="date"
                defaultValue={asset.nextRenewalDate}
              />
            </>
          )}

      {/* Purchase date */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        {isSubscription ? '订阅开始日期' : '购入日期 *'}
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="date"
        defaultValue={isSubscription ? asset.subscriptionStartDate : asset.purchaseDate}
      />

      {/* Payment type + account */}
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            支付类型
          </label>
          <div className="relative">
            <select
              className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 pr-9 text-[15px] outline-none"
              style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              defaultValue={asset.paymentTypeId ?? ''}
            >
              <option value="">可选</option>
              {paymentTypes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            支付账户
          </label>
          <div className="relative">
            <select
              className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 pr-9 text-[15px] outline-none"
              style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              defaultValue={asset.paymentAccountId ?? ''}
            >
              <option value="">可选</option>
              {paymentAccounts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        标签
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="text"
        placeholder="选择或输入标签"
      />

      {/* Notes */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        备注
      </label>
      <textarea
        className="mb-6 h-20 w-full resize-y rounded-[10px] border p-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        defaultValue={asset.notes}
        placeholder="可选备注..."
      />

      {/* Save button */}
      <button
        onClick={() => navigate(`/assets/${id}`)}
        className="sticky bottom-4 mb-6 flex h-11 w-full items-center justify-center rounded-[10px] text-[15px] font-semibold text-white transition-colors"
        style={{ background: 'var(--color-primary)' }}
      >
        保存资产
      </button>
    </div>
  )
}
