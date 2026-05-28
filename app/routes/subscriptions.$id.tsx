import type { Route } from './+types/subscriptions.$id'
import { IconBell, IconCheck, IconLoader2, IconPencil, IconPlayerPlay, IconPlayerStop, IconTrash, IconX } from '@tabler/icons-react'
import { addMonths, addYears, format, isAfter } from 'date-fns'
import { useMemo, useState } from 'react'
import { data, redirect, useLoaderData, useNavigate, useNavigation, useSubmit } from 'react-router'
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
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import {
  getAssetById,
  getAssetWithTags,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  resumeSubscription,
  softDeleteAsset,
  stopSubscription,
  updateSubscriptionReminder,
} from '~/db/queries/assets'
import { getSettingsProfileByUserId } from '~/db/queries/settings'
import { calculateAssetDurationDays, formatDaysWithYears, formatInteger, formatNumber, getBillingCycleLabel } from '~/lib/asset-meta'
import { calcSubscriptionDailyCost } from '~/lib/cost'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const asset = await getAssetById(params.id, user.id)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  if (asset.assetType !== 'subscription')
    throw redirect(`/assets/${asset.id}`)

  const [tagIds, allCategories, allTags, paymentTypes, paymentAccounts, profile] = await Promise.all([
    getAssetWithTags(asset.id),
    getCategoriesByUserId(user.id),
    getTagsByUserId(user.id),
    getPaymentTypesByUserId(user.id),
    getPaymentAccountsByUserId(user.id),
    getSettingsProfileByUserId(user.id),
  ])

  const ended = asset.subscriptionStatus === 'cancelled' || Boolean(asset.subscriptionStoppedAt)
  const holdingDays = calculateAssetDurationDays({
    assetType: 'subscription',
    purchaseDate: asset.purchaseDate,
    subscriptionStartDate: asset.subscriptionStartDate,
    subscriptionStoppedAt: asset.subscriptionStoppedAt,
    ended,
  })
  const dailyCost = asset.subscriptionPrice && asset.billingCycle
    ? calcSubscriptionDailyCost(Number(asset.subscriptionPrice), asset.billingCycle)
    : 0

  return data({
    asset,
    tagIds,
    allCategories,
    allTags,
    paymentTypes,
    paymentAccounts,
    holdingDays,
    dailyCost,
    globalReminderSubscriptionDays: profile?.reminderSubscriptionDays ?? 7,
  }, { headers })
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'cancel') {
    const stoppedAt = String(formData.get('stoppedAt') || '')
    await stopSubscription(params.id, user.id, stoppedAt)
    return data({ ok: true }, { headers })
  }

  if (intent === 'resume') {
    await resumeSubscription(params.id, user.id)
    return data({ ok: true }, { headers })
  }

  if (intent === 'delete') {
    await softDeleteAsset(params.id, user.id)
    return redirect('/assets', { headers })
  }

  if (intent === 'update_reminder') {
    const reminderEnabled = formData.get('reminderEnabled') === 'true'
    const daysRaw = formData.get('reminderSubscriptionDaysOverride')
    const reminderSubscriptionDaysOverride = daysRaw && daysRaw !== 'null' ? Number(daysRaw) : null

    await updateSubscriptionReminder(params.id, user.id, { reminderEnabled, reminderSubscriptionDaysOverride })

    return data({ ok: true }, { headers })
  }

  return data({ ok: false }, { headers })
}

function calcNextRenewalDate(startDate?: string | null, cycle?: 'monthly' | 'quarterly' | 'yearly' | null) {
  if (!startDate || !cycle)
    return null
  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  let next = new Date(start)
  while (!isAfter(next, today)) {
    if (cycle === 'monthly')
      next = addMonths(next, 1)
    else if (cycle === 'quarterly')
      next = addMonths(next, 3)
    else
      next = addYears(next, 1)
  }
  return format(next, 'yyyy-MM-dd')
}

