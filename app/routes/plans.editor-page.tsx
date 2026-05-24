import type { PlanEditorLoaderData } from './plans.shared'
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PublicAvatar } from '~/components/public-avatar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { buildPlanAvatarToneMap } from '~/lib/plan-avatar'

interface PlanEditorActionData {
  error?: string
  inviteLink?: string | null
  inviteExpiresAt?: string | null
}

interface PlanEditorPageProps {
  data: PlanEditorLoaderData
  actionData?: PlanEditorActionData
  isSubmitting: boolean
  onSubmitSave: (payload: unknown) => void
  onRegenerateInvite: () => void
  onRevokeInvite: () => void
}

interface EditableMember {
  userId: string
  role: 'owner' | 'editor'
  note: string
  displayName: string
  avatarEmoji: string
}

interface EditableDefaultItem {
  id: string
  name: string
  itemType: 'income' | 'expense'
}

const emojiOptions = ['💰', '📊', '🏠', '💼', '🎯', '🛒', '✈️', '🎓', '🎮', '🏥', '🚗', '📱', '🏋️', '🎨']

export function PlanEditorPage({
  data,
  actionData,
  isSubmitting,
  onSubmitSave,
  onRegenerateInvite,
  onRevokeInvite,
}: PlanEditorPageProps) {
  const [emoji, setEmoji] = useState(data.emoji)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [name, setName] = useState(data.name)
  const [planMode, setPlanMode] = useState<'accumulate' | 'snapshot'>(data.planMode)
  const [permission, setPermission] = useState<'own' | 'all'>(data.permission)
  const [startingValue, setStartingValue] = useState(data.startingValue)
  const [members, setMembers] = useState<EditableMember[]>(data.members)
  const [defaultItems, setDefaultItems] = useState<EditableDefaultItem[]>(
    data.defaultItems.map(item => ({
      id: item.id,
      name: item.name,
      itemType: item.itemType,
    })),
  )
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'income' | 'expense'>('income')

  const inviteLink = actionData?.inviteLink ?? data.inviteLink
  const inviteExpiresAt = actionData?.inviteExpiresAt ?? data.inviteExpiresAt

  const canManageMembers = data.canManage
  const memberToneMap = useMemo(
    () => buildPlanAvatarToneMap(members.map(member => member.userId)),
    [members],
  )

  function updateMemberNote(userId: string, note: string) {
    setMembers(prev => prev.map(member => member.userId === userId ? { ...member, note } : member))
  }

  function removeDefaultItem(id: string) {
    setDefaultItems(prev => prev.filter(item => item.id !== id))
  }

  function addDefaultItem() {
    if (!newItemName.trim())
      return

    setDefaultItems(prev => [...prev, {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newItemName.trim(),
      itemType: newItemType,
    }])
    setNewItemName('')
  }

  const payload = useMemo(() => {
    return {
      name,
      emoji,
      planMode,
      permission,
      startingValue,
      members: members.map(member => ({
        userId: member.userId,
        role: member.role,
        note: member.note,
      })),
      defaultItems: defaultItems.map((item, index) => ({
        id: item.id.startsWith('new-') ? undefined : item.id,
        name: item.name,
        itemType: item.itemType,
        sortOrder: index,
      })),
    }
  }, [name, emoji, planMode, permission, startingValue, members, defaultItems])

  return (
    <div className="pt-6 pb-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={data.mode === 'create' ? '/plans' : `/plans/${data.planId}`}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <IconArrowLeft size={16} />
          返回
        </Link>
        <h1 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {data.mode === 'create' ? '新建计划' : '编辑计划'}
        </h1>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
          onClick={() => onSubmitSave(payload)}
          disabled={isSubmitting}
        >
          <IconCheck size={16} />
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="mb-5 flex justify-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl transition-shadow hover:shadow-md"
            style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
          >
            {emoji}
          </button>
          {showEmojiPicker && (
            <div
              className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl border p-3 shadow-lg"
              style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
            >
              <div className="grid grid-cols-5 gap-2">
                {emojiOptions.map(e => (
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

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          计划名称
        </label>
        <Input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          成员
        </label>
        <div className="flex flex-col gap-2">
          {members.map(member => (
            <div
              key={member.userId}
              className="rounded-lg border px-3 py-2.5"
              style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <PublicAvatar
                  emoji={member.avatarEmoji}
                  nickname={member.displayName}
                  size="md"
                  backgroundColor={memberToneMap.get(member.userId)?.backgroundColor}
                  textColor={memberToneMap.get(member.userId)?.textColor}
                />
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  {member.displayName}
                </span>
                <span className="ml-auto text-xs" style={{ color: 'var(--color-muted)' }}>
                  {member.role === 'owner' ? '所有者' : '编辑者'}
                </span>
              </div>
              <Input
                value={member.note}
                onChange={e => updateMemberNote(member.userId, e.target.value)}
                placeholder="成员备注（可选）"
                className="h-8 text-xs"
                disabled={!canManageMembers}
              />
            </div>
          ))}
        </div>
      </div>

      {data.mode === 'edit' && data.canManage && (
        <div className="mb-5 rounded-lg border p-3" style={{ borderColor: 'var(--color-hairline)', background: 'var(--color-surface-card)' }}>
          <div className="mb-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            邀请成员
          </div>
          {inviteLink
            ? (
                <>
                  <Input value={inviteLink} readOnly className="mb-2 h-9 text-xs" onClick={e => e.currentTarget.select()} />
                  <div className="mb-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                    有效期至：
                    {inviteExpiresAt ? new Date(inviteExpiresAt).toLocaleString('zh-CN') : '--'}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-8" onClick={async () => await navigator.clipboard.writeText(inviteLink)}>
                      复制链接
                    </Button>
                    <Button type="button" variant="destructive" className="h-8" onClick={onRevokeInvite} disabled={isSubmitting}>
                      吊销链接
                    </Button>
                    <Button type="button" variant="outline" className="h-8" onClick={onRegenerateInvite} disabled={isSubmitting}>
                      重新生成
                    </Button>
                  </div>
                </>
              )
            : (
                <Button type="button" className="h-9" onClick={onRegenerateInvite} disabled={isSubmitting}>
                  生成邀请链接（30天有效）
                </Button>
              )}
        </div>
      )}

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          记录模式
        </label>
        <Select value={planMode} onValueChange={v => setPlanMode((v || 'accumulate') as 'accumulate' | 'snapshot')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择模式">
              {(value) => {
                if (value === 'snapshot')
                  return '总额记录'
                return '收支累加'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="accumulate">收支累加</SelectItem>
              <SelectItem value="snapshot">总额记录</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          协作权限
        </label>
        <Select value={permission} onValueChange={v => setPermission((v || 'own') as 'own' | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择权限">
              {(value) => {
                if (value === 'all')
                  return '成员可以编辑全部条目'
                return '成员只能编辑自己的条目'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="own">成员只能编辑自己的条目</SelectItem>
              <SelectItem value="all">成员可以编辑全部条目</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          起始数字
        </label>
        <Input
          type="number"
          value={startingValue}
          onChange={e => setStartingValue(e.target.value)}
          className="h-10 font-[family-name:var(--font-mono)]"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          默认项目
        </label>
        <div className="flex flex-col gap-2">
          {defaultItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
              style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-hairline)' }}
            >
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: item.itemType === 'income' ? 'var(--color-success)' : 'var(--color-error)', color: '#fff', opacity: 0.85 }}>
                {item.itemType === 'income' ? '收入' : '支出'}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.name}</span>
              <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={() => removeDefaultItem(item.id)}>
                <IconTrash size={14} />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5" style={{ borderColor: 'var(--color-hairline)' }}>
            <Select value={newItemType} onValueChange={v => setNewItemType((v || 'income') as 'income' | 'expense')}>
              <SelectTrigger className="h-9 w-20">
                <SelectValue>{value => value === 'expense' ? '支出' : '收入'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="income">收入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="项目名称"
              className="h-9 flex-1"
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={addDefaultItem}>
              <IconPlus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {actionData?.error && (
        <div className="text-sm" style={{ color: 'var(--color-error)' }}>
          {actionData.error}
        </div>
      )}
    </div>
  )
}
