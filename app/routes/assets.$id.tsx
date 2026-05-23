import type { Route } from './+types/assets.$id'
import { IconBell, IconCoin, IconLoader2, IconRefresh, IconTrash } from '@tabler/icons-react'
import currency from 'currency.js'
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import {
  createRepairRecord,
  deleteRepairRecord,
  getAssetById,
  getAssetRepairRecords,
  getAssetWarranty,
  getAssetWithTags,
  getCategoriesByUserId,
  getPaymentAccountsByUserId,
  getPaymentTypesByUserId,
  getTagsByUserId,
  getTradedFromAsset,
  getTradeToAsset,
  markAssetAsTradedIn,
  softDeleteAsset,
  updateRepairRecord,
  upsertWarranty,
} from '~/db/queries/assets'
import { calculateHoldingDays, formatInteger, formatNumber, getAssetDetailPath, subAmount } from '~/lib/asset-meta'
import { calcOneTimeDailyCost } from '~/lib/cost'
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

  if (asset.assetType === 'subscription')
    throw redirect(`/subscriptions/${asset.id}`)

  const [tagIds, warranty, repairRecords, allCategories, allTags, paymentTypes, paymentAccounts, tradedFromAsset, tradeToAsset] = await Promise.all([
    getAssetWithTags(assetId),
    getAssetWarranty(assetId),
    getAssetRepairRecords(assetId),
    getCategoriesByUserId(userId),
    getTagsByUserId(userId),
    getPaymentTypesByUserId(userId),
    getPaymentAccountsByUserId(userId),
    asset.tradedFromAssetId ? getTradedFromAsset(asset.tradedFromAssetId) : Promise.resolve(null),
    getTradeToAsset(asset.id, userId),
  ])

  const holdingDays = calculateHoldingDays(asset.purchaseDate, asset.tradedInAt)
  const dailyCost = asset.purchasePrice
    ? asset.tradedInAt
      ? currency(subAmount(asset.purchasePrice, asset.tradeInPrice)).divide(Math.max(1, holdingDays)).value
      : calcOneTimeDailyCost(Number(asset.purchasePrice), asset.purchaseDate || new Date().toISOString().split('T')[0])
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
    tradedFromAsset,
    tradeToAsset,
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
    await softDeleteAsset(assetId, user.id)
    return redirect('/assets', { headers })
  }

  if (intent === 'sell') {
    const tradeInPrice = formData.get('tradeInPrice') as string
    const tradedInAt = formData.get('tradedInAt') as string
    await markAssetAsTradedIn(assetId, user.id, tradeInPrice, tradedInAt)
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

  if (intent === 'update-repair') {
    const repairId = formData.get('repairId') as string
    await updateRepairRecord(repairId, {
      repairDate: formData.get('repairDate') as string,
      cost: (formData.get('cost') as string) || '0',
      reason: (formData.get('reason') as string) || undefined,
      vendor: (formData.get('vendor') as string) || undefined,
      result: (formData.get('result') as string) || undefined,
      isDone: formData.get('isDone') === 'true',
    })
    return { ok: true }
  }

  if (intent === 'delete-repair') {
    const repairId = formData.get('repairId') as string
    await deleteRepairRecord(repairId)
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

export default function AssetDetailPage() {
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
    tradedFromAsset,
    tradeToAsset,
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

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRepairId, setEditingRepairId] = useState<string | null>(null)
  const [repairDate, setRepairDate] = useState(todayDate)
  const [repairCost, setRepairCost] = useState('')
  const [repairReason, setRepairReason] = useState('')
  const [repairVendor, setRepairVendor] = useState('')
  const [repairResult, setRepairResult] = useState('')
  const [repairIsDone, setRepairIsDone] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false)
  const [warrantyStartDate, setWarrantyStartDate] = useState(warranty?.startDate || todayDate)
  const [warrantyEndDate, setWarrantyEndDate] = useState(warranty?.endDate || todayDate)
  const [warrantyNotes, setWarrantyNotes] = useState(warranty?.notes || '')
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [sellPrice, setSellPrice] = useState('')
  const [sellDate, setSellDate] = useState(todayDate)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [warrantyReminder, setWarrantyReminder] = useState('跟随全局（14天）')

  const assetStatus = asset.tradedInAt ? (tradeToAsset ? '已换新' : '已卖出') : '持有中'

  function handleDelete() {
    const fd = new FormData()
    fd.append('intent', 'delete')
    submit(fd, { method: 'post' })
  }

  function handleSell() {
    const fd = new FormData()
    fd.append('intent', 'sell')
    fd.append('tradeInPrice', sellPrice || '0')
    fd.append('tradedInAt', sellDate)
    submit(fd, { method: 'post' })
    setSellDialogOpen(false)
  }

  function handleAddRepair() {
    const fd = new FormData()
    if (editingRepairId) {
      fd.append('intent', 'update-repair')
      fd.append('repairId', editingRepairId)
    }
    else {
      fd.append('intent', 'add-repair')
    }
    fd.append('repairDate', repairDate)
    fd.append('cost', repairCost || '0')
    fd.append('reason', repairReason)
    fd.append('vendor', repairVendor)
    fd.append('result', repairResult)
    fd.append('isDone', String(repairIsDone))
    submit(fd, { method: 'post' })
    setSheetOpen(false)
    resetRepairForm()
  }

  function handleDeleteRepair(repairId: string) {
    const fd = new FormData()
    fd.append('intent', 'delete-repair')
    fd.append('repairId', repairId)
    submit(fd, { method: 'post' })
  }

  function openEditRepair(record: typeof repairRecords[number]) {
    setEditingRepairId(record.id)
    setRepairDate(record.repairDate)
    setRepairCost(record.cost ? String(record.cost) : '')
    setRepairReason(record.reason || '')
    setRepairVendor(record.vendor || '')
    setRepairResult(record.result || '')
    setRepairIsDone(record.isDone ?? true)
    setSheetOpen(true)
  }

  function resetRepairForm() {
    setEditingRepairId(null)
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

  const basicRows = [
    { label: '购入价', value: asset.purchasePrice ? formatInteger(asset.purchasePrice) : '—' },
    { label: '持有天数', value: `${holdingDays} 天` },
    { label: '每日成本', value: `${formatNumber(dailyCost)}/天`, primary: true },
    { label: '支付类型', value: paymentType?.name || '—' },
    { label: '支付方式', value: paymentAccount?.name || '—' },
    { label: '分类', value: category ? `${category.emoji} ${category.name}` : '—' },
  ]

  const statusRows = [
    {
      label: '资产状态',
      value: (
        <Badge variant="secondary" className={assetStatus === '持有中' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
          {assetStatus}
        </Badge>
      ),
    },
    { label: '购买日期', value: asset.purchaseDate || '—' },
    tradedFromAsset
      ? {
          label: '回收资产',
          value: (
            <button className="text-primary" onClick={() => navigate(getAssetDetailPath(tradedFromAsset))}>
              {tradedFromAsset.name}
            </button>
          ),
        }
      : null,
    tradedFromAsset
      ? {
          label: '回收价格',
          value: tradedFromAsset.tradeInPrice ? formatInteger(tradedFromAsset.tradeInPrice) : '—',
        }
      : null,
    tradedFromAsset
      ? {
          label: '换新支付',
          value: asset.purchasePrice && tradedFromAsset.tradeInPrice
            ? formatInteger(subAmount(asset.purchasePrice, tradedFromAsset.tradeInPrice))
            : '—',
        }
      : null,
    assetStatus === '已卖出'
      ? { label: '卖出日期', value: asset.tradedInAt || '—' }
      : null,
    assetStatus === '已卖出'
      ? { label: '卖出价格', value: asset.tradeInPrice ? formatInteger(asset.tradeInPrice) : '—' }
      : null,
    tradeToAsset
      ? {
          label: '换新资产',
          value: (
            <button className="text-primary" onClick={() => navigate(getAssetDetailPath(tradeToAsset))}>
              {tradeToAsset.name}
            </button>
          ),
        }
      : null,
    tradeToAsset
      ? {
          label: '换新价格',
          value: tradeToAsset.purchasePrice ? formatInteger(tradeToAsset.purchasePrice) : '—',
        }
      : null,
    tradeToAsset
      ? {
          label: '换新支付',
          value: asset.tradeInPrice
            ? formatInteger(subAmount(tradeToAsset.purchasePrice || 0, asset.tradeInPrice))
            : '—',
        }
      : null,
  ].filter(Boolean) as Array<{ label: string, value: React.ReactNode, primary?: boolean }>

  return (
    <div className="pb-8">
      <SubPageHeader
        backTo="/assets"
        backLabel="资产"
        title="资产详情"
        primaryAction={{
          label: '编辑资产',
          to: `/assets/${asset.id}/edit`,
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
          <DetailRow key={`${row.label}-${index}`} label={row.label} value={row.value} primary={row.primary} isLast={index === statusRows.length - 1} />
        ))}
      </SectionCard>

      {warranty && (
        <SectionCard title="保修" className="mt-3">
          <DetailRow label="保修开始" value={warranty.startDate} />
          <DetailRow label="保修结束" value={warranty.endDate} />
          <DetailRow label="备注" value={warranty.notes || '—'} isLast />
        </SectionCard>
      )}

      {repairRecords.length > 0 && (
        <SectionCard title="维修信息" className="mt-3">
          {repairRecords.map((record, index) => (
            <div key={record.id} className={`py-2 ${index < repairRecords.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--color-hairline)' }}>
              <div className="text-[13px]" style={{ color: 'var(--color-muted)' }}>{record.repairDate}</div>
              <div className="text-[14px]" style={{ color: 'var(--color-ink)' }}>{record.reason || '维修记录'}</div>
              <div className="text-[12px]" style={{ color: 'var(--color-muted-soft)' }}>
                费用：
                {formatInteger(record.cost || 0)}
              </div>
              <div className="mt-1 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditRepair(record)}>编辑</Button>
                <Button size="sm" variant="outline" onClick={() => handleDeleteRepair(record.id)}>删除</Button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {!warranty && (
          <Button variant="outline" onClick={() => setWarrantyDialogOpen(true)}>编辑保修</Button>
        )}
        {repairRecords.length === 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={<Button variant="outline" />}>添加维修</SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader className="pb-1">
                <SheetTitle>{editingRepairId ? '编辑维修' : '添加维修'}</SheetTitle>
              </SheetHeader>
              <FieldGroup className="mt-2 px-4 pb-8">
                <Field>
                  <FieldLabel>维修日期</FieldLabel>
                  <DatePicker value={repairDate} onChange={setRepairDate} />
                </Field>
                <Field>
                  <FieldLabel>维修费用</FieldLabel>
                  <Input type="number" step="0.01" value={repairCost} onChange={e => setRepairCost(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>维修原因</FieldLabel>
                  <Input value={repairReason} onChange={e => setRepairReason(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>维修商</FieldLabel>
                  <Input value={repairVendor} onChange={e => setRepairVendor(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>维修结果</FieldLabel>
                  <Input value={repairResult} onChange={e => setRepairResult(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>已完成</FieldLabel>
                  <div className="flex h-11 items-center justify-between rounded-md border px-3">
                    <span className="text-sm">状态</span>
                    <Switch checked={repairIsDone} onCheckedChange={setRepairIsDone} />
                  </div>
                </Field>
                <Button onClick={handleAddRepair} disabled={isSubmitting}>
                  {isSubmitting && <IconLoader2 className="animate-spin" />}
                  保存
                </Button>
              </FieldGroup>
            </SheetContent>
          </Sheet>
        )}
        <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}/edit`)}>编辑资产</Button>
        <Button variant="outline" onClick={() => setReminderDialogOpen(true)}>
          <IconBell data-icon="inline-start" />
          提醒设置
        </Button>
        {!asset.tradedInAt && (
          <Button variant="outline" onClick={() => setSellDialogOpen(true)}>
            <IconCoin data-icon="inline-start" />
            卖出资产
          </Button>
        )}
        {!asset.tradedInAt && (
          <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}/trade-in`)}>
            <IconRefresh data-icon="inline-start" />
            以旧换新
          </Button>
        )}
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <IconTrash data-icon="inline-start" />
          删除资产
        </Button>
      </div>

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
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={warrantyDialogOpen} onOpenChange={setWarrantyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑保修</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>开始日期</FieldLabel>
              <DatePicker value={warrantyStartDate} onChange={setWarrantyStartDate} />
            </Field>
            <Field>
              <FieldLabel>结束日期</FieldLabel>
              <DatePicker value={warrantyEndDate} onChange={setWarrantyEndDate} />
            </Field>
            <Field>
              <FieldLabel>备注</FieldLabel>
              <Textarea value={warrantyNotes} onChange={e => setWarrantyNotes(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarrantyDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveWarranty} disabled={isSubmitting}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>卖出资产</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>卖出价格</FieldLabel>
              <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>卖出日期</FieldLabel>
              <DatePicker value={sellDate} onChange={setSellDate} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>取消</Button>
            <Button onClick={handleSell} disabled={isSubmitting}>确认</Button>
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
              <FieldLabel>保修提醒</FieldLabel>
              <Input value={warrantyReminder} onChange={e => setWarrantyReminder(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => setReminderDialogOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