export default function SubscriptionDetailPage() {
  const {
    asset,
    tagIds,
    allCategories,
    allTags,
    paymentTypes,
    paymentAccounts,
    holdingDays,
    dailyCost,
    globalReminderSubscriptionDays,
  } = useLoaderData<typeof loader>()

  const navigate = useNavigate()
  const submit = useSubmit()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], [])

  const category = allCategories.find(c => c.id === asset.categoryId)
  const assetTags = allTags.filter(t => tagIds.includes(t.id))
  const paymentType = asset.paymentTypeId ? paymentTypes.find(p => p.id === asset.paymentTypeId) : null
  const paymentAccount = asset.paymentAccountId ? paymentAccounts.find(a => a.id === asset.paymentAccountId) : null
  const nextRenewalDate = calcNextRenewalDate(asset.subscriptionStartDate || asset.purchaseDate, asset.billingCycle)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelDate, setCancelDate] = useState(todayDate)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(asset.reminderEnabled ?? false)
  const [reminderSubscriptionDaysOverride, setReminderSubscriptionDaysOverride] = useState<number | null>(
    asset.reminderSubscriptionDaysOverride ?? null,
  )
  const reminderFollowGlobal = reminderSubscriptionDaysOverride === null

  function onCancel() {
    const fd = new FormData()
    fd.append('intent', 'cancel')
    fd.append('stoppedAt', cancelDate)
    submit(fd, { method: 'post' })
    setCancelDialogOpen(false)
  }

  function onResume() {
    const fd = new FormData()
    fd.append('intent', 'resume')
    submit(fd, { method: 'post' })
  }

  function onDelete() {
    const fd = new FormData()
    fd.append('intent', 'delete')
    submit(fd, { method: 'post' })
  }

  function handleSaveReminder() {
    const fd = new FormData()
    fd.append('intent', 'update_reminder')
    fd.append('reminderEnabled', String(reminderEnabled))
    fd.append('reminderSubscriptionDaysOverride', reminderFollowGlobal ? 'null' : String(reminderSubscriptionDaysOverride))
    submit(fd, { method: 'post' })
    setReminderDialogOpen(false)
  }

  function handleOpenReminderDialog() {
    setReminderEnabled(asset.reminderEnabled ?? false)
    setReminderSubscriptionDaysOverride(asset.reminderSubscriptionDaysOverride ?? null)
    setReminderDialogOpen(true)
  }

  const ended = asset.subscriptionStatus === 'cancelled' || Boolean(asset.subscriptionStoppedAt)

  const subscriptionCost = dailyCost * holdingDays

  const basicRows = [
    asset.billingCycle ? { label: '订阅周期', value: getBillingCycleLabel(asset.billingCycle) } : null,
    asset.subscriptionPrice ? { label: '订阅金额', value: formatInteger(asset.subscriptionPrice) } : null,
    { label: '每日成本', value: `${formatNumber(dailyCost)}/天`, primary: true },
    nextRenewalDate ? { label: '下次续费日期', value: nextRenewalDate } : null,
    paymentType ? { label: '支付类型', value: paymentType.name } : null,
    paymentAccount ? { label: '支付方式', value: paymentAccount.name } : null,
    category ? { label: '分类', value: `${category.emoji} ${category.name}` } : null,
    {
      label: '续费提醒',
      value: (
        <span className="flex items-center gap-1">
          {asset.reminderEnabled
            ? (
                <>
                  <IconBell size={14} className="text-primary" />
                  {' '}
                  {asset.reminderSubscriptionDaysOverride ?? globalReminderSubscriptionDays}
                  天前
                </>
              )
            : <span style={{ color: 'var(--color-muted-soft)' }}>已关闭</span>}
        </span>
      ),
    },
  ].filter(Boolean) as Array<{ label: string, value: React.ReactNode, primary?: boolean }>

  const statusRows = [
    {
      label: '订阅状态',
      value: (
        <Badge variant="secondary" className={ended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
          {ended ? '已取消' : '订阅中'}
        </Badge>
      ),
    },
    asset.subscriptionStartDate || asset.purchaseDate
      ? { label: '订阅日期', value: asset.subscriptionStartDate || asset.purchaseDate || '' }
      : null,
    { label: '订阅天数', value: formatDaysWithYears(holdingDays) },
    { label: '订阅花费', value: formatInteger(subscriptionCost), primary: true },
    ended && asset.subscriptionStoppedAt
      ? { label: '取消日期', value: asset.subscriptionStoppedAt }
      : null,
  ].filter(Boolean) as Array<{ label: string, value: React.ReactNode, primary?: boolean }>

  return (
    <div className="pb-8">
      <SubPageHeader
        backTo="/assets"
        backLabel="返回"
        title=""
        primaryAction={{
          label: '编辑',
          icon: IconPencil,
          to: `/subscriptions/${asset.id}/edit`,
        }}
      />

      <div className="py-3 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] text-[30px]">{asset.emoji}</div>
        <div className="text-[20px] font-semibold" style={{ color: 'var(--color-ink)' }}>{asset.name}</div>
        {assetTags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {assetTags.map(tag => (
              <Badge key={tag.id} className="rounded-full" style={{ background: `${tag.color}22`, color: tag.color }}>{tag.name}</Badge>
            ))}
          </div>
        )}
      </div>

      <SectionCard>
        {basicRows.map((row, index) => (
          <DetailRow key={row.label} label={row.label} value={row.value} primary={row.primary} isLast={index === basicRows.length - 1} />
        ))}
      </SectionCard>

      <SectionCard title="状态" className="mt-3">
        {statusRows.map((row, index) => (
          <DetailRow key={`${row.label}-${index}`} label={row.label} value={row.value} primary={row.primary} isLast={index === statusRows.length - 1} />
        ))}
      </SectionCard>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="h-10 text-[13px]" variant="default" onClick={() => navigate(`/subscriptions/${asset.id}/edit`)}>
          <IconPencil size={14} data-icon="inline-start" />
          编辑订阅
        </Button>
        <Button className="h-10 text-[13px]" variant="default" onClick={handleOpenReminderDialog}>
          <IconBell size={14} data-icon="inline-start" />
          提醒设置
        </Button>
        {ended
          ? (
              <Button className="h-10 text-[13px]" variant="default" onClick={onResume} disabled={isSubmitting}>
                {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                {!isSubmitting && <IconPlayerPlay size={14} data-icon="inline-start" />}
                恢复订阅
              </Button>
            )
          : (
              <Button className="h-10 text-[13px]" variant="default" onClick={() => setCancelDialogOpen(true)}>
                <IconPlayerStop size={14} data-icon="inline-start" />
                取消订阅
              </Button>
            )}
        <Button className="h-10 text-[13px]" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <IconTrash size={14} data-icon="inline-start" />
          删除订阅
        </Button>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消订阅</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>取消日期</FieldLabel>
              <DatePicker value={cancelDate} onChange={setCancelDate} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button className="h-10" variant="secondary" onClick={() => setCancelDialogOpen(false)}>
              <IconX size={14} data-icon="inline-start" />
              取消
            </Button>
            <Button className="h-10" variant="default" onClick={onCancel} disabled={isSubmitting}>
              {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
              {!isSubmitting && <IconCheck size={14} data-icon="inline-start" />}
              确认取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>续费提醒设置</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal" className="justify-between">
              <FieldLabel>开启提醒</FieldLabel>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </Field>
            {reminderEnabled && (
              <Field>
                <FieldLabel>提醒时间</FieldLabel>
                <Select
                  value={reminderFollowGlobal ? 'global' : String(reminderSubscriptionDaysOverride)}
                  onValueChange={(v) => {
                    if (v === 'global') {
                      setReminderSubscriptionDaysOverride(null)
                    }
                    else {
                      setReminderSubscriptionDaysOverride(Number(v))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {value => value === 'global' ? `跟随全局（${globalReminderSubscriptionDays}天）` : `${value} 天前`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      跟随全局（
                      {globalReminderSubscriptionDays}
                      天）
                    </SelectItem>
                    <SelectItem value="3">3 天前</SelectItem>
                    <SelectItem value="7">7 天前</SelectItem>
                    <SelectItem value="14">14 天前</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button className="h-10" variant="secondary" onClick={() => setReminderDialogOpen(false)}>
              <IconX size={14} data-icon="inline-start" />
              取消
            </Button>
            <Button className="h-10" variant="default" onClick={handleSaveReminder} disabled={isSubmitting}>
              {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
              {!isSubmitting && <IconCheck size={14} data-icon="inline-start" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「
              {asset.name}
              」吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10" variant="secondary">
              <IconX size={14} data-icon="inline-start" />
              取消
            </AlertDialogCancel>
            <AlertDialogAction className="h-10" variant="destructive" onClick={onDelete}>
              <IconTrash size={14} data-icon="inline-start" />
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SectionCard({
  title,
  className,
  children,
}: {
  title?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={className}>
      {title && <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</h3>}
      <div className="rounded-xl border px-4" style={{ borderColor: 'var(--color-hairline)', background: 'var(--color-surface-card)' }}>
        {children}
      </div>
    </section>
  )
}

function DetailRow({
  label,
  value,
  primary,
  isLast,
}: {
  label: string
  value: React.ReactNode
  primary?: boolean
  isLast?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 ${isLast ? '' : 'border-b'}`} style={{ borderColor: 'var(--color-hairline)' }}>
      <span className="text-[14px]" style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span className="text-[15px] font-medium" style={{ color: primary ? 'var(--color-primary)' : 'var(--color-ink)' }}>{value}</span>
    </div>
  )
}
