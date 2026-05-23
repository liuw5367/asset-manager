import {
  IconArrowLeft,
  IconDots,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPlanById, getPlanRecord } from '~/data/mock'

export default function PlansRecordsMonth() {
  const { id, month } = useParams()
  const plan = getPlanById(id!)

  // Parse month param like "2026-05"
  const [yearStr, monthStr] = (month ?? '').split('-')
  const year = Number(yearStr)
  const monthNum = Number(monthStr)
  const record = getPlanRecord(id!, year, monthNum)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!plan || !record) {
    return (
      <div className="pt-6" style={{ color: 'var(--color-muted)' }}>
        记录不存在
      </div>
    )
  }

  const incomeItems = record.items.filter(item => item.type === 'income')
  const expenseItems = record.items.filter(item => item.type === 'expense')

  return (
    <div className="pt-6 pb-8">
      {/* Top bar */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          to={`/plans/${id}`}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={16} />
          返回
        </Link>
        <h1
          className="text-sm font-medium"
          style={{ color: 'var(--color-ink)' }}
        >
          {year}
          年
          {monthNum}
          月
        </h1>
        <div className="flex items-center gap-3">
          <Link
            to={`/plans/${id}/records/${month}/edit`}
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm"
                  style={{ color: 'var(--color-error)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  <IconTrash size={14} />
                  删除记录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Created date */}
      <div className="mb-5 text-xs" style={{ color: 'var(--color-muted)' }}>
        创建于
        {' '}
        {new Date(record.createdAt).toLocaleDateString('zh-CN')}
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div
          className="rounded-xl border p-3"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            收入
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-lg font-semibold"
            style={{ color: 'var(--color-success)' }}
          >
            {record.totalIncome.toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            支出
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-lg font-semibold"
            style={{ color: 'var(--color-error)' }}
          >
            {record.totalExpense.toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          <div className="mb-1 text-xs" style={{ color: 'var(--color-muted)' }}>
            净收入
          </div>
          <div
            className="font-[family-name:var(--font-mono)] text-lg font-semibold"
            style={{ color: record.netIncome >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
          >
            {record.netIncome.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="mb-6">
        <h2
          className="mb-3 text-sm font-medium"
          style={{ color: 'var(--color-ink)' }}
        >
          收入明细
        </h2>
        <div
          className="rounded-xl border"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          {incomeItems.length === 0
            ? (
                <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                  暂无收入记录
                </div>
              )
            : (
                <>
                  {incomeItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                      style={{ borderColor: 'var(--color-hairline)' }}
                    >
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{ background: item.memberColor }}
                      >
                        {item.memberLetter}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                        {item.name}
                      </span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-sm font-medium"
                        style={{ color: 'var(--color-success)' }}
                      >
                        +
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between border-t px-4 py-2.5"
                    style={{ borderColor: 'var(--color-hairline)' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      收入合计
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm font-semibold"
                      style={{ color: 'var(--color-success)' }}
                    >
                      +
                      {record.totalIncome.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
        </div>
      </div>

      {/* Expense Section */}
      <div>
        <h2
          className="mb-3 text-sm font-medium"
          style={{ color: 'var(--color-ink)' }}
        >
          支出明细
        </h2>
        <div
          className="rounded-xl border"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
          }}
        >
          {expenseItems.length === 0
            ? (
                <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                  暂无支出记录
                </div>
              )
            : (
                <>
                  {expenseItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                      style={{ borderColor: 'var(--color-hairline)' }}
                    >
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{ background: item.memberColor }}
                      >
                        {item.memberLetter}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                        {item.name}
                      </span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-sm font-medium"
                        style={{ color: 'var(--color-error)' }}
                      >
                        -
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between border-t px-4 py-2.5"
                    style={{ borderColor: 'var(--color-hairline)' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      支出合计
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm font-semibold"
                      style={{ color: 'var(--color-error)' }}
                    >
                      -
                      {record.totalExpense.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
        </div>
      </div>
    </div>
  )
}
