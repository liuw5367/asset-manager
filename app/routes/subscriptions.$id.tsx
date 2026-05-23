import type { Route } from './+types/subscriptions.$id'
import { IconBell, IconCheck, IconLoader2, IconPencil, IconPlayerPlay, IconPlayerStop, IconTrash, IconX } from '@tabler/icons-react'
import { addMonths, addYears, format, isAfter } from 'date-fns'
import { useMemo, useState } from 'react'
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
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
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
} from '~/db/queries/assets'
import { calculateHoldingDays, formatInteger, formatNumber, getBillingCycleLabel } from '~/lib/asset-meta'
import { calcSubscriptionDailyCost } from '~/lib/cost'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const asset = await getAssetById(params.id, user.id)
  if (!asset)
    throw new Response('Not Found', { status: 404 })

  if (asset.assetType !== 'subscription')
    throw redirect(`/assets/${asset.id}`)

  const [tagIds, allCategories, allTags, paymentTypes, paymentAccounts] = await Promise.all([
    getAssetWithTags(asset.id),
    getCategoriesByUserId(user.id),
    getTagsByUserId(user.id),
    getPaymentTypesByUserId(user.id),
    getPaymentAccountsByUserId(user.id),
  ])

  const holdingDays = calculateHoldingDays(asset.purchaseDate, asset.subscriptionStoppedAt)
  const dailyCost = asset.subscriptionPrice && asset.billingCycle
    ? calcSubscriptionDailyCost(Number(asset.subscriptionPrice), asset.billingCycle)
    : 0

  return {
    asset,
    tagIds,
    allCategories,
    allTags,
    paymentTypes,
    paymentAccounts,
    holdingDays,
    dailyCost,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'cancel') {
    const stoppedAt = String(formData.get('stoppedAt') || '')
    await stopSubscription(params.id, user.id, stoppedAt)
    return { ok: true }
  }

  if (intent === 'resume') {
    await resumeSubscription(params.id, user.id)
    return { ok: true }
  }

  if (intent === 'delete') {
    await softDeleteAsset(params.id, user.id)
    return redirect('/assets', { headers })
  }

  return { ok: false }
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
  const nextRenewalDate = calcNextRenewalDate(asset.purchaseDate || asset.subscriptionStartDate, asset.billingCycle)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelDate, setCancelDate] = useState(todayDate)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [subscriptionReminder, setSubscriptionReminder] = useState('跟随全局（7天）')

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

  const ended = asset.subscriptionStatus === 'cancelled' || Boolean(asset.subscriptionStoppedAt)

  const basicRows = [
    asset.billingCycle ? { label: '订阅周期', value: getBillingCycleLabel(asset.billingCycle) } : null,
    asset.subscriptionPrice ? { label: '订阅金额', value: formatInteger(asset.subscriptionPrice) } : null,
    { label: '每日成本', value: `${formatNumber(dailyCost)}/天`, primary: true },
    nextRenewalDate ? { label: '下次续费日期', value: nextRenewalDate } : null,
    paymentType ? { label: '支付类型', value: paymentType.name } : null,
    paymentAccount ? { label: '支付方式', value: paymentAccount.name } : null,
    category ? { label: '分类', value: `${category.emoji} ${category.name}` } : null,
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
    asset.purchaseDate || asset.subscriptionStartDate
      ? { label: '订阅日期', value: asset.purchaseDate || asset.subscriptionStartDate || '' }
      : null,
    { label: '订阅天数', value: `${holdingDays} 天` },
    ended && asset.subscriptionStoppedAt
      ? { label: '取消日期', value: asset.subscriptionStoppedAt }
      : null,
  ].filter(Boolean) as Array<{ label: string, value: React.ReactNode }>

  return (
    <div className="pb-8">
      <SubPageHeader
        backTo="/assets"
        backLabel="返回"
        title=""
        primaryAction={{
          label: '编辑',
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

      <SectionCard title="信息">
        {basicRows.map((row, index) => (
          <DetailRow key={row.label} label={row.label} value={row.value} primary={row.primary} isLast={index === basicRows.length - 1} />
        ))}
      </SectionCard>

      <SectionCard title="状态" className="mt-3">
        {statusRows.map((row, index) => (
          <DetailRow key={`${row.label}-${index}`} label={row.label} value={row.value} isLast={index === statusRows.length - 1} />
        ))}
      </SectionCard>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="h-10 bg-[var(--color-surface-strong)] text-[13px]" onClick={() => navigate(`/subscriptions/${asset.id}/edit`)}>
          <IconPencil size={14} data-icon="inline-start" />
          编辑订阅
        </Button>
        <Button className="h-10 bg-[var(--color-surface-strong)] text-[13px]" onClick={() => setReminderDialogOpen(true)}>
          <IconBell size={14} data-icon="inline-start" />
          提醒设置
        </Button>
        {ended
          ? (
              <Button className="h-10 bg-[var(--color-surface-strong)] text-[13px]" onClick={onResume} disabled={isSubmitting}>
                {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                {!isSubmitting && <IconPlayerPlay size={14} data-icon="inline-start" />}
                恢复订阅
              </Button>
            )
          : (
              <Button className="h-10 bg-[var(--color-surface-strong)] text-[13px]" onClick={() => setCancelDialogOpen(true)}>
                <IconPlayerStop size={14} data-icon="inline-start" />
                取消订阅
              </Button>
            )}
        <Button className="col-span-2 h-10 bg-[var(--color-error)] text-[13px] text-white hover:opacity-90" onClick={() => setDeleteDialogOpen(true)}>
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
            <Button className="h-10 bg-[var(--color-surface-strong)]" onClick={() => setCancelDialogOpen(false)}>
              <IconX size={14} data-icon="inline-start" />
              取消
            </Button>
            <Button className="h-10 bg-[var(--color-primary)] text-white" onClick={onCancel} disabled={isSubmitting}>
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
            <DialogTitle>提醒设置</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>订阅提醒</FieldLabel>
              <Input placeholder="例如：7天前提醒" value={subscriptionReminder} onChange={e => setSubscriptionReminder(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button className="h-10 bg-[var(--color-primary)] text-white" onClick={() => setReminderDialogOpen(false)}>
              <IconCheck size={14} data-icon="inline-start" />
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
            <AlertDialogCancel className="h-10 bg-[var(--color-surface-strong)]">
              <IconX size={14} data-icon="inline-start" />
              取消
            </AlertDialogCancel>
            <AlertDialogAction className="h-10 bg-[var(--color-error)] text-white hover:opacity-90" onClick={onDelete}>
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
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={className}>
      <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</h3>
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
