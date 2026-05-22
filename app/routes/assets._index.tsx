import type { Route } from './+types/assets._index'
import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import { MainPageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import {
  getAssetsWithCategoryName,
  getAssetTagsByUserId,
  getCategoriesByUserId,
  getTagsByUserId,
} from '~/db/queries/assets'
import { calcOneTimeDailyCost, calcSubscriptionDailyCost } from '~/lib/cost'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
  const [rawAssets, categories, tags, assetTagRows] = await Promise.all([
    getAssetsWithCategoryName(userId),
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getAssetTagsByUserId(userId),
  ])

  // 计算每日成本
  const assetsWithCost = rawAssets.map((a) => {
    let dailyCost = 0
    if (a.tradedInAt && a.purchasePrice && a.purchaseDate) {
      // 已换购：冻结持有成本 = (购入价 - 回收价) / 持有天数
      const holdingDays = Math.max(1, Math.floor((new Date(a.tradedInAt).getTime() - new Date(a.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
      const holdingCost = Number(a.purchasePrice) - Number(a.tradeInPrice || 0)
      dailyCost = holdingCost / holdingDays
    }
    else if (a.assetType === 'one_time' && a.purchasePrice && a.purchaseDate) {
      dailyCost = calcOneTimeDailyCost(Number(a.purchasePrice), a.purchaseDate)
    }
    else if (a.assetType === 'subscription' && a.subscriptionPrice && a.billingCycle) {
      dailyCost = calcSubscriptionDailyCost(Number(a.subscriptionPrice), a.billingCycle)
    }
    return { ...a, dailyCost }
  })

  // 构建 assetId -> tags 映射
  const assetTagMap: Record<string, Array<{ id: string, name: string, color: string }>> = {}
  for (const row of assetTagRows) {
    if (!assetTagMap[row.assetId])
      assetTagMap[row.assetId] = []
    assetTagMap[row.assetId].push({ id: row.tagId, name: row.tagName, color: row.tagColor })
  }

  return { assets: assetsWithCost, categories, tags, assetTagMap }
}

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'cost_asc' | 'cost_desc' | 'date_asc' | 'date_desc'
type TypeFilter = 'one_time' | 'subscription' | null

const sortLabels: Record<SortOption, string> = {
  default: '默认排序',
  price_asc: '价格升序',
  price_desc: '价格降序',
  cost_asc: '每日成本升序',
  cost_desc: '每日成本降序',
  date_asc: '购入日期升序',
  date_desc: '购入日期降序',
}

export default function AssetsIndex() {
  const { assets, categories, tags, assetTagMap } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<TypeFilter>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('default')

  // Sheet 状态
  const [sheetType, setSheetType] = useState<'category' | 'tag' | 'sort' | null>(null)

  // 筛选 + 排序
  let filteredAssets = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = !activeType || a.assetType === activeType
    const matchesCategory = !selectedCategory || a.categoryId === selectedCategory
    const matchesTag = !selectedTag || (assetTagMap[a.id] || []).some(t => t.id === selectedTag)
    return matchesSearch && matchesType && matchesCategory && matchesTag
  })

  if (sortOption !== 'default') {
    filteredAssets = [...filteredAssets].sort((a, b) => {
      switch (sortOption) {
        case 'price_asc':
          return Number(a.purchasePrice ?? a.subscriptionPrice ?? 0) - Number(b.purchasePrice ?? b.subscriptionPrice ?? 0)
        case 'price_desc':
          return Number(b.purchasePrice ?? b.subscriptionPrice ?? 0) - Number(a.purchasePrice ?? a.subscriptionPrice ?? 0)
        case 'cost_asc':
          return a.dailyCost - b.dailyCost
        case 'cost_desc':
          return b.dailyCost - a.dailyCost
        case 'date_asc':
          return (a.purchaseDate || '').localeCompare(b.purchaseDate || '')
        case 'date_desc':
          return (b.purchaseDate || '').localeCompare(a.purchaseDate || '')
        default:
          return 0
      }
    })
  }

  const activeCategoryName = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.name
    : null
  const activeTagName = selectedTag
    ? tags.find(t => t.id === selectedTag)?.name
    : null

  return (
    <div className="pb-8 pt-6">
      {/* Page Header */}
      <MainPageHeader title="资产" action={{ label: '+ 新建资产', to: '/assets/new' }} />

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索资产名称..."
            className="rounded-full bg-[var(--color-surface-card)] pl-9"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center justify-between">
        {/* Left: Type Toggle */}
        <div className="flex gap-2">
          {(['one_time', 'subscription'] as const).map(type => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveType(prev => prev === type ? null : type)}
              className="h-8 rounded-full px-3.5 text-[13px] font-medium"
              style={{
                background: activeType === type ? 'var(--color-primary)' : 'var(--color-surface-strong)',
                color: activeType === type ? '#fff' : 'var(--color-body)',
              }}
            >
              {type === 'one_time' ? '买断' : '订阅'}
            </Button>
          ))}
        </div>

        {/* Right: Filter Buttons */}
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetType('category')}
            className="flex h-8 items-center gap-0.5 rounded-full px-2.5 text-[13px] transition-colors"
            style={{
              background: selectedCategory ? 'var(--color-primary-muted)' : 'var(--color-surface-card)',
              color: selectedCategory ? 'var(--color-primary)' : 'var(--color-body)',
            }}
          >
            {activeCategoryName || '分类'}
            {selectedCategory
              ? <IconX size={12} />
              : <IconChevronDown size={14} style={{ color: 'var(--color-muted)' }} />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetType('tag')}
            className="flex h-8 items-center gap-0.5 rounded-full px-2.5 text-[13px] transition-colors"
            style={{
              background: selectedTag ? 'var(--color-primary-muted)' : 'var(--color-surface-card)',
              color: selectedTag ? 'var(--color-primary)' : 'var(--color-body)',
            }}
          >
            {activeTagName || '标签'}
            {selectedTag
              ? <IconX size={12} />
              : <IconChevronDown size={14} style={{ color: 'var(--color-muted)' }} />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetType('sort')}
            className="flex h-8 items-center gap-0.5 rounded-full px-2.5 text-[13px] transition-colors"
            style={{
              background: sortOption !== 'default' ? 'var(--color-primary-muted)' : 'var(--color-surface-card)',
              color: sortOption !== 'default' ? 'var(--color-primary)' : 'var(--color-body)',
            }}
          >
            {sortOption !== 'default' ? sortLabels[sortOption] : '排序'}
            {sortOption !== 'default'
              ? (
                  <IconX
                    size={12}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSortOption('default')
                    }}
                  />
                )
              : <IconChevronDown size={14} style={{ color: 'var(--color-muted)' }} />}
          </Button>
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {filteredAssets.map(asset => (
          <button
            key={asset.id}
            onClick={() => navigate(`/assets/${asset.id}`)}
            className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:opacity-80"
            style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
          >
            {/* Emoji */}
            <span
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-[18px]"
              style={{ background: 'var(--color-surface-strong)' }}
            >
              {asset.emoji}
            </span>

            {/* Name + Badges */}
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                {asset.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                {asset.categoryName && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px]"
                    style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}
                  >
                    {asset.categoryName}
                  </span>
                )}
                {asset.assetType === 'subscription' && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: '#e0edff', color: '#2563eb' }}
                  >
                    订阅
                  </span>
                )}
                {asset.tradedInAt && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: '#fce8e8', color: '#dc2626' }}
                  >
                    已换购
                  </span>
                )}
                {asset.tradedFromAssetId && !asset.tradedInAt && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: '#ede9fe', color: '#7c3aed' }}
                  >
                    以旧换新
                  </span>
                )}
              </div>
            </div>

            {/* Daily Cost + Price */}
            <div className="shrink-0 text-right">
              <div className="text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                {asset.dailyCost > 0 ? `${asset.dailyCost.toFixed(2)}/天` : '—'}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-muted-soft)' }}>
                {asset.tradedInAt && asset.purchasePrice
                  ? (Number(asset.purchasePrice) - Number(asset.tradeInPrice || 0)).toLocaleString()
                  : Number(asset.purchasePrice ?? asset.subscriptionPrice ?? 0).toLocaleString()}
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

      {/* Bottom Sheets */}
      {/* 分类 */}
      <Sheet open={sheetType === 'category'} onOpenChange={open => !open && setSheetType(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>选择分类</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 px-4 pb-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedCategory(null)
                setSheetType(null)
              }}
              className="h-11 w-full justify-start rounded-lg px-4 text-left text-[14px] transition-colors"
              style={{
                background: !selectedCategory ? 'var(--color-primary-muted)' : 'transparent',
                color: !selectedCategory ? 'var(--color-primary)' : 'var(--color-ink)',
              }}
            >
              全部分类
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setSheetType(null)
                }}
                className="h-11 w-full justify-start rounded-lg px-4 text-left text-[14px] transition-colors"
                style={{
                  background: selectedCategory === cat.id ? 'var(--color-primary-muted)' : 'transparent',
                  color: selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-ink)',
                }}
              >
                {cat.emoji}
                {' '}
                {cat.name}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* 标签 */}
      <Sheet open={sheetType === 'tag'} onOpenChange={open => !open && setSheetType(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>选择标签</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 px-4 pb-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedTag(null)
                setSheetType(null)
              }}
              className="h-11 w-full justify-start rounded-lg px-4 text-left text-[14px] transition-colors"
              style={{
                background: !selectedTag ? 'var(--color-primary-muted)' : 'transparent',
                color: !selectedTag ? 'var(--color-primary)' : 'var(--color-ink)',
              }}
            >
              全部标签
            </Button>
            {tags.map(tag => (
              <Button
                key={tag.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedTag(tag.id)
                  setSheetType(null)
                }}
                className="h-11 w-full justify-start rounded-lg px-4 text-left text-[14px] transition-colors"
                style={{
                  background: selectedTag === tag.id ? 'var(--color-primary-muted)' : 'transparent',
                  color: selectedTag === tag.id ? 'var(--color-primary)' : 'var(--color-ink)',
                }}
              >
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: tag.color }}
                />
                {tag.name}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* 排序 */}
      <Sheet open={sheetType === 'sort'} onOpenChange={open => !open && setSheetType(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>排序方式</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 px-4 pb-6">
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                onClick={() => {
                  setSortOption(value)
                  setSheetType(null)
                }}
                className="h-11 w-full justify-start rounded-lg px-4 text-left text-[14px] transition-colors"
                style={{
                  background: sortOption === value ? 'var(--color-primary-muted)' : 'transparent',
                  color: sortOption === value ? 'var(--color-primary)' : 'var(--color-ink)',
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
