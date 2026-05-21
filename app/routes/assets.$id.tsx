import type { Route } from './+types/assets.$id'
import { IconChevronLeft, IconDots, IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, redirect, useLoaderData, useNavigate, useNavigation, useSubmit } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import {
  createRepairRecord,
  getAssetById,
  getAssetRepairRecords,
  getAssetWarranty,
  getAssetWithTags,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
} from '~/db/queries/assets'
import { calcOneTimeDailyCost, calcSubscriptionDailyCost } from '~/lib/cost'

import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session)
    throw redirect('/login')

  const userId = session.user.id
  const assetId = params.id

  const asset = await getAssetById(assetId, userId)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  const [tagIds, warranty, repairRecords, allCategories, allTags, paymentTypes, paymentAccounts] = await Promise.all([
    getAssetWithTags(assetId),
    getAssetWarranty(assetId),
    getAssetRepairRecords(assetId),
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
  ])

  // 计算每日成本
  let dailyCost = 0
  if (asset.assetType === 'one_time' && asset.purchasePrice && asset.purchaseDate) {
    dailyCost = calcOneTimeDailyCost(Number(asset.purchasePrice), asset.purchaseDate)
  }
  else if (asset.assetType === 'subscription' && asset.subscriptionPrice && asset.billingCycle) {
    dailyCost = calcSubscriptionDailyCost(Number(asset.subscriptionPrice), asset.billingCycle)
  }

  // 计算持有天数
  const holdingDays = asset.purchaseDate
    ? Math.max(1, Math.floor((Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    asset,
    tagIds,
    warranty,
    repairRecords,
    dailyCost,
    holdingDays,
    allCategories,
    allTags,
    paymentTypes,
    paymentAccounts,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const assetId = params.id

  if (intent === 'delete') {
    const { softDeleteAsset } = await import('~/db/queries/assets')
    await softDeleteAsset(assetId, session.user.id)
    return redirect('/assets', { headers })
  }

  if (intent === 'add-repair') {
    await createRepairRecord({
      assetId,
      repairDate: formData.get('repairDate') as string,
      cost: (formData.get('cost') as string) || '0',
      reason: (formData.get('reason') as string) || undefined,
      vendor: (formData.get('vendor') as string) || undefined,
      result: (formData.get('result') as string) || undefined,
      isDone: formData.get('isDone') === 'true',
    })
    return { ok: true }
  }

  return { ok: false }
}

export default function AssetsDetail() {
  const {
    asset,
    tagIds,
    warranty,
    repairRecords,
    dailyCost,
    holdingDays,
    allCategories,
    allTags,
    paymentTypes,
    paymentAccounts,
  } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const submit = useSubmit()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const category = allCategories.find(c => c.id === asset.categoryId)
  const assetTags = allTags.filter(t => tagIds.includes(t.id))
  const paymentType = asset.paymentTypeId ? paymentTypes.find(p => p.id === asset.paymentTypeId) : null
  const paymentAccount = asset.paymentAccountId ? paymentAccounts.find(a => a.id === asset.paymentAccountId) : null

  // 维修表单状态
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split('T')[0])
  const [repairCost, setRepairCost] = useState('')
  const [repairReason, setRepairReason] = useState('')
  const [repairVendor, setRepairVendor] = useState('')
  const [repairResult, setRepairResult] = useState('')
  const [repairIsDone, setRepairIsDone] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

  // 提醒设置
  const [subReminder, setSubReminder] = useState('跟随全局（7天）')
  const [warrantyReminder, setWarrantyReminder] = useState('跟随全局（14天）')

  function handleDelete() {
    const fd = new FormData()
    fd.append('intent', 'delete')
    submit(fd, { method: 'post' })
  }

  function handleAddRepair() {
    const fd = new FormData()
    fd.append('intent', 'add-repair')
    fd.append('repairDate', repairDate)
    fd.append('cost', repairCost || '0')
    fd.append('reason', repairReason)
    fd.append('vendor', repairVendor)
    fd.append('result', repairResult)
    fd.append('isDone', String(repairIsDone))
    submit(fd, { method: 'post' })
    setSheetOpen(false)
    // 重置表单
    setRepairDate(new Date().toISOString().split('T')[0])
    setRepairCost('')
    setRepairReason('')
    setRepairVendor('')
    setRepairResult('')
    setRepairIsDone(true)
  }

  const bgColors: Record<string, string> = {}
  allCategories.forEach((c) => {
    bgColors[c.id] = c.emoji === '📷'
      ? '#e6f4f1'
      : c.emoji === '🎮'
        ? '#e8f5e9'
        : c.emoji === '📚'
          ? '#fef6e4'
          : c.emoji === '🔄'
            ? '#e8f5e9'
            : c.emoji === '🏠'
              ? '#f0e4dc'
              : 'var(--color-primary-muted)'
  })

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between py-3" style={{ minHeight: 48 }}>
        <Link
          to="/assets"
          className="flex items-center gap-1 text-[14px] font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconChevronLeft size={18} />
          资产
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={`/assets/${asset.id}/edit`}
            className="text-[14px] font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            编辑
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-[16px] tracking-wider" style={{ color: 'var(--color-muted)' }}>
              <IconDots size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}/trade-in`)}>
                以旧换新
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger
                  className="w-full rounded-md px-3 py-2 text-left text-[14px] transition-colors hover:bg-[var(--color-surface-soft)]"
                  style={{ color: 'var(--color-error)' }}
                >
                  删除资产
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除「
                      {asset.name}
                      」吗？删除后可在回收站中恢复。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero section */}
      <div className="flex flex-col items-center py-4 text-center">
        <div
          className="mb-2 flex h-[60px] w-[60px] items-center justify-center rounded-xl text-[30px]"
          style={{ background: bgColors[asset.categoryId || ''] || 'var(--color-primary-muted)' }}
        >
          {asset.emoji}
        </div>
        <div className="mb-2 text-[20px] font-semibold" style={{ color: 'var(--color-ink)' }}>
          {asset.name}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {category && (
            <Badge
              className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}
            >
              {category.name}
            </Badge>
          )}
          <Badge
            className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
            style={{
              background: asset.assetType === 'subscription' ? 'var(--color-info)' : 'var(--color-surface-strong)',
              color: asset.assetType === 'subscription' ? '#fff' : 'var(--color-muted)',
            }}
          >
            {asset.assetType === 'subscription' ? '订阅' : '买断'}
          </Badge>
          {assetTags.map(tag => (
            <Badge
              key={tag.id}
              className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{ background: `${tag.color}22`, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <Section title="财务摘要">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          <DetailRow label="购入价" value={asset.purchasePrice ? Number(asset.purchasePrice).toLocaleString() : '—'} />
          <DetailRow label="当前估价" value={asset.currentValue ? Number(asset.currentValue).toLocaleString() : '—'} muted />
          <DetailRow label="每日成本" value={`${dailyCost.toFixed(2)}/天`} primary />
          <DetailRow label="持有天数" value={`${holdingDays} 天`} />
          <DetailRow
            label="支付方式"
            value={
              paymentAccount && paymentType
                ? `${paymentAccount.name} · ${paymentType.name}`
                : paymentType?.name || '—'
            }
          />
          <DetailRow label="购入日期" value={asset.purchaseDate || '—'} />
        </div>
      </Section>

      {/* Subscription detail */}
      {asset.assetType === 'subscription' && (
        <Section title="订阅信息">
          <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
            <DetailRow
              label="订阅周期"
              value={
                asset.billingCycle === 'monthly'
                  ? '月付'
                  : asset.billingCycle === 'quarterly' ? '季付' : '年付'
              }
            />
            <DetailRow
              label="订阅金额"
              value={`${asset.subscriptionPrice}/${
                asset.billingCycle === 'monthly'
                  ? '月'
                  : asset.billingCycle === 'quarterly' ? '季' : '年'
              }`}
            />
            <DetailRow label="每日成本" value={`${dailyCost.toFixed(2)}/天`} primary />
            <DetailRow label="下次续费" value={asset.nextRenewalDate || '—'} />
            <DetailRow
              label="状态"
              value={(
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                  style={{ background: 'var(--color-success)', color: '#fff' }}
                >
                  {asset.subscriptionStatus === 'active' ? '活跃' : asset.subscriptionStatus === 'cancelled' ? '已取消' : '已过期'}
                </span>
              )}
            />
          </div>
        </Section>
      )}

      {/* Basic Info */}
      <Section title="基础信息">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          <DetailRow
            label="分类"
            value={category ? `${category.emoji} ${category.name}` : '—'}
          />
          <DetailRow
            label="标签"
            value={
              assetTags.length > 0
                ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assetTags.map(tag => (
                        <Badge
                          key={tag.id}
                          className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                          style={{ background: `${tag.color}22`, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )
                : '—'
            }
          />
          <DetailRow label="备注" value={asset.notes || '—'} muted={!asset.notes} />
        </div>
      </Section>

      {/* Warranty */}
      <Section
        title="保修"
        action={(
          <button className="text-[14px] font-medium" style={{ color: 'var(--color-primary)' }}>
            编辑保修
          </button>
        )}
      >
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          {warranty
            ? (
                <>
                  <DetailRow label="保修期" value={`${warranty.startDate} → ${warranty.endDate}`} />
                  <DetailRow
                    label="状态"
                    value={(
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                        style={{
                          background: new Date(warranty.endDate) >= new Date() ? 'var(--color-success)' : 'var(--color-error)',
                          color: '#fff',
                        }}
                      >
                        {new Date(warranty.endDate) >= new Date() ? '活跃' : '已过期'}
                      </span>
                    )}
                  />
                  <DetailRow label="备注" value={warranty.notes || '—'} />
                </>
              )
            : (
                <div className="py-2 text-center text-[14px]" style={{ color: 'var(--color-muted)' }}>
                  暂无保修信息
                </div>
              )}
        </div>
      </Section>

      {/* Reminder Settings */}
      <Section title="到期提醒设置">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          <DetailRow
            label="订阅到期提醒"
            value={(
              <select
                value={subReminder}
                onChange={e => setSubReminder(e.target.value)}
                className="h-8 rounded-lg border px-3 text-[12px] outline-none"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              >
                <option>跟随全局（7天）</option>
                <option>1天前</option>
                <option>3天前</option>
                <option>7天前</option>
                <option>14天前</option>
                <option>关闭</option>
              </select>
            )}
          />
          <DetailRow
            label="保修到期提醒"
            value={(
              <select
                value={warrantyReminder}
                onChange={e => setWarrantyReminder(e.target.value)}
                className="h-8 rounded-lg border px-3 text-[12px] outline-none"
                style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              >
                <option>跟随全局（14天）</option>
                <option>1天前</option>
                <option>3天前</option>
                <option>7天前</option>
                <option>14天前</option>
                <option>关闭</option>
              </select>
            )}
          />
        </div>
      </Section>

      {/* Repair Records */}
      <Section
        title="维修记录"
        action={(
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="text-[14px] font-medium" style={{ color: 'var(--color-primary)' }}>
              + 添加维修
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>添加维修记录</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 px-4 pb-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>维修日期 *</label>
                  <input
                    type="date"
                    value={repairDate}
                    onChange={e => setRepairDate(e.target.value)}
                    className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>维修费用</label>
                  <input
                    type="number"
                    step="0.01"
                    value={repairCost}
                    onChange={e => setRepairCost(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>维修原因</label>
                  <input
                    type="text"
                    value={repairReason}
                    onChange={e => setRepairReason(e.target.value)}
                    placeholder="例：屏幕进灰清理"
                    className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>维修商</label>
                  <input
                    type="text"
                    value={repairVendor}
                    onChange={e => setRepairVendor(e.target.value)}
                    placeholder="例：Apple Store"
                    className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>维修结果</label>
                  <input
                    type="text"
                    value={repairResult}
                    onChange={e => setRepairResult(e.target.value)}
                    placeholder="例：已完成"
                    className="h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDone"
                    checked={repairIsDone}
                    onChange={e => setRepairIsDone(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <label htmlFor="isDone" className="text-[14px]" style={{ color: 'var(--color-ink)' }}>已完成</label>
                </div>
                <button
                  onClick={handleAddRepair}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
                  添加维修记录
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      >
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          {repairRecords.length === 0
            ? (
                <div className="py-2 text-center text-[14px]" style={{ color: 'var(--color-muted)' }}>
                  暂无维修记录
                </div>
              )
            : (
                repairRecords.map((record, index) => (
                  <div key={record.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: record.isDone ? 'var(--color-success)' : 'var(--color-warning)' }}
                      />
                      {index < repairRecords.length - 1 && (
                        <div className="w-px flex-1" style={{ background: 'var(--color-hairline)' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-[12px] font-medium" style={{ color: 'var(--color-muted)' }}>
                        {record.repairDate}
                      </div>
                      <div className="text-[14px]" style={{ color: 'var(--color-ink)' }}>
                        {record.reason || '—'}
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
                        {record.vendor || '—'}
                        {' · '}
                        {Number(record.cost) > 0 ? Number(record.cost) : '0（保修内）'}
                        {' · '}
                        <span style={{ color: 'var(--color-success)' }}>{record.result || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="my-4 flex items-center gap-3" style={{ color: 'var(--color-ink)' }}>
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
        {action}
      </div>
      {children}
    </div>
  )
}

function DetailRow({
  label,
  value,
  muted,
  primary,
}: {
  label: string
  value: React.ReactNode
  muted?: boolean
  primary?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid var(--color-hairline)' }}
    >
      <span className="text-[13px]" style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span
        className="text-[14px] font-medium"
        style={{
          color: primary ? 'var(--color-primary)' : muted ? 'var(--color-muted-soft)' : 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
