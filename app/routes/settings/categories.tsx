import type { Route } from './+types/categories'
import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import EmojiPicker from 'emoji-picker-react'
import { useMemo, useState } from 'react'
import { data, Form, redirect, useLoaderData, useNavigation } from 'react-router'
import { SubPageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  createSettingsCategory,
  getSettingsCategoriesByUserId,
  softDeleteSettingsCategory,
  updateSettingsCategory,
} from '~/db/queries/settings'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const categories = await getSettingsCategoriesByUserId(user.id)
  return data({ categories }, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'create') {
    const name = String(formData.get('name') || '').trim()
    const emoji = String(formData.get('emoji') || '📦').trim() || '📦'
    if (!name)
      return data({ ok: false, intent, error: '分类名称不能为空' }, { headers })

    await createSettingsCategory(user.id, { name, emoji })
    return data({ ok: true, intent }, { headers })
  }

  if (intent === 'update') {
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    if (!id || !name)
      return data({ ok: false, intent, error: '参数不完整' }, { headers })

    await updateSettingsCategory(user.id, id, { name })
    return data({ ok: true, intent }, { headers })
  }

  if (intent === 'delete') {
    const id = String(formData.get('id') || '')
    if (!id)
      return data({ ok: false, intent, error: '参数不完整' }, { headers })

    await softDeleteSettingsCategory(user.id, id)
    return data({ ok: true, intent }, { headers })
  }

  return data({ ok: false, intent, error: '不支持的操作' }, { headers })
}

export default function CategoriesPage() {
  const { categories } = useLoaderData<typeof loader>()
  const navigation = useNavigation()

  const [newEmoji, setNewEmoji] = useState('📦')
  const [newName, setNewName] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const pendingIntent = String(navigation.formData?.get('intent') || '')
  const pendingId = String(navigation.formData?.get('id') || '')
  const isCreating = navigation.state !== 'idle' && pendingIntent === 'create'
  const isUpdatingCurrent = (id: string) => navigation.state !== 'idle' && pendingIntent === 'update' && pendingId === id
  const isDeletingCurrent = (id: string) => navigation.state !== 'idle' && pendingIntent === 'delete' && pendingId === id

  const canSubmitCreate = useMemo(() => newName.trim().length > 0 && !isCreating, [isCreating, newName])

  return (
    <div className="pb-8 pt-3">
      <SubPageHeader backTo="/settings" backLabel="设置" title="分类管理" />

      <Form
        method="post"
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
        onSubmit={() => {
          setNewName('')
          setNewEmoji('📦')
        }}
      >
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="emoji" value={newEmoji} />
        <div className="flex items-center gap-3">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger render={<Button type="button" variant="secondary" size="icon" className="text-xl" />}>
              {newEmoji}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="start">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setNewEmoji(emojiData.emoji)
                  setEmojiOpen(false)
                }}
                lazyLoadEmojis
                skinTonesDisabled
                width={320}
                height={360}
              />
            </PopoverContent>
          </Popover>

          <Input
            name="name"
            placeholder="分类名称"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={!canSubmitCreate}>
            {isCreating ? <IconLoader2 className="animate-spin" /> : <IconPlus />}
            新增
          </Button>
        </div>
      </Form>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
      >
        {categories.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom:
                i < categories.length - 1
                  ? '1px solid var(--color-hairline)'
                  : undefined,
            }}
          >
            <span className="text-lg">{item.emoji}</span>
            {editingId === item.id
              ? (
                  <>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape')
                          setEditingId(null)
                      }}
                      className="h-9"
                      autoFocus
                    />
                    <Form method="post" className="flex items-center">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="name" value={editName} />
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant="ghost"
                        disabled={!editName.trim() || isUpdatingCurrent(item.id)}
                        style={{ color: 'var(--color-primary)' }}
                        onClick={() => {
                          if (editName.trim())
                            setEditingId(null)
                        }}
                      >
                        {isUpdatingCurrent(item.id) ? <IconLoader2 className="animate-spin" /> : <IconCheck />}
                      </Button>
                    </Form>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      style={{ color: 'var(--color-primary)' }}
                      onClick={() => setEditingId(null)}
                    >
                      <IconX />
                    </Button>
                  </>
                )
              : (
                  <>
                    <span
                      className="min-w-0 flex-1 truncate text-sm"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {item.name}
                    </span>
                    {item.isPreset && <Badge variant="secondary">预置</Badge>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        style={{ color: 'var(--color-primary)' }}
                        onClick={() => {
                          setEditingId(item.id)
                          setEditName(item.name)
                        }}
                      >
                        <IconPencil />
                      </Button>
                      <Form method="post" className="flex items-center">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={item.id} />
                        <Button
                          type="submit"
                          size="icon-sm"
                          variant="ghost"
                          disabled={isDeletingCurrent(item.id)}
                          style={{ color: 'var(--color-error)' }}
                        >
                          {isDeletingCurrent(item.id) ? <IconLoader2 className="animate-spin" /> : <IconTrash />}
                        </Button>
                      </Form>
                    </div>
                  </>
                )}
          </div>
        ))}
      </div>
    </div>
  )
}
