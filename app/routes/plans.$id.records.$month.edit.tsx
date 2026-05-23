import type { Route } from './+types/plans.$id.records.$month.edit'
import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Link, redirect, useActionData, useLoaderData, useNavigation, useSubmit } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  getPlanDetailById,
  getPlanRecordDetail,
  savePlanRecordPatch,
} from '~/db/queries/plans'
import { planRecordPatchSchema } from '~/lib/plan.schema'
import { createSupabaseServerClient } from '~/lib/supabase.server'

interface EditableItem {
  id: string
  itemType: 'income' | 'expense'
  memberId: string
  name: string
  amount: string
  expectedUpdatedAt?: string
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const [yearStr, monthStr] = (params.month ?? '').split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!Number.isFinite(year) || !Number.isFinite(month))
    throw new Response('Not Found', { status: 404 })

  const [recordData, planDetail] = await Promise.all([
    getPlanRecordDetail(params.id, user.id, year, month),
    getPlanDetailById(params.id, user.id),
  ])

  if (!planDetail)
    throw new Response('Not Found', { status: 404 })

  const currentUserMember = planDetail.members.find(m => m.userId === user.id)
  const defaultMemberId = currentUserMember?.userId || planDetail.members[0]?.userId || user.id

  if (recordData) {
    return {
      mode: 'edit' as const,
      planId: params.id,
      month,
      year,
      currentUserId: user.id,
      canEditAllItems: recordData.canEditAllItems,
      members: planDetail.members,
      recordUpdatedAt: recordData.record.updatedAt?.toISOString(),
      items: recordData.record.items.map(item => ({
        id: item.id,
        itemType: item.itemType,
        memberId: item.memberId,
        name: item.name,
        amount: String(item.amount),
        expectedUpdatedAt: item.updatedAt?.toISOString(),
      })),
    }
  }

  const defaultItems = planDetail.defaultItems.map((item, index) => ({
    id: `new-default-${index}`,
    itemType: item.itemType,
    memberId: defaultMemberId,
    name: item.name,
    amount: '0',
  }))

  return {
    mode: 'create' as const,
    planId: params.id,
    month,
    year,
    currentUserId: user.id,
    canEditAllItems: planDetail.canEditAllItems,
    members: planDetail.members,
    recordUpdatedAt: undefined,
    items: defaultItems,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const payloadText = String(formData.get('payload') || '')

  let payloadRaw: unknown
  try {
    payloadRaw = JSON.parse(payloadText)
  }
  catch {
    return { error: '提交数据格式错误' }
  }

  const parsed = planRecordPatchSchema.safeParse(payloadRaw)
  if (!parsed.success)
    return { error: parsed.error.issues[0].message }

  try {
    const result = await savePlanRecordPatch({
      planId: params.id,
      userId: user.id,
      year: parsed.data.year,
      month: parsed.data.month,
      expectedRecordUpdatedAt: parsed.data.expectedRecordUpdatedAt,
      addedItems: parsed.data.addedItems,
      updatedItems: parsed.data.updatedItems,
      deletedItems: parsed.data.deletedItems,
    })

    return redirect(`/plans/${params.id}/records/${result.monthKey}`, { headers })
  }
  catch (error) {
    return { error: error instanceof Error ? error.message : '保存失败' }
  }
}

function itemEditable(item: EditableItem, currentUserId: string, canEditAllItems: boolean) {
  if (canEditAllItems)
    return true
  return item.memberId === currentUserId
}

