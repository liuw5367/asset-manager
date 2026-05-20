import { IconChevronDown, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { assets, categories } from '~/data/mock'

const typeFilters = ['全部', '买断', '订阅'] as const
type TypeFilter = typeof typeFilters[number]

export default function AssetsIndex() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<TypeFilter>('全部')

  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchesType
      = activeType === '全部'
        || (activeType === '买断' && a.assetType === 'one_time')
        || (activeType === '订阅' && a.assetType === 'subscription')
    return matchesSearch && matchesType
  })

  function getCategoryName(categoryId: string) {
    return categories.find(c => c.id === categoryId)?.name ?? ''
  }

  return (
    <div className="pt-6 pb-8">
      {/* Page Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1
          className="font-[family-name:var(--font-display)] text-[28px] font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          资产
        </h1>
        <Link
          to="/assets/new"
          className="rounded-lg px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          + 新建资产
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2.5"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <IconSearch size={16} style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索资产名称..."
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--color-muted-soft)]"
            style={{ color: 'var(--color-ink)' }}
          />
        </div>
      </div>

      {/* Type Chips */}
      <div className="mb-4 flex gap-2">
        {typeFilters.map(f => (
          <button
            key={f}
            onClick={() => setActiveType(f)}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
            style={{
              background: activeType === f ? 'var(--color-primary)' : 'var(--color-surface-strong)',
              color: activeType === f ? '#fff' : 'var(--color-body)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2">
        {['分类', '标签', '排序'].map(label => (
          <button
            key={label}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
            style={{ background: 'var(--color-surface-card)', color: 'var(--color-body)' }}
          >
            {label}
            <IconChevronDown size={14} style={{ color: 'var(--color-muted)' }} />
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: 'var(--color-surface-card)' }}
      >
        {filteredAssets.map((asset, i) => (
          <button
            key={asset.id}
            onClick={() => navigate(`/assets/${asset.id}`)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80 ${
              i < filteredAssets.length - 1 ? 'border-b' : ''
            }`}
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            {/* Emoji */}
            <span
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-[18px]"
              style={{ background: 'var(--color-surface-strong)' }}
            >
              {asset.emoji}
            </span>

            {/* Name + Badges */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                {asset.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px]"
                  style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}
                >
                  {getCategoryName(asset.categoryId)}
                </span>
                {asset.assetType === 'subscription' && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px]"
                    style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}
                  >
                    订阅
                  </span>
                )}
              </div>
            </div>

            {/* Price + Daily Cost */}
            <div className="shrink-0 text-right">
              <div className="text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                {(asset.purchasePrice ?? asset.subscriptionPrice ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-muted-soft)' }}>
                {asset.dailyCost > 0 ? `${asset.dailyCost.toFixed(2)}/天` : '—'}
              </div>
            </div>
          </button>
        ))}

        {filteredAssets.length === 0 && (
          <div className="px-4 py-10 text-center text-[14px]" style={{ color: 'var(--color-muted)' }}>
            没有找到匹配的资产
          </div>
        )}
      </div>
    </div>
  )
}
