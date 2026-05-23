import {
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowUpRight,
  IconDots,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPlanById, getPlanRecords } from '~/data/mock'

export default function PlansDetail() {
  const { id } = useParams()
  const plan = getPlanById(id!)
  const records = getPlanRecords(id!)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!plan) {
    return (
      <div className="pt-6" style={{ color: 'var(--color-muted)' }}>
        计划不存在
      </div>
    )
  }

  // Build trend data from records (oldest first)
  const sortedRecords = [...records].sort(
    (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
  )

  // Simple SVG line chart
  const chartWidth = 280
  const chartHeight = 80
  const values = sortedRecords.map(r => r.totalValue)
  const minVal = values.length ? Math.min(...values) : 0
  const maxVal = values.length ? Math.max(...values) : 1
  const range = maxVal - minVal || 1
  const points = values.map((v, i) => {
    const x = values.length === 1 ? chartWidth / 2 : (i / (values.length - 1)) * chartWidth
    const y = chartHeight - ((v - minVal) / range) * (chartHeight - 10) - 5
    return `${x},${y}`
  })
  const polyline = points.join(' ')

  return (
    <div className="pt-6 pb-8">
      {/* Top bar */}
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
            to={`/plans/${id}/edit`}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            <IconPencil size={14} />
            编辑
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded p-1 transition-colors"
              style={{ color: 'var(--color-muted)' }}
            >
              <IconDots size={18} />
            </button>
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
                  onClick={() => setMenuOpen(false)}
                >
                  <IconTrash size={14} />
                  删除计划
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-3xl">{plan.emoji}</span>
        <h1
          className="font-[family-name:var(--font-display)] text-2xl"
          style={{ color: 'var(--color-ink)' }}
        >
          {plan.name}
        </h1>
      </div>

      {/* Members */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          成员
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.members.map(m => (
            <div
              key={m.letter + m.name}
              className="flex items-center gap-2 rounded-full px-2.5 py-1"
              style={{ background: 'var(--color-surface-soft)' }}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: m.color }}
              >
                {m.letter}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-body)' }}>
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Default items */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          默认项目
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.defaultItems.map(item => (
            <span
              key={item.name}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                background: item.type === 'income' ? 'var(--color-success)' : 'var(--color-error)',
                color: '#fff',
                opacity: 0.85,
              }}
            >
              {item.name}
            </span>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-4"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            累计净收入
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-xl font-semibold"
            style={{ color: 'var(--color-success)' }}
          >
            {plan.latestNetIncome.toLocaleString()}
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
            {values.length ? values[values.length - 1].toLocaleString() : plan.startingValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Net Value Trend Chart */}
      {values.length > 0 && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-3 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            净值趋势
          </div>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
            style={{ maxHeight: 100 }}
          >
            <polyline
              points={polyline}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {values.length === 1 && (
              <circle
                cx={chartWidth / 2}
                cy={chartHeight / 2}
                r="3"
                fill="var(--color-primary)"
              />
            )}
            {values.map((v, i) => {
              const x = values.length === 1 ? chartWidth / 2 : (i / (values.length - 1)) * chartWidth
              const y = chartHeight - ((v - minVal) / range) * (chartHeight - 10) - 5
              return (
                <circle
                  key={`dot-${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="var(--color-primary)"
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Monthly Records Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-sm font-medium"
            style={{ color: 'var(--color-ink)' }}
          >
            月度记录
          </h2>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: 'var(--color-primary-muted)',
              color: 'var(--color-primary)',
            }}
          >
            <IconPlus size={14} />
            添加本月记录
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {sortedRecords.map((record) => {
            const monthStr = `${record.year}-${String(record.month).padStart(2, '0')}`
            const isUp = record.netIncome >= 0
            return (
              <Link
                key={record.id}
                to={`/plans/${id}/records/${monthStr}`}
                className="rounded-xl border p-4 transition-shadow hover:shadow-md"
                style={{
                  background: 'var(--color-surface-card)',
                  borderColor: 'var(--color-hairline)',
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {record.year}
                    年
                    {record.month}
                    月
                  </span>
                  {isUp
                    ? (
                        <IconArrowUpRight size={16} style={{ color: 'var(--color-success)' }} />
                      )
                    : (
                        <IconArrowDownRight size={16} style={{ color: 'var(--color-error)' }} />
                      )}
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
        </div>
      </div>
    </div>
  )
}