export default function PlansRecordsMonthEdit() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const navigation = useNavigation()

  const [selectedYear, setSelectedYear] = useState(data.year)
  const [selectedMonth, setSelectedMonth] = useState(data.month)
  const [items, setItems] = useState<EditableItem[]>(data.items)
  const [deletedItems, setDeletedItems] = useState<Array<{ id: string, expectedUpdatedAt?: string }>>([])

  const initialMap = useMemo(() => {
    const map = new Map<string, EditableItem>()
    for (const item of data.items) {
      if (!item.id.startsWith('new-'))
        map.set(item.id, item)
    }
    return map
  }, [data.items])

  const isSubmitting = navigation.state !== 'idle'

  const years = [2024, 2025, 2026, 2027, 2028]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  function addItem(type: 'income' | 'expense') {
    const memberId = data.currentUserId
    setItems(prev => [...prev, {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemType: type,
      memberId,
      name: '',
      amount: '0',
    }])
  }

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const found = prev.find(item => item.id === id)
      if (found && !found.id.startsWith('new-')) {
        setDeletedItems(list => [...list, { id: found.id, expectedUpdatedAt: found.expectedUpdatedAt }])
      }
      return prev.filter(item => item.id !== id)
    })
  }

  function buildPatch() {
    const addedItems: Array<{ memberId: string, itemType: 'income' | 'expense', name: string, amount: string }> = []
    const updatedItems: Array<{ id: string, memberId: string, name: string, amount: string, expectedUpdatedAt?: string }> = []

    for (const item of items) {
      const amountText = item.amount.trim() || '0'
      if (item.id.startsWith('new-')) {
        if (!item.name.trim())
          continue
        addedItems.push({
          memberId: item.memberId,
          itemType: item.itemType,
          name: item.name,
          amount: amountText,
        })
        continue
      }

      const initial = initialMap.get(item.id)
      if (!initial)
        continue

      const changed
        = initial.name !== item.name
          || Number(initial.amount) !== Number(amountText)
          || initial.memberId !== item.memberId

      if (!changed)
        continue

      updatedItems.push({
        id: item.id,
        memberId: item.memberId,
        name: item.name,
        amount: amountText,
        expectedUpdatedAt: item.expectedUpdatedAt,
      })
    }

    return {
      year: selectedYear,
      month: selectedMonth,
      expectedRecordUpdatedAt: data.recordUpdatedAt,
      addedItems,
      updatedItems,
      deletedItems,
    }
  }

  function handleSave() {
    const patch = buildPatch()
    const fd = new FormData()
    fd.set('payload', JSON.stringify(patch))
    submit(fd, { method: 'post' })
  }

  const incomeItems = items.filter(item => item.itemType === 'income')
  const expenseItems = items.filter(item => item.itemType === 'expense')
  const currentMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  return (
    <div className="pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={`/plans/${data.planId}/records/${data.year}-${String(data.month).padStart(2, '0')}`}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={16} />
          返回
        </Link>
        <h1 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          编辑月度记录
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconCheck size={16} />
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="mb-2 text-xs" style={{ color: 'var(--color-muted)' }}>
        归属月份：
        {currentMonthKey}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            年份
          </label>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择年份">{value => `${value}年`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                    年
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            月份
          </label>
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择月份">{value => `${value}月`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {months.map(month => (
                  <SelectItem key={month} value={String(month)}>
                    {month}
                    月
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          收入明细
        </h2>
        <div className="flex flex-col gap-2">
          {incomeItems.map((item) => {
            const editable = itemEditable(item, data.currentUserId, data.canEditAllItems)
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
                style={{
                  background: 'var(--color-surface-card)',
                  borderColor: 'var(--color-hairline)',
                  opacity: editable ? 1 : 0.5,
                }}
              >
                <Select
                  value={item.memberId}
                  onValueChange={v => updateItem(item.id, { memberId: v || item.memberId })}
                  disabled={!editable}
                >
                  <SelectTrigger className="h-8 w-28 shrink-0">
                    <SelectValue placeholder="成员">
                      {(value) => {
                        const member = data.members.find(m => m.userId === value)
                        return member?.displayName || '成员'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data.members.map(member => (
                        <SelectItem key={member.userId} value={member.userId}>{member.displayName}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(item.id, { name: e.target.value })}
                  placeholder="项目名称"
                  className="h-8 min-w-0 flex-1"
                  disabled={!editable}
                />
                <Input
                  type="number"
                  value={item.amount}
                  onChange={e => updateItem(item.id, { amount: e.target.value })}
                  placeholder="金额"
                  className="h-8 w-24 shrink-0 font-[family-name:var(--font-mono)]"
                  disabled={!editable}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(item.id)}
                  disabled={!editable}
                  className="shrink-0"
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" className="h-10 border-dashed" onClick={() => addItem('income')}>
            <IconPlus size={16} />
            添加收入项
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          支出明细
        </h2>
        <div className="flex flex-col gap-2">
          {expenseItems.map((item) => {
            const editable = itemEditable(item, data.currentUserId, data.canEditAllItems)
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
                style={{
                  background: 'var(--color-surface-card)',
                  borderColor: 'var(--color-hairline)',
                  opacity: editable ? 1 : 0.5,
                }}
              >
                <Select
                  value={item.memberId}
                  onValueChange={v => updateItem(item.id, { memberId: v || item.memberId })}
                  disabled={!editable}
                >
                  <SelectTrigger className="h-8 w-28 shrink-0">
                    <SelectValue placeholder="成员">
                      {(value) => {
                        const member = data.members.find(m => m.userId === value)
                        return member?.displayName || '成员'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data.members.map(member => (
                        <SelectItem key={member.userId} value={member.userId}>{member.displayName}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(item.id, { name: e.target.value })}
                  placeholder="项目名称"
                  className="h-8 min-w-0 flex-1"
                  disabled={!editable}
                />
                <Input
                  type="number"
                  value={item.amount}
                  onChange={e => updateItem(item.id, { amount: e.target.value })}
                  placeholder="金额"
                  className="h-8 w-24 shrink-0 font-[family-name:var(--font-mono)]"
                  disabled={!editable}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(item.id)}
                  disabled={!editable}
                  className="shrink-0"
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" className="h-10 border-dashed" onClick={() => addItem('expense')}>
            <IconPlus size={16} />
            添加支出项
          </Button>
        </div>
      </div>

      {actionData?.error && (
        <div className="mb-4 text-sm" style={{ color: 'var(--color-error)' }}>
          {actionData.error}
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 md:hidden"
        style={{
          background: 'var(--color-canvas)',
          borderColor: 'var(--color-hairline)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <Button type="button" className="h-11 w-full" onClick={handleSave} disabled={isSubmitting}>
          <IconCheck size={16} />
          {isSubmitting ? '保存中...' : '保存记录'}
        </Button>
      </div>
    </div>
  )
}
