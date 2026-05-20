import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { categories, getAssetById } from '~/data/mock'

export default function AssetsTradeIn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const oldAsset = getAssetById(id ?? '')

  const [tradeInPrice, setTradeInPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newEmoji] = useState(oldAsset?.emoji ?? '📦')

  if (!oldAsset) {
    return <div className="py-10 text-center" style={{ color: 'var(--color-muted)' }}>资产不存在</div>
  }

  const tradeVal = Number.parseFloat(tradeInPrice) || 0
  const newP = Number.parseFloat(newPrice) || 0
  const showCalc = tradeVal > 0 || newP > 0
  const actualSpend = newP - tradeVal
  const oldHoldingDays = oldAsset.purchaseDate
    ? Math.max(1, Math.floor((Date.now() - new Date(oldAsset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1
  const oldDailyCost = oldAsset.purchasePrice
    ? (oldAsset.purchasePrice / oldHoldingDays).toFixed(2)
    : '—'
  const newDailyCost = actualSpend > 0
    ? (actualSpend / oldHoldingDays).toFixed(2)
    : '—'

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
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-body)' }}
        >
          {oldAsset.name}
        </span>
      </div>

      {/* Section: Old device */}
      <div className="mb-1 mt-5 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
        <span>旧设备回收</span>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
      </div>
      <div
        className="rounded-lg p-4"
        style={{ background: 'var(--color-surface-soft)' }}
      >
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          回收价 *
        </label>
        <input
          className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="number"
          placeholder="0.00"
          value={tradeInPrice}
          onChange={e => setTradeInPrice(e.target.value)}
        />

        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          换新日 *
        </label>
        <input
          className="h-11 w-full rounded-[10px] border px-3 pr-9 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="date"
          defaultValue="2026-05-20"
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
          {newEmoji}
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
      />

      {/* Category */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        分类 *
      </label>
      <div className="relative mb-3">
        <select
          className="h-11 w-full cursor-pointer appearance-none rounded-[10px] border px-3 pr-9 text-[15px] outline-none"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          defaultValue={oldAsset.categoryId}
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.emoji}
              {' '}
              {c.name}
            </option>
          ))}
        </select>
        <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
      </div>

      {/* New price */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        购入价 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="number"
        placeholder="0.00"
        value={newPrice}
        onChange={e => setNewPrice(e.target.value)}
      />

      {/* Current value */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        当前估价
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="number"
        placeholder="可选，留空默认等于购入价"
      />

      {/* Purchase date */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        购入日期 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="date"
        defaultValue="2026-05-20"
      />

      {/* Calculation panel */}
      {showCalc && (
        <div
          className="mb-6 rounded-lg p-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <div className="mb-2 flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--color-muted)' }}>新资产购入价</span>
            <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{newP.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="mb-2 flex items-center justify-between text-[14px]">
            <span style={{ color: 'var(--color-muted)' }}>以旧换新优惠</span>
            <span className="font-medium" style={{ color: 'var(--color-error)' }}>
              −
              {tradeVal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div
            className="my-2 h-px"
            style={{ background: 'var(--color-hairline)' }}
          />
          <div className="mb-3 flex items-center justify-between text-[14px]">
            <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>实际支出</span>
            <span className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
              {actualSpend.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span style={{ color: 'var(--color-muted)' }}>旧资产每日成本（历史）</span>
            <span className="font-mono" style={{ color: 'var(--color-muted-soft)' }}>
              {oldDailyCost}
              /天
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span style={{ color: 'var(--color-muted)' }}>新资产每日成本（预计）</span>
            <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
              {newDailyCost}
              /天
            </span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => navigate('/assets')}
        className="sticky bottom-4 mb-6 flex h-11 w-full items-center justify-center rounded-[10px] text-[15px] font-semibold text-white transition-colors"
        style={{ background: 'var(--color-primary)' }}
      >
        完成换新
      </button>
    </div>
  )
}
