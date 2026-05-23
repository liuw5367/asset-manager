import type { Route } from './+types/assets._index'
import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
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
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import {
  getAssetsWithCategoryName,
  getAssetTagsByUserId,
  getCategoriesByUserId,
  getTagsByUserId,
} from '~/db/queries/assets'
import { getAssetDetailPath, subAmount } from '~/lib/asset-meta'
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

  const assetsWithCost = rawAssets.map((a) => {
    let dailyCost = 0
    if (a.tradedInAt && a.purchasePrice && a.purchaseDate) {
      const holdingDays = Math.max(1, Math.floor((new Date(a.tradedInAt).getTime() - new Date(a.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
      const holdingCost = subAmount(a.purchasePrice, a.tradeInPrice)
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

  const assetTagMap: Record<string, Array<{ id: string, name: string, color: string }>> = {}
  for (const row of assetTagRows) {
    if (!assetTagMap[row.assetId])
      assetTagMap[row.assetId] = []
    assetTagMap[row.assetId].push({ id: row.tagId, name: row.tagName, color: row.tagColor })
  }

  return { assets: assetsWithCost, categories, tags, assetTagMap }
}

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'cost_asc' | 'cost_desc' | 'date_desc' | 'date_asc'
type TypeFilter = 'one_time' | 'subscription' | 'ended' | null

const sortLabels: Record<SortOption, string> = {
  default: '近期新增',
  price_asc: '价格升序',
  price_desc: '价格降序',
  cost_asc: '每日成本升序',
  cost_desc: '每日成本降序',
  date_desc: '日期降序',
  date_asc: '日期升序',
}

function getHoldingDays(purchaseDate?: string | null, endedAt?: string | null) {
  if (!purchaseDate)
    return 0
  const end = endedAt ? new Date(endedAt) : new Date()
  return Math.max(0, Math.floor((end.getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
}

export default function AssetsIndex() {
  const { assets, categories, tags, assetTagMap } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<TypeFilter>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [sheetType, setSheetType] = useState<'tag' | 'sort' | null>(null)

  const filteredAssets = useMemo(() => {
    let results = assets.filter((a) => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase())
      const ended = a.assetType === 'subscription'
        ? a.subscriptionStatus === 'cancelled' || Boolean(a.subscriptionStoppedAt)
        : Boolean(a.tradedInAt)

      const matchesType = !activeType
        ? true
        : activeType === 'ended'
          ? ended
          : a.assetType === activeType

      const matchesCategory = !selectedCategory || a.categoryId === selectedCategory
      const matchesTag = !selectedTag || (assetTagMap[a.id] || []).some(t => t.id === selectedTag)
      return matchesSearch && matchesType && matchesCategory && matchesTag
    })

    if (sortOption !== 'default') {
      results = [...results].sort((a, b) => {
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

    return results
  }, [activeType, assetTagMap, assets, search, selectedCategory, selectedTag, sortOption])

  const activeTagName = selectedTag ? tags.find(t => t.id === selectedTag)?.name : null

  return (
    <div className="pb-8 pt-6">
      <MainPageHeader title="资产" />

      <div className="mb-4 flex items-center gap-2">
        <Button className="flex-1" onClick={() => navigate('/assets/new')}>+ 资产</Button>
        <Button className="flex-1" variant="outline" onClick={() => navigate('/subscriptions/new')}>+ 订阅</Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索名称..."
            className="rounded-full bg-[var(--color-surface-card)] pl-9"
          />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <ToggleGroup
          value={activeType ? [activeType] : []}
          onValueChange={(values: string[]) => {
            const next = values[0] as TypeFilter | undefined
            setActiveType(next || null)
          }}
          variant="outline"
          spacing={1}
        >
          <ToggleGroupItem value="one_time" className="px-3 text-[13px]">买断</ToggleGroupItem>
          <ToggleGroupItem value="subscription" className="px-3 text-[13px]">订阅</ToggleGroupItem>
          <ToggleGroupItem value="ended" className="px-3 text-[13px]">已结束</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetType('tag')}
            className="h-8 rounded-full px-3 text-[13px]"
          >
            {activeTagName || '标签'}
            {selectedTag
              ? (
                  <IconX
                    size={12}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTag(null)
                    }}
                  />
                )
              : <IconChevronDown size={14} />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetType('sort')}
            className="h-8 rounded-full px-3 text-[13px]"
          >
            {sortLabels[sortOption]}
            <IconChevronDown size={14} />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          variant={selectedCategory ? 'outline' : 'default'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="rounded-full"
        >
          全部
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.id}
            type="button"
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="rounded-full"
          >
            {cat.emoji}
            {' '}
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredAssets.map((asset) => {
          const tagsText = (assetTagMap[asset.id] || []).map(t => t.name).join('、')
          const isEnded = asset.assetType === 'subscription'
            ? asset.subscriptionStatus === 'cancelled' || Boolean(asset.subscriptionStoppedAt)
            : Boolean(asset.tradedInAt)
          const holdingDays = getHoldingDays(
            asset.purchaseDate,
            asset.assetType === 'subscription' ? asset.subscriptionStoppedAt : asset.tradedInAt,
          )

          return (
            <button
              key={asset.id}
              onClick={() => navigate(getAssetDetailPath(asset))}
              className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:opacity-85"
              style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[18px]"
                style={{ background: 'var(--color-surface-strong)' }}
              >
                {asset.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                    {asset.name}
                  </span>
                  {isEnded && (
                    <span className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.6)]" style={{ background: '#dc2626' }} />
                  )}
                </div>
                <div className="truncate text-[12px]" style={{ color: 'var(--color-muted)' }}>
                  {asset.assetType === 'subscription' ? '订阅' : '买断'}
                  {' · '}
                  {asset.categoryName || '未分类'}
                  {tagsText ? ` · ${tagsText}` : ''}
                </div>
                <div className="mt-0.5 text-[12px]" style={{ color: 'var(--color-muted-soft)' }}>
                  {(asset.purchasePrice || asset.subscriptionPrice)
                    ? Number(asset.purchasePrice || asset.subscriptionPrice).toLocaleString('zh-CN')
                    : '—'}
                  {' / '}
                  {holdingDays}
                  天
                </div>
              </div>

              <div className="shrink-0 text-right text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                {asset.dailyCost > 0 ? `${asset.dailyCost.toFixed(2)}/天` : '—'}
              </div>
            </button>
          )
        })}
      </div>

      <Sheet open={sheetType === 'tag'} onOpenChange={open => !open && setSheetType(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="pb-1">
            <SheetTitle>选择标签</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1 px-4 pb-8">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start"
              onClick={() => {
                setSelectedTag(null)
                setSheetType(null)
              }}
            >
              全部标签
            </Button>
            {tags.map(tag => (
              <Button
                key={tag.id}
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => {
                  setSelectedTag(tag.id)
                  setSheetType(null)
                }}
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: tag.color }} />
                {tag.name}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetType === 'sort'} onOpenChange={open => !open && setSheetType(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="pb-1">
            <SheetTitle>排序方式</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1 px-4 pb-8">
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start"
                onClick={() => {
                  setSortOption(value)
                  setSheetType(null)
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
