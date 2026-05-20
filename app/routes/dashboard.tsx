import { IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { dashboardData } from '~/data/mock'

export default function Dashboard() {
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(true)

  const kpis = [
    { label: '每日花费', value: dashboardData.dailyExpense.toFixed(2), subtitle: '元/天' },
    { label: '月度估算', value: dashboardData.monthlyEstimate.toLocaleString(), subtitle: '元/月' },
    { label: '年度估算', value: dashboardData.yearlyEstimate.toLocaleString(), subtitle: '元/年' },
    { label: '累计支出', value: dashboardData.totalSpent.toLocaleString(), subtitle: `${dashboardData.assetCount} 项资产` },
  ]

  // SVG trend chart dimensions
  const chartWidth = 600
  const chartHeight = 200
  const padding = { top: 20, right: 10, bottom: 30, left: 10 }
  const data = dashboardData.trendData
  const labels = dashboardData.trendLabels
  const minVal = Math.min(...data) * 0.9
  const maxVal = Math.max(...data) * 1.05
  const xStep = (chartWidth - padding.left - padding.right) / (data.length - 1)
  const yScale = (v: number) =>
    chartHeight - padding.bottom - ((v - minVal) / (maxVal - minVal)) * (chartHeight - padding.top - padding.bottom)

  const points = data.map((v, i) => ({
    x: padding.left + i * xStep,
    y: yScale(v),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartHeight - padding.bottom} L${points[0].x},${chartHeight - padding.bottom} Z`

  return (
    <div className="pt-6 pb-8">
      {/* Warning Banner */}
      {showWarning && (
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
            Netflix 订阅将于 3 天后到期
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
      <h1
        className="mb-5 font-[family-name:var(--font-display)] text-[28px] font-semibold"
        style={{ color: 'var(--color-ink)' }}
      >
        统计总览
      </h1>

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
            {dashboardData.categorySpending.map(cat => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-[13px]" style={{ color: 'var(--color-body)' }}>
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
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
            style={{ height: 'auto' }}
          >
            {/* Area fill */}
            <path d={areaPath} fill="var(--color-primary)" fillOpacity={0.1} />
            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="var(--color-surface-card)"
                stroke="var(--color-primary)"
                strokeWidth={2}
              />
            ))}
            {/* X-axis labels */}
            {labels.map((label, i) => (
              <text
                key={i}
                x={padding.left + i * xStep}
                y={chartHeight - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-soft)"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </section>

      {/* Expiring Soon */}
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
          {dashboardData.expiring.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(`/assets/${item.id}`)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80 ${
                i < dashboardData.expiring.length - 1 ? 'border-b' : ''
              }`}
              style={{
                borderColor: 'var(--color-hairline)',
              }}
            >
              <span className="text-[18px]">{item.emoji}</span>
              <div className="flex-1 min-w-0">
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
    </div>
  )
}
