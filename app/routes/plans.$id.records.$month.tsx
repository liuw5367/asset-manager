import type { Route } from './+types/plans.$id.records.$month'
import {
  IconArrowLeft,
  IconDots,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
  getPlanRecordDetail,
  softDeletePlanRecord,
} from '~/db/queries/plans'
import { createSupabaseServerClient } from '~/lib/supabase.server'

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

  const data = await getPlanRecordDetail(params.id, user.id, year, month)
  if (!data)
    throw new Response('Not Found', { status: 404 })

  return data
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent !== 'delete-record')
    return null

  const confirmMonth = String(formData.get('confirmMonth') || '').trim()
  const expectedMonth = String(params.month || '')
  if (confirmMonth !== expectedMonth)
    return { error: `请输入正确的归属月份 ${expectedMonth}` }

  const [yearStr, monthStr] = expectedMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  await softDeletePlanRecord(params.id, user.id, year, month)
  return redirect(`/plans/${params.id}`, { headers })
}

export default function PlansRecordsMonth() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmMonth, setConfirmMonth] = useState('')

  const isDeleting = navigation.state !== 'idle'
    && navigation.formData?.get('intent') === 'delete-record'

  const monthKey = `${data.record.year}-${String(data.record.month).padStart(2, '0')}`
  const incomeItems = useMemo(() => data.record.items.filter(item => item.itemType === 'income'), [data.record.items])
  const expenseItems = useMemo(() => data.record.items.filter(item => item.itemType === 'expense'), [data.record.items])
  const memberNotes = useMemo(
    () => data.record.memberNotes.filter(note => note.note.trim().length > 0),
    [data.record.memberNotes],
  )

  return (
    <div className="pt-6 pb-8">
      <div className="mb-5 flex items-center justify-between">
        <Link
          to={`/plans/${data.planId}`}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={16} />
          返回
        </Link>
        <h1 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {data.record.year}
          年
          {data.record.month}
          月
        </h1>
        <div className="flex items-center gap-3">
          <Link
            to={`/plans/${data.planId}/records/${monthKey}/edit`}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            <IconPencil size={14} />
            编辑
          </Link>
          {data.canManage && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMenuOpen(prev => !prev)}
                style={{ color: 'var(--color-muted)' }}
              >
                <IconDots size={18} />
              </Button>
              {menuOpen && (
                <button
                  type="button"
                  className="absolute right-0 top-8 z-10 flex w-36 items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: 'var(--color-surface-card)',
                    borderColor: 'var(--color-hairline)',
                    color: 'var(--color-error)',
                  }}
                  onClick={() => {
                    setMenuOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  <IconTrash size={14} />
                  删除记录
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 text-xs" style={{ color: 'var(--color-muted)' }}>
        创建于
        {' '}
        {data.record.createdAt ? new Date(data.record.createdAt).toLocaleDateString('zh-CN') : '--'}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>收入</div>
          <div className="font-[family-name:var(--font-mono)] text-lg font-semibold" style={{ color: 'var(--color-success)' }}>
            {data.record.totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>支出</div>
          <div className="font-[family-name:var(--font-mono)] text-lg font-semibold" style={{ color: 'var(--color-error)' }}>
            {data.record.totalExpense.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>净收入</div>
          <div className="font-[family-name:var(--font-mono)] text-lg font-semibold" style={{ color: data.record.netIncome >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {data.record.netIncome.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>收入明细</h2>
        <div className="rounded-xl border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          {incomeItems.length === 0
            ? <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>暂无收入记录</div>
            : (
                <>
                  {incomeItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--color-hairline)' }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: 'var(--color-info)' }}>
                        {item.memberEmoji}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>{item.name}</span>
                      <span className="font-[family-name:var(--font-mono)] text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                        +
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </>
              )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>支出明细</h2>
        <div className="rounded-xl border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          {expenseItems.length === 0
            ? <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>暂无支出记录</div>
            : (
                <>
                  {expenseItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--color-hairline)' }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: 'var(--color-info)' }}>
                        {item.memberEmoji}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>{item.name}</span>
                      <span className="font-[family-name:var(--font-mono)] text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                        -
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </>
              )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>成员备注</h2>
        <div className="rounded-xl border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}>
          {memberNotes.length === 0
            ? <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>暂无成员备注</div>
            : (
                <>
                  {memberNotes.map(note => (
                    <div key={note.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--color-hairline)' }}>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: 'var(--color-info)' }}>
                        {note.memberEmoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>{note.memberName}</div>
                        <div className="text-sm" style={{ color: 'var(--color-ink)' }}>{note.note}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除记录</DialogTitle>
            <DialogDescription>
              请输入归属月份
              {' '}
              <strong>{monthKey}</strong>
              {' '}
              以确认删除。
            </DialogDescription>
          </DialogHeader>

          <Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="delete-record" />
            <Input
              name="confirmMonth"
              value={confirmMonth}
              onChange={e => setConfirmMonth(e.target.value)}
              placeholder={monthKey}
              autoFocus
            />
            {actionData?.error && (
              <div className="text-xs" style={{ color: 'var(--color-error)' }}>{actionData.error}</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                取消
              </Button>
              <Button type="submit" variant="destructive" disabled={isDeleting || confirmMonth !== monthKey}>
                {isDeleting ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
