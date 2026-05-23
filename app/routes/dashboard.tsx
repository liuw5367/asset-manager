import type { Route } from './+types/dashboard'
import type { ChartConfig } from '~/components/ui/chart'
import { IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { redirect, useLoaderData, useNavigate } from 'react-router'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { MainPageHeader } from '~/components/page-header'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import { getDashboardData } from '~/db/queries/dashboard'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  return getDashboardData(user.id)
}

const trendChartConfig = {
  amount: {
    label: '持有成本',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig

export default function Dashboard() {
  const navigate = useNavigate()
  const data = useLoaderData<typeof loader>()
  const [showWarning, setShowWarning] = useState(true)

  const { kpi, categorySpending, monthlyTrend, expiring } = data

  const kpis = [
    { label: '每日成本', value: kpi.dailyCostTotal.toFixed(2), subtitle: '元/天' },
    {
      label: '订阅费用',
      value: `${kpi.subscriptionMonthlyTotal.toFixed(2)} / ${kpi.subscriptionYearlyTotal.toFixed(2)}`,
      subtitle: '月 / 年',
    },
    { label: '资产数量', value: String(kpi.activeAssetCount), subtitle: '活跃资产' },
    { label: '资产总额', value: kpi.activeAssetPurchaseTotal.toLocaleString(), subtitle: '购入价总和' },
  ]

  return (
    <div className="pt-6 pb-8">
      {/* Warning Banner */}
      {showWarning && expiring.length > 0 && (
        <div
          className="mb-6 flex items-center gap-3 rounded-lg px-4 py-3 text-[13px]"
          style={{
            background: 'rgba(212,160,23,0.1)',
            borderLeft: '3px solid var(--color-warning)',
            color: 'var(--color-body)',
          }}
        >
          <span className="flex-1">
            <span style={{ color: 'var(--color-warning)' }}>⚠️</span>
            {' '}
            {expiring[0].name}
            {' '}
            {expiring[0].detail}
          </span>
          <button
            onClick={() => setShowWarning(false)}
            className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-muted)' }}
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <MainPageHeader title="统计总览" />

      {/* KPI Grid */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="rounded-xl px-4 py-3.5"
            style={{ background: 'var(--color-surface-card)' }}
          >
            <div className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
              {kpi.label}
            </div>
            <div
              className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight"
              style={{ color: 'var(--color-ink)' }}
            >
              {kpi.value}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--color-muted-soft)' }}>
              {kpi.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Category Spending */}
      {categorySpending.length > 0 && (
        <section className="mb-8">
          <h2
            className="mb-3 text-[15px] font-medium"
            style={{ color: 'var(--color-ink)' }}
          >
            分类花费分布
          </h2>
          <div
            className="rounded-xl px-4 py-4"
            style={{ background: 'var(--color-surface-card)' }}
          >
            <div className="flex flex-col gap-3">
              {categorySpending.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="w-[96px] shrink-0 whitespace-nowrap text-[13px]" style={{ color: 'var(--color-body)' }}>
                    {cat.emoji}
                    {' '}
                    {cat.name}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-[10px] w-full overflow-hidden rounded-full"
                      style={{ background: 'var(--color-surface-strong)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.percent}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                  <span className="w-[56px] shrink-0 text-right text-[13px]" style={{ color: 'var(--color-body)' }}>
                    {cat.amount.toLocaleString()}
                  </span>
                  <span className="w-[36px] shrink-0 text-right text-[12px]" style={{ color: 'var(--color-muted-soft)' }}>
                    {cat.percent}
                    %
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Monthly Trend */}
      <section className="mb-8">
        <h2
          className="mb-3 text-[15px] font-medium"
          style={{ color: 'var(--color-ink)' }}
        >
          月度趋势
        </h2>
        <div
          className="rounded-xl px-4 py-4"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <ChartContainer config={trendChartConfig} className="aspect-video h-[200px] w-full">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={50}
              />
              <ChartTooltip
                content={(
                  <ChartTooltipContent
                    formatter={(value) => {
                      const num = typeof value === 'number' ? value : Number(value)
                      return `${num.toLocaleString()} 元/月`
                    }}
                  />
                )}
              />
              <Area
                dataKey="amount"
                type="monotone"
                fill="url(#fillAmount)"
                stroke="var(--color-amount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </section>

      {/* Expiring Soon */}
      {expiring.length > 0 && (
        <section>
          <h2
            className="mb-3 text-[15px] font-medium"
            style={{ color: 'var(--color-ink)' }}
          >
            即将到期
          </h2>
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: 'var(--color-surface-card)' }}
          >
            {expiring.map((item, i) => (
              <button
                key={item.id}
                onClick={() => navigate(`/assets/${item.id}`)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80 ${
                  i < expiring.length - 1 ? 'border-b' : ''
                }`}
                style={{
                  borderColor: 'var(--color-hairline)',
                }}
              >
                <span className="text-[18px]">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium" style={{ color: 'var(--color-ink)' }}>
                    {item.name}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--color-muted-soft)' }}>
                    {item.detail}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
