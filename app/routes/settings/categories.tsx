import type { Category } from '~/data/mock'
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
import { categories as mockCategories } from '~/data/mock'

export default function CategoriesPage() {
  const [list, setList] = useState<Category[]>([...mockCategories])
  const [newEmoji, setNewEmoji] = useState('📦')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name)
      return
    const item: Category = {
      id: `cat-${Date.now()}`,
      name,
      emoji: newEmoji,
      isPreset: false,
    }
    setList(prev => [...prev, item])
    setNewEmoji('📦')
    setNewName('')
  }

  const handleStartEdit = (item: Category) => {
    setEditingId(item.id)
    setEditName(item.name)
  }

  const handleSaveEdit = (id: string) => {
    const name = editName.trim()
    if (!name)
      return
    setList(prev =>
      prev.map(c => (c.id === id ? { ...c, name } : c)),
    )
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    setList(prev => prev.filter(c => c.id !== id))
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
          分类管理
        </h1>
      </div>

      {/* Add form */}
      <div
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
      >
        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: 'var(--color-surface-strong)' }}
            title="选择 Emoji"
          >
            {newEmoji}
          </button>
          <input
            type="text"
            placeholder="分类名称"
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
            <span className="text-lg">{item.emoji}</span>
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
                    {item.isPreset && (
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--color-primary-muted)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        预置
                      </span>
                    )}
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
