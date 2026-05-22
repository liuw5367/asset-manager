import type { Route } from './+types/assets.$id'
import { IconCalendarOff, IconLoader2, IconPencil, IconTrash } from '@tabler/icons-react'
import { addMonths, addYears, format, isAfter } from 'date-fns'
import { useState } from 'react'
import { redirect, useLoaderData, useNavigate, useNavigation, useSubmit } from 'react-router'
import { SubPageHeader } from '~/components/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { DatePicker } from '~/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
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
  upsertWarranty,
} from '~/db/queries/assets'
import { calcOneTimeDailyCost, calcSubscriptionDailyCost } from '~/lib/cost'

import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const userId = user.id
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const assetId = params.id

  if (intent === 'delete') {
    const { softDeleteAsset } = await import('~/db/queries/assets')
    await softDeleteAsset(assetId, user.id)
    return redirect('/assets', { headers })
  }

  if (intent === 'stop-subscription') {
    const { stopSubscription } = await import('~/db/queries/assets')
    const stoppedAt = formData.get('stoppedAt') as string
    await stopSubscription(assetId, user.id, stoppedAt)
    return { ok: true }
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

  if (intent === 'upsert-warranty') {
    const startDate = String(formData.get('startDate') || '')
    const endDate = String(formData.get('endDate') || '')
    const notes = String(formData.get('notes') || '')

    if (!startDate || !endDate)
      return { ok: false, error: '保修开始和结束日期不能为空' }

    await upsertWarranty({
      assetId,
      startDate,
      endDate,
      notes: notes || undefined,
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
  const [todayDate] = useState(() => new Date().toISOString().split('T')[0])
  const [repairDate, setRepairDate] = useState(() => new Date().toISOString().split('T')[0])
  const [repairCost, setRepairCost] = useState('')
  const [repairReason, setRepairReason] = useState('')
  const [repairVendor, setRepairVendor] = useState('')
  const [repairResult, setRepairResult] = useState('')
  const [repairIsDone, setRepairIsDone] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false)
  const [warrantyStartDate, setWarrantyStartDate] = useState(warranty?.startDate || todayDate)
  const [warrantyEndDate, setWarrantyEndDate] = useState(warranty?.endDate || todayDate)
  const [warrantyNotes, setWarrantyNotes] = useState(warranty?.notes || '')

  // 提醒设置
  const [subReminder, setSubReminder] = useState('跟随全局（7天）')
  const [warrantyReminder, setWarrantyReminder] = useState('跟随全局（14天）')

  // 停止订阅
  const [stopSubDialogOpen, setStopSubDialogOpen] = useState(false)
  const [stopSubDate, setStopSubDate] = useState(todayDate)

  // 计算下次续费日期（D-05）
  function calcNextRenewalDate(): string | null {
    if (asset.assetType !== 'subscription' || !asset.subscriptionStartDate || !asset.billingCycle)
      return null
    const start = new Date(asset.subscriptionStartDate)
    const today = new Date()
    let next = new Date(start)
    if (asset.billingCycle === 'monthly') {
      while (!isAfter(next, today))
        next = addMonths(next, 1)
    }
    else if (asset.billingCycle === 'quarterly') {
      while (!isAfter(next, today))
        next = addMonths(next, 3)
    }
    else {
      while (!isAfter(next, today))
        next = addYears(next, 1)
    }
    return format(next, 'yyyy-MM-dd')
  }
  const nextRenewalDate = calcNextRenewalDate()

  function handleStopSubscription() {
    const fd = new FormData()
    fd.append('intent', 'stop-subscription')
    fd.append('stoppedAt', stopSubDate)
    submit(fd, { method: 'post' })
    setStopSubDialogOpen(false)
  }

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
    setRepairDate(todayDate)
    setRepairCost('')
    setRepairReason('')
    setRepairVendor('')
    setRepairResult('')
    setRepairIsDone(true)
  }

  function handleSaveWarranty() {
    const fd = new FormData()
    fd.append('intent', 'upsert-warranty')
    fd.append('startDate', warrantyStartDate)
    fd.append('endDate', warrantyEndDate)
    fd.append('notes', warrantyNotes)
    submit(fd, { method: 'post' })
    setWarrantyDialogOpen(false)
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

  const isWarrantyActive = warranty ? warranty.endDate >= todayDate : false

  return (
    <div>
      {/* Top bar */}
      <SubPageHeader
        backTo="/assets"
        backLabel="资产"
        title={asset.name}
        primaryAction={{
          label: '编辑',
          icon: IconPencil,
          to: `/assets/${asset.id}/edit`,
        }}
        moreItems={[
          ...(asset.assetType === 'one_time'
            ? [{
                label: '以旧换新',
                onClick: () => navigate(`/assets/${asset.id}/trade-in`),
              }]
            : []),
          ...(asset.assetType === 'subscription' && asset.subscriptionStatus === 'active'
            ? [{
                label: '停止订阅',
                icon: IconCalendarOff,
                onClick: () => setStopSubDialogOpen(true),
              }]
            : []),
          {
            label: '删除资产',
            icon: IconTrash,
            variant: 'destructive' as const,
            onClick: () => setDeleteDialogOpen(true),
          },
        ].filter(Boolean) as { label: string, icon?: typeof IconTrash, variant?: 'default' | 'destructive', onClick: () => void }[]}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <AlertDialogCancel
              variant="outline"
              className="h-10 border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[14px] text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={handleDelete}
              className="h-10 !bg-[var(--color-error)] px-4 text-[14px] !text-white hover:!bg-[var(--color-error)]/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Merged Info Card */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-soft)' }}>
        {/* One-time fields */}
        {asset.assetType === 'one_time' && (
          <>
            {asset.purchasePrice && (
              <DetailRow label="购入价" value={Number(asset.purchasePrice).toLocaleString()} />
            )}
            {asset.currentValue && (
              <DetailRow label="当前估价" value={Number(asset.currentValue).toLocaleString()} muted />
            )}
            <DetailRow label="每日成本" value={`${dailyCost.toFixed(2)}/天`} primary />
            {holdingDays > 0 && (
              <DetailRow label="持有天数" value={`${holdingDays} 天`} />
            )}
            {(paymentType || paymentAccount) && (
              <DetailRow
                label="支付方式"
                value={
                  paymentAccount && paymentType
                    ? `${paymentAccount.name} · ${paymentType.name}`
                    : paymentType?.name || '—'
                }
              />
            )}
            {asset.purchaseDate && (
              <DetailRow label="购入日期" value={asset.purchaseDate} />
            )}
          </>
        )}

        {/* Subscription fields */}
        {asset.assetType === 'subscription' && (
          <>
            <DetailRow
              label="订阅周期"
              value={
                asset.billingCycle === 'monthly'
                  ? '月付'
                  : asset.billingCycle === 'quarterly' ? '季付' : '年付'
              }
            />
            {asset.subscriptionPrice && (
              <DetailRow
                label="订阅金额"
                value={`${asset.subscriptionPrice}/${
                  asset.billingCycle === 'monthly'
                    ? '月'
                    : asset.billingCycle === 'quarterly' ? '季' : '年'
                }`}
              />
            )}
            <DetailRow label="每日成本" value={`${dailyCost.toFixed(2)}/天`} primary />
            {nextRenewalDate && (
              <DetailRow label="下次续费" value={nextRenewalDate} />
            )}
            <DetailRow
              label="状态"
              value={(
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                  style={{
                    background: asset.subscriptionStatus === 'active' ? 'var(--color-success)' : 'var(--color-muted)',
                    color: '#fff',
                  }}
                >
                  {asset.subscriptionStatus === 'active' ? '活跃' : asset.subscriptionStatus === 'cancelled' ? '已取消' : '已过期'}
                </span>
              )}
            />
          </>
        )}

        {/* Common fields */}
        <DetailRow
          label="分类"
          value={category ? `${category.emoji} ${category.name}` : '—'}
        />
        {assetTags.length > 0 && (
          <DetailRow
            label="标签"
            value={(
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
            )}
          />
        )}
        {asset.notes && (
          <DetailRow label="备注" value={asset.notes} muted />
        )}
      </div>

      {/* Subscription stopped card */}
      {asset.assetType === 'subscription' && asset.subscriptionStatus === 'cancelled' && asset.subscriptionStoppedAt && (
        <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--color-primary-muted)' }}>
          <div className="flex items-center gap-2">
            <IconCalendarOff size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="text-[14px] font-medium" style={{ color: 'var(--color-primary)' }}>订阅已停止</span>
          </div>
          <div className="mt-2 text-[13px]" style={{ color: 'var(--color-body)' }}>
            停止日期：
            {asset.subscriptionStoppedAt}
          </div>
        </div>
      )}

      {/* Warranty */}
      <Section
        title="保修"
        action={(
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-1 text-[14px] font-medium"
            style={{ color: 'var(--color-primary)' }}
            onClick={() => {
              setWarrantyStartDate(warranty?.startDate || todayDate)
              setWarrantyEndDate(warranty?.endDate || todayDate)
              setWarrantyNotes(warranty?.notes || '')
              setWarrantyDialogOpen(true)
            }}
          >
            编辑保修
          </Button>
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
                          background: isWarrantyActive ? 'var(--color-success)' : 'var(--color-error)',
                          color: '#fff',
                        }}
                      >
                        {isWarrantyActive ? '活跃' : '已过期'}
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

      {/* Repair Records */}
      <Section
        title="维修记录"
        action={(
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={<Button type="button" variant="ghost" size="sm" className="h-8 px-1 text-[14px] font-medium" style={{ color: 'var(--color-primary)' }} />}>
              + 添加维修
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>添加维修记录</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 px-4 pb-6">
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>维修日期 *</Label>
                  <DatePicker
                    value={repairDate}
                    onChange={setRepairDate}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>维修费用</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={repairCost}
                    onChange={e => setRepairCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>维修原因</Label>
                  <Input
                    type="text"
                    value={repairReason}
                    onChange={e => setRepairReason(e.target.value)}
                    placeholder="例：屏幕进灰清理"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>维修商</Label>
                  <Input
                    type="text"
                    value={repairVendor}
                    onChange={e => setRepairVendor(e.target.value)}
                    placeholder="例：Apple Store"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>维修结果</Label>
                  <Input
                    type="text"
                    value={repairResult}
                    onChange={e => setRepairResult(e.target.value)}
                    placeholder="例：已完成"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>状态</Label>
                  <div className="flex h-11 items-center justify-between rounded-[10px] border border-solid border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3">
                    <span className="text-[14px]" style={{ color: 'var(--color-ink)' }}>已完成</span>
                    <Switch
                      checked={repairIsDone}
                      onCheckedChange={setRepairIsDone}
                      aria-label="已完成"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddRepair}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] !bg-[var(--color-primary)] text-[15px] font-semibold !text-white hover:!bg-[var(--color-primary-active)]"
                >
                  {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
                  添加维修记录
                </Button>
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

      {/* Reminder Settings - at bottom */}
      <Section title="到期提醒设置">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-card)' }}>
          <DetailRow
            label="订阅到期提醒"
            value={(
              <Select value={subReminder} onValueChange={v => v && setSubReminder(v)}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="跟随全局（7天）">跟随全局（7天）</SelectItem>
                  <SelectItem value="1天前">1天前</SelectItem>
                  <SelectItem value="3天前">3天前</SelectItem>
                  <SelectItem value="7天前">7天前</SelectItem>
                  <SelectItem value="14天前">14天前</SelectItem>
                  <SelectItem value="关闭">关闭</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <DetailRow
            label="保修到期提醒"
            value={(
              <Select value={warrantyReminder} onValueChange={v => v && setWarrantyReminder(v)}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="跟随全局（14天）">跟随全局（14天）</SelectItem>
                  <SelectItem value="1天前">1天前</SelectItem>
                  <SelectItem value="3天前">3天前</SelectItem>
                  <SelectItem value="7天前">7天前</SelectItem>
                  <SelectItem value="14天前">14天前</SelectItem>
                  <SelectItem value="关闭">关闭</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </Section>

      <Dialog open={warrantyDialogOpen} onOpenChange={setWarrantyDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>编辑保修</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>保修开始日期 *</Label>
              <DatePicker value={warrantyStartDate} onChange={setWarrantyStartDate} />
            </div>
            <div>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>保修结束日期 *</Label>
              <DatePicker value={warrantyEndDate} onChange={setWarrantyEndDate} />
            </div>
            <div>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>备注</Label>
              <Textarea
                value={warrantyNotes}
                onChange={e => setWarrantyNotes(e.target.value)}
                placeholder="可选备注..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[14px] text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]"
              onClick={() => setWarrantyDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="h-10 !bg-[var(--color-primary)] px-4 text-[14px] !text-white hover:!bg-[var(--color-primary-active)]"
              onClick={handleSaveWarranty}
              disabled={isSubmitting}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Subscription Dialog */}
      <Dialog open={stopSubDialogOpen} onOpenChange={setStopSubDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>停止订阅</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px]" style={{ color: 'var(--color-body)' }}>
              选择停止订阅的日期。停止后将不再计算每日成本。
            </p>
            <div>
              <Label className="mb-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>停止日期 *</Label>
              <DatePicker value={stopSubDate} onChange={setStopSubDate} />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[14px] text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]"
              onClick={() => setStopSubDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="h-10 !bg-[var(--color-primary)] px-4 text-[14px] !text-white hover:!bg-[var(--color-primary-active)]"
              onClick={handleStopSubscription}
              disabled={isSubmitting}
            >
              {isSubmitting && <IconLoader2 size={16} className="animate-spin" />}
              确认停止
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <div className="my-4 flex items-center justify-between">
        <h3
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-muted-soft)' }}
        >
          {title}
        </h3>
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
