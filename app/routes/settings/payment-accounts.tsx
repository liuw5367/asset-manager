import type { PaymentAccount, PaymentType } from '~/data/mock'
import {
  IconArrowLeft,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  paymentAccounts as mockPaymentAccounts,
  paymentTypes as mockPaymentTypes,

} from '~/data/mock'

export default function PaymentAccountsPage() {
  const [list, setList] = useState<PaymentAccount[]>([...mockPaymentAccounts])
  const paymentTypes: PaymentType[] = [...mockPaymentTypes]
  const [newTypeId, setNewTypeId] = useState(paymentTypes[0]?.id ?? '')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const getTypeName = (typeId: string) =>
    paymentTypes.find(t => t.id === typeId)?.name ?? ''

  const handleAdd = () => {
    const name = newName.trim()
    if (!name || !newTypeId)
      return
    const item: PaymentAccount = {
      id: `pa-${Date.now()}`,
      name,
      paymentTypeId: newTypeId,
    }
    setList(prev => [...prev, item])
    setNewName('')
  }

  const handleStartEdit = (item: PaymentAccount) => {
    setEditingId(item.id)
    setEditName(item.name)
  }

  const handleSaveEdit = (id: string) => {
    const name = editName.trim()
    if (!name)
      return
    setList(prev =>
      prev.map(a => (a.id === id ? { ...a, name } : a)),
    )
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    setList(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          to="/settings"
          className="flex items-center gap-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={18} />
          设置
        </Link>
        <span style={{ color: 'var(--color-muted-soft)' }}>/</span>
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          支付账户管理
        </h1>
      </div>

      {/* Add form */}
      <div
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
      >
        <div className="flex items-center gap-3">
          <select
            value={newTypeId}
            onChange={e => setNewTypeId(e.target.value)}
            className="h-10 shrink-0 rounded-xl border-0 px-3 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-surface-strong)',
              color: 'var(--color-ink)',
            }}
          >
            {paymentTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="账户名称"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="min-w-0 flex-1 rounded-xl border-0 px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-surface-strong)',
              color: 'var(--color-ink)',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <IconPlus size={16} />
            新增
          </button>
        </div>
      </div>

      {/* List */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
      >
        {list.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom:
                i < list.length - 1
                  ? '1px solid var(--color-hairline)'
                  : undefined,
            }}
          >
            {editingId === item.id
              ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleSaveEdit(item.id)
                        if (e.key === 'Escape')
                          setEditingId(null)
                      }}
                      className="min-w-0 flex-1 rounded-lg border-0 px-2 py-1 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-surface-strong)',
                        color: 'var(--color-ink)',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-success)' }}
                    >
                      <IconCheck size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-muted-soft)' }}
                    >
                      <IconX size={16} />
                    </button>
                  </>
                )
              : (
                  <>
                    <span
                      className="min-w-0 flex-1 text-sm"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-primary-muted)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {getTypeName(item.paymentTypeId)}
                    </span>
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-muted-soft)' }}
                    >
                      <IconPencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <IconTrash size={16} />
                    </button>
                  </>
                )}
          </div>
        ))}
      </div>
    </div>
  )
}
