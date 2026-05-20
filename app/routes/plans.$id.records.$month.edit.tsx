import {
  IconArrowLeft,
  IconCheck,
  IconDots,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPlanById, getPlanRecord } from '~/data/mock'

interface RecordItem {
  id: string
  memberLetter: string
  memberColor: string
  type: 'income' | 'expense'
  name: string
  amount: number
}

export default function PlansRecordsMonthEdit() {
  const { id, month } = useParams()
  const plan = getPlanById(id!)

  // Parse month param like "2026-05"
  const [yearStr, monthStr] = (month ?? '').split('-')
  const initYear = Number(yearStr)
  const initMonth = Number(monthStr)
  const record = getPlanRecord(id!, initYear, initMonth)

  const [selectedYear, setSelectedYear] = useState(initYear)
  const [selectedMonth, setSelectedMonth] = useState(initMonth)
  const [incomeItems, setIncomeItems] = useState<RecordItem[]>(
    record?.items.filter(i => i.type === 'income') ?? [],
  )
  const [expenseItems, setExpenseItems] = useState<RecordItem[]>(
    record?.items.filter(i => i.type === 'expense') ?? [],
  )

  const defaultMember = plan?.members[0] ?? { letter: 'A', color: '#cc785c', name: '我' }

  function addIncomeItem() {
    setIncomeItems([
      ...incomeItems,
      {
        id: `new-i-${Date.now()}`,
        memberLetter: defaultMember.letter,
        memberColor: defaultMember.color,
        type: 'income',
        name: '',
        amount: 0,
      },
    ])
  }

  function addExpenseItem() {
    setExpenseItems([
      ...expenseItems,
      {
        id: `new-e-${Date.now()}`,
        memberLetter: defaultMember.letter,
        memberColor: defaultMember.color,
        type: 'expense',
        name: '',
        amount: 0,
      },
    ])
  }

  function updateIncomeItem(index: number, field: 'name' | 'amount', value: string) {
    setIncomeItems(
      incomeItems.map((item, i) =>
        i === index
          ? { ...item, [field]: field === 'amount' ? Number(value) || 0 : value }
          : item,
      ),
    )
  }

  function updateExpenseItem(index: number, field: 'name' | 'amount', value: string) {
    setExpenseItems(
      expenseItems.map((item, i) =>
        i === index
          ? { ...item, [field]: field === 'amount' ? Number(value) || 0 : value }
          : item,
      ),
    )
  }

  function removeIncomeItem(index: number) {
    setIncomeItems(incomeItems.filter((_, i) => i !== index))
  }

  function removeExpenseItem(index: number) {
    setExpenseItems(expenseItems.filter((_, i) => i !== index))
  }

  const years = [2024, 2025, 2026, 2027]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="pt-6 pb-24">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={`/plans/${id}/records/${month}`}
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
          编辑月度记录
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            <IconCheck size={16} />
            保存
          </button>
          <button
            type="button"
            className="rounded p-1 transition-colors"
            style={{ color: 'var(--color-muted)' }}
          >
            <IconDots size={18} />
          </button>
        </div>
      </div>

      {/* Year + Month selects */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--color-muted)' }}
          >
            年份
          </label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              background: 'var(--color-surface-card)',
              borderColor: 'var(--color-hairline)',
              color: 'var(--color-ink)',
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
                年
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--color-muted)' }}
          >
            月份
          </label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              background: 'var(--color-surface-card)',
              borderColor: 'var(--color-hairline)',
              color: 'var(--color-ink)',
            }}
          >
            {months.map(m => (
              <option key={m} value={m}>
                {m}
                月
              </option>
            ))}
          </select>
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
        <div className="flex flex-col gap-2">
          {incomeItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: item.memberColor }}
              >
                {item.memberLetter}
              </div>
              <input
                type="text"
                value={item.name}
                onChange={e => updateIncomeItem(i, 'name', e.target.value)}
                placeholder="项目名称"
                className="h-8 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none"
                style={{
                  background: 'var(--color-surface-soft)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="number"
                value={item.amount || ''}
                onChange={e => updateIncomeItem(i, 'amount', e.target.value)}
                placeholder="金额"
                className="h-8 w-24 shrink-0 rounded-md border px-2 font-[family-name:var(--font-mono)] text-sm outline-none"
                style={{
                  background: 'var(--color-surface-soft)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-success)',
                }}
              />
              <button
                type="button"
                onClick={() => removeIncomeItem(i)}
                className="shrink-0 rounded p-1 transition-colors"
                style={{ color: 'var(--color-muted)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addIncomeItem}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm transition-colors"
            style={{
              borderColor: 'var(--color-hairline)',
              color: 'var(--color-primary)',
            }}
          >
            <IconPlus size={16} />
            添加收入项
          </button>
        </div>
      </div>

      {/* Expense Section */}
      <div className="mb-6">
        <h2
          className="mb-3 text-sm font-medium"
          style={{ color: 'var(--color-ink)' }}
        >
          支出明细
        </h2>
        <div className="flex flex-col gap-2">
          {expenseItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: item.memberColor }}
              >
                {item.memberLetter}
              </div>
              <input
                type="text"
                value={item.name}
                onChange={e => updateExpenseItem(i, 'name', e.target.value)}
                placeholder="项目名称"
                className="h-8 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none"
                style={{
                  background: 'var(--color-surface-soft)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-ink)',
                }}
              />
              <input
                type="number"
                value={item.amount || ''}
                onChange={e => updateExpenseItem(i, 'amount', e.target.value)}
                placeholder="金额"
                className="h-8 w-24 shrink-0 rounded-md border px-2 font-[family-name:var(--font-mono)] text-sm outline-none"
                style={{
                  background: 'var(--color-surface-soft)',
                  borderColor: 'var(--color-hairline)',
                  color: 'var(--color-error)',
                }}
              />
              <button
                type="button"
                onClick={() => removeExpenseItem(i)}
                className="shrink-0 rounded p-1 transition-colors"
                style={{ color: 'var(--color-muted)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addExpenseItem}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm transition-colors"
            style={{
              borderColor: 'var(--color-hairline)',
              color: 'var(--color-primary)',
            }}
          >
            <IconPlus size={16} />
            添加支出项
          </button>
        </div>
      </div>

      {/* Sticky save button (mobile) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 md:hidden"
        style={{
          background: 'var(--color-canvas)',
          borderColor: 'var(--color-hairline)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          <IconCheck size={16} />
          保存记录
        </button>
      </div>
    </div>
  )
}
