import { Link } from 'react-router'
import { MainPageHeader } from '~/components/page-header'
import { plans } from '~/data/mock'

export default function PlansIndex() {
  return (
    <div className="pt-6 pb-8">
      {/* Page Header */}
      <MainPageHeader title="财务计划" action={{ label: '+ 计划', to: '/plans/new' }} />

      {/* Plan Cards */}
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
            {/* Emoji + Name */}
            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-2xl">{plan.emoji}</span>
              <span
                className="text-[15px] font-medium"
                style={{ color: 'var(--color-ink)' }}
              >
                {plan.name}
              </span>
            </div>

            {/* Members */}
            <div className="mb-3 flex items-center gap-1.5">
              {plan.members.map(m => (
                <div
                  key={m.letter + m.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ background: m.color }}
                  title={m.name}
                >
                  {m.letter}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  累计净收入
                </div>
                <div
                  className="font-[family-name:var(--font-mono)] text-lg font-semibold"
                  style={{ color: 'var(--color-success)' }}
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
