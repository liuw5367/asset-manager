import type { Route } from './+types/plans.$id'
import type { ChartConfig } from '~/components/ui/chart'
import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowUpRight,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Form, Link, redirect, useLoaderData, useNavigation } from 'react-router'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
import { Button } from '~/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import {
  getPlanDetailById,
  softDeletePlan,
} from '~/db/queries/plans'
import { createSupabaseServerClient } from '~/lib/supabase.server'

const MEMBER_COLORS = ['#cc785c', '#5db8a6', '#d4a017', '#7c6dea', '#5db872']

function getMemberColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return MEMBER_COLORS[hash % MEMBER_COLORS.length]
}

function getMemberLetter(name: string) {
  return (name.trim().charAt(0) || 'M').toUpperCase()
}

const trendChartConfig = {
  amount: {
    label: '总额',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const detail = await getPlanDetailById(params.id, user.id)
  if (!detail)
    throw new Response('Not Found', { status: 404 })

  return detail
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete-plan') {
    await softDeletePlan(params.id, user.id)
    return redirect('/plans', { headers })
  }

  return null
}

export default function PlansDetail() {
  const detail = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isSubmittingDelete = navigation.state !== 'idle'
    && navigation.formData?.get('intent') === 'delete-plan'

  const currentMonth = currentMonthKey()

  return (
    <div className="pt-6 pb-8">
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/plans"
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={16} />
          月度计划
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={`/plans/${detail.id}/edit`}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            <IconPencil size={14} />
            编辑
          </Link>
          {detail.canManage && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMenuOpen(prev => !prev)}
                className="text-[16px]"
                style={{ color: 'var(--color-muted)' }}
              >
                ···
              </Button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-8 z-10 w-36 rounded-lg border py-1 shadow-lg"
                  style={{
                    background: 'var(--color-surface-card)',
                    borderColor: 'var(--color-hairline)',
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => {
                      setMenuOpen(false)
                      setDeleteDialogOpen(true)
                    }}
                    disabled={isSubmittingDelete}
                  >
                    <IconTrash size={14} />
                    {isSubmittingDelete ? '删除中...' : '删除计划'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-3xl">{detail.emoji}</span>
        <h1
          className="font-[family-name:var(--font-display)] text-2xl"
          style={{ color: 'var(--color-ink)' }}
        >
          {detail.name}
        </h1>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          成员
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.members.map(member => (
            <div
              key={member.userId}
              className="flex items-center gap-2 rounded-full px-2.5 py-1"
              style={{ background: 'var(--color-surface-soft)' }}
              title={member.note || undefined}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: getMemberColor(member.userId) }}
              >
                {getMemberLetter(member.displayName)}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-body)' }}>
                {member.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          默认项目
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detail.defaultItems.map(item => (
            <span
              key={item.id}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                background: item.itemType === 'income' ? 'var(--color-success)' : 'var(--color-error)',
                color: '#fff',
                opacity: 0.85,
              }}
            >
              {item.name}
            </span>
          ))}
          {detail.defaultItems.length === 0 && (
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              暂无默认项目
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-4"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            最近净收入
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-xl font-semibold"
            style={{ color: 'var(--color-success)' }}
          >
            {(detail.records[0]?.netIncome ?? 0).toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            当前总额
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-xl font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            {(detail.records[0]?.totalValue ?? detail.startingValue).toLocaleString()}
          </div>
        </div>
      </div>

      <div
        className="mb-6 rounded-xl border p-4"
        style={{
          background: 'var(--color-surface-card)',
          borderColor: 'var(--color-hairline)',
        }}
      >
        <div className="mb-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          净值趋势（最近12个月）
        </div>
        <ChartContainer config={trendChartConfig} className="aspect-video h-[180px] w-full">
          <AreaChart data={detail.trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPlanAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={52} />
            <ChartTooltip
              content={(
                <ChartTooltipContent
                  formatter={(value) => {
                    const num = typeof value === 'number' ? value : Number(value)
                    return `${num.toLocaleString()} 元`
                  }}
                />
              )}
            />
            <Area dataKey="amount" type="monotone" fill="url(#fillPlanAmount)" stroke="var(--color-amount)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            月度记录
          </h2>
          <Link
            to={`/plans/${detail.id}/records/${currentMonth}/edit`}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: 'var(--color-primary-muted)',
              color: 'var(--color-primary)',
            }}
          >
            <IconPlus size={14} />
            添加本月记录
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          {detail.records.map((record) => {
            const monthStr = `${record.year}-${String(record.month).padStart(2, '0')}`
            const isUp = record.netIncome >= 0
            return (
              <Link
                key={record.id}
                to={`/plans/${detail.id}/records/${monthStr}`}
                className="rounded-xl border p-4 transition-shadow hover:shadow-md"
                style={{
                  background: 'var(--color-surface-card)',
                  borderColor: 'var(--color-hairline)',
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {record.year}
                    年
                    {record.month}
                    月
                  </span>
                  {isUp
                    ? <IconArrowUpRight size={16} style={{ color: 'var(--color-success)' }} />
                    : <IconArrowDownRight size={16} style={{ color: 'var(--color-error)' }} />}
                </div>
                <div
                  className="mb-2 font-[family-name:var(--font-mono)] text-lg font-semibold"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {record.totalValue.toLocaleString()}
                </div>
                <div className="flex gap-4 text-xs">
                  <span style={{ color: 'var(--color-success)' }}>
                    收入
                    {' '}
                    {record.totalIncome.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--color-error)' }}>
                    支出
                    {' '}
                    {record.totalExpense.toLocaleString()}
                  </span>
                </div>
              </Link>
            )
          })}
          {detail.records.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-muted)' }}>
              暂无记录，点击“添加本月记录”开始。
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除计划</AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复，计划下所有月度记录将一并隐藏。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary" className="h-10">
              取消
            </AlertDialogCancel>
            <Form method="post">
              <input type="hidden" name="intent" value="delete-plan" />
              <AlertDialogAction type="submit" variant="destructive" className="h-10" disabled={isSubmittingDelete}>
                {isSubmittingDelete ? '删除中...' : '确认删除'}
              </AlertDialogAction>
            </Form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
