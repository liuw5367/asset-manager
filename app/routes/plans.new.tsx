import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

const emojiOptions = ['💰', '📊', '🏠', '💼', '🎯', '🛒', '✈️', '🎓', '🎮', '🏥', '🚗', '📱', '🏋️', '🎨']

export default function PlansNew() {
  const navigate = useNavigate()
  const [emoji, setEmoji] = useState('💰')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  return (
    <div>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between py-3"
        style={{ background: 'var(--color-canvas)' }}
      >
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          ‹ 返回
        </button>
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          新建计划
        </span>
        <button
          onClick={() => navigate('/plans')}
          className="text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          保存
        </button>
      </div>

      {/* Emoji */}
      <div className="flex flex-col items-center py-2 pb-4">
        <div
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-lg text-[30px]"
          style={{ background: 'var(--color-primary-muted)' }}
        >
          {emoji}
        </div>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="mt-2 text-xs font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          选择图标
        </button>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div
          className="mb-4 rounded-lg p-3"
          style={{ background: 'var(--color-surface-card)' }}
        >
          <div className="grid grid-cols-7 gap-1">
            {emojiOptions.map(e => (
              <button
                key={e}
                onClick={() => {
                  setEmoji(e)
                  setShowEmojiPicker(false)
                }}
                className="rounded-md p-2 text-center text-2xl transition-colors"
                style={{
                  border: e === emoji ? '2px solid var(--color-primary)' : '1px solid var(--color-hairline)',
                  background: e === emoji ? 'var(--color-primary-muted)' : 'transparent',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan name */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        计划名称 *
      </label>
      <input
        className="mb-3 h-11 w-full rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        type="text"
        placeholder="例：家庭月度计划"
      />

      {/* Members */}
      <div className="mb-1 mt-5 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
        <span>成员</span>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
      </div>
      <div
        className="mb-3 rounded-lg p-4"
        style={{ background: 'var(--color-surface-card)' }}
      >
        <div
          className="flex items-center gap-2.5 border-b py-2"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            A
          </div>
          <span className="flex-1 text-[14px]" style={{ color: 'var(--color-ink)' }}>我</span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: 'var(--color-surface-strong)', color: 'var(--color-muted)' }}
          >
            创建者
          </span>
        </div>
        <button
          className="mt-2 text-xs font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          + 邀请成员
        </button>
      </div>

      {/* Permission */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        协作权限
      </label>
      <div className="relative mb-4">
        <select
          className="h-9 w-full cursor-pointer appearance-none rounded-md border px-3 pr-8 text-[14px] outline-none"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          defaultValue="own"
        >
          <option value="own">成员只能编辑自己的条目</option>
          <option value="all">成员可以编辑全部条目</option>
        </select>
        <IconChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
      </div>

      {/* Starting value */}
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        起始数字
      </label>
      <div className="mb-4 flex items-center gap-2">
        <input
          className="h-11 flex-1 rounded-[10px] border px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="number"
          placeholder="净值起始值"
          defaultValue={0}
        />
        <span className="whitespace-nowrap text-xs" style={{ color: 'var(--color-muted)' }}>
          每月净值 = 起始 + 当月净收入
        </span>
      </div>

      {/* Default items */}
      <div className="mb-1 mt-5 flex items-center gap-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
        <span>默认子项</span>
        <div className="h-px flex-1" style={{ background: 'var(--color-hairline)' }} />
      </div>
      <div className="mb-6 flex gap-2">
        <input
          className="h-9 flex-1 rounded-md border px-3 text-[14px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--color-primary-muted)]"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          type="text"
          placeholder="子项名称"
        />
        <div className="relative w-[90px]">
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-md border px-3 pr-7 text-[13px] outline-none"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            defaultValue="income"
          >
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
          <IconChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
        </div>
        <button
          className="h-9 rounded-md border px-3 text-[13px] transition-colors"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-body)' }}
        >
          添加
        </button>
      </div>
    </div>
  )
}
