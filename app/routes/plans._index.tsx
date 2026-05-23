import type { Route } from './+types/plans._index'
import { Link, redirect, useLoaderData } from 'react-router'
import { MainPageHeader } from '~/components/page-header'
import { getPlanSummariesByUserId } from '~/db/queries/plans'
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

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const plans = await getPlanSummariesByUserId(user.id)
  return { plans }
}

export default function PlansIndex() {
  const { plans } = useLoaderData<typeof loader>()

  return (
    <div className="pt-6 pb-8">
      <MainPageHeader title="财务计划" action={{ label: '+ 计划', to: '/plans/new' }} />

      <div className="flex flex-col gap-3">
        {plans.map(plan => (
          <Link
            key={plan.id}
            to={`/plans/${plan.id}`}
            className="rounded-xl border p-4 transition-shadow hover:shadow-md"
            style={{
              background: 'var(--color-surface-card)',
              borderColor: 'var(--color-hairline)',
            }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-2xl">{plan.emoji}</span>
              <span
                className="text-[15px] font-medium"
                style={{ color: 'var(--color-ink)' }}
              >
                {plan.name}
              </span>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
              {plan.members.slice(0, 4).map(member => (
                <div
                  key={member.userId}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ background: getMemberColor(member.userId) }}
                  title={member.displayName}
                >
                  {getMemberLetter(member.displayName)}
                </div>
              ))}
              <span className="ml-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                {plan.permission === 'own' ? '成员仅编辑自己' : '成员可编辑全部'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  净收入
                </div>
                <div
                  className="font-[family-name:var(--font-mono)] text-lg font-semibold"
                  style={{ color: plan.latestNetIncome >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
                >
                  {plan.latestNetIncome.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  最新月份
                </div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--color-body)' }}
                >
                  {plan.latestMonth}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
