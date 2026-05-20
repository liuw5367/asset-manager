import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPlanById } from '~/data/mock'

const EMOJI_OPTIONS = ['💰', '📊', '🏦', '💳', '📈', '🪙', '💎', '🏠', '🎯', '📋']

interface MemberForm {
  letter: string
  color: string
  name: string
  role: string
}

interface DefaultItemForm {
  name: string
  type: 'income' | 'expense'
}

export default function PlansEdit() {
  const { id } = useParams()
  const plan = getPlanById(id!)

  const [emoji, setEmoji] = useState(plan?.emoji ?? '💰')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [name, setName] = useState(plan?.name ?? '')
  const [members] = useState<MemberForm[]>(plan?.members ?? [])
  const [collabPermission, setCollabPermission] = useState('editor')
  const [startingValue, setStartingValue] = useState(String(plan?.startingValue ?? 0))
  const [defaultItems, setDefaultItems] = useState<DefaultItemForm[]>(plan?.defaultItems ?? [])
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'income' | 'expense'>('income')

  function handleAddItem() {
    if (!newItemName.trim())
      return
    setDefaultItems([...defaultItems, { name: newItemName.trim(), type: newItemType }])
    setNewItemName('')
  }

  function handleRemoveItem(index: number) {
    setDefaultItems(defaultItems.filter((_, i) => i !== index))
  }

  return (
    <div className="pt-6 pb-8">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
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
          编辑计划
        </h1>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconCheck size={16} />
          保存
        </button>
      </div>

      {/* Emoji Picker */}
      <div className="mb-5 flex justify-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl transition-shadow hover:shadow-md"
            style={{
              background: 'var(--color-surface-card)',
              borderColor: 'var(--color-hairline)',
            }}
          >
            {emoji}
          </button>
          {showEmojiPicker && (
            <div
              className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl border p-3 shadow-lg"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
              }}
            >
              <div className="grid grid-cols-5 gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEmoji(e)
                      setShowEmojiPicker(false)
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[var(--color-surface-soft)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Name */}
      <div className="mb-5">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          计划名称
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
            color: 'var(--color-ink)',
          }}
        />
      </div>

      {/* Members */}
      <div className="mb-5">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          成员
        </label>
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div
              key={`${m.letter}-${m.name}`}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: m.color }}
              >
                {m.letter}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {m.name}
              </span>
              <span
                className="ml-auto text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                {m.role === 'owner' ? '所有者' : '编辑者'}
              </span>
            </div>
          ))}
          <button
            type="button"
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm transition-colors"
            style={{
              borderColor: 'var(--color-hairline)',
              color: 'var(--color-primary)',
            }}
          >
            <IconPlus size={16} />
            邀请成员
          </button>
        </div>
      </div>

      {/* Collaboration Permission */}
      <div className="mb-5">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          协作权限
        </label>
        <select
          value={collabPermission}
          onChange={e => setCollabPermission(e.target.value)}
          className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
            color: 'var(--color-ink)',
          }}
        >
          <option value="editor">编辑者 — 可添加和编辑记录</option>
          <option value="viewer">查看者 — 仅可查看</option>
        </select>
      </div>

      {/* Starting Value */}
      <div className="mb-5">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          起始数字
        </label>
        <input
          type="number"
          value={startingValue}
          onChange={e => setStartingValue(e.target.value)}
          className="h-10 w-full rounded-lg border px-3 font-[family-name:var(--font-mono)] text-sm outline-none"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: 'var(--color-hairline)',
            color: 'var(--color-ink)',
          }}
        />
      </div>

      {/* Default Items */}
      <div className="mb-5">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          默认项目
        </label>
        <div className="flex flex-col gap-2">
          {defaultItems.map((item, i) => (
            <div
              key={`${item.name}-${item.type}`}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
              }}
            >
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                style={{
                  background: item.type === 'income' ? 'var(--color-success)' : 'var(--color-error)',
                  color: '#fff',
                  opacity: 0.85,
                }}
              >
                {item.type === 'income' ? '收入' : '支出'}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(i)}
                className="ml-auto rounded p-1 transition-colors"
                style={{ color: 'var(--color-muted)' }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}

          {/* Add form */}
          <div
            className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <select
              value={newItemType}
              onChange={e => setNewItemType(e.target.value as 'income' | 'expense')}
              className="h-8 rounded-md border px-2 text-xs outline-none"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
                color: 'var(--color-ink)',
              }}
            >
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="项目名称"
              className="h-8 flex-1 rounded-md border px-2 text-xs outline-none"
              style={{
                background: 'var(--color-surface-card)',
                borderColor: 'var(--color-hairline)',
                color: 'var(--color-ink)',
              }}
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--color-primary)' }}
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
