import type { Route } from './+types/tags'
import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { data, Form, redirect, useLoaderData, useNavigation } from 'react-router'
import { SubPageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  createSettingsTag,
  getSettingsTagsByUserId,
  softDeleteSettingsTag,
  updateSettingsTag,
} from '~/db/queries/settings'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const tags = await getSettingsTagsByUserId(user.id)
  return data({ tags }, { headers })
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
    const color = String(formData.get('color') || '#cc785c').trim() || '#cc785c'
    if (!name)
      return data({ ok: false, intent, error: '标签名称不能为空' }, { headers })

    await createSettingsTag(user.id, { name, color })
    return data({ ok: true, intent }, { headers })
  }

  if (intent === 'update') {
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    const color = String(formData.get('color') || '').trim()
    if (!id || !name)
      return data({ ok: false, intent, error: '参数不完整' }, { headers })

    await updateSettingsTag(user.id, id, { name, ...(color ? { color } : {}) })
    return data({ ok: true, intent }, { headers })
  }

  if (intent === 'delete') {
    const id = String(formData.get('id') || '')
    if (!id)
      return data({ ok: false, intent, error: '参数不完整' }, { headers })

    await softDeleteSettingsTag(user.id, id)
    return data({ ok: true, intent }, { headers })
  }

  return data({ ok: false, intent, error: '不支持的操作' }, { headers })
}

function ColorPicker({ value, onChange }: { value: string, onChange: (color: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger
        render={(
          <Button type="button" variant="secondary" size="icon" className="shrink-0" />
        )}
      >
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: value }} />
      </PopoverTrigger>
      <PopoverContent className="w-[220px]">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--color-hairline)]"
          />
          <Input value={value} onChange={e => onChange(e.target.value)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function TagsPage() {
  const { tags } = useLoaderData<typeof loader>()
  const navigation = useNavigation()

  const [newColor, setNewColor] = useState('#cc785c')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#cc785c')

  const pendingIntent = String(navigation.formData?.get('intent') || '')
  const pendingId = String(navigation.formData?.get('id') || '')
  const isCreating = navigation.state !== 'idle' && pendingIntent === 'create'
  const isUpdatingCurrent = (id: string) => navigation.state !== 'idle' && pendingIntent === 'update' && pendingId === id
  const isDeletingCurrent = (id: string) => navigation.state !== 'idle' && pendingIntent === 'delete' && pendingId === id

  const canSubmitCreate = useMemo(() => newName.trim().length > 0 && !isCreating, [isCreating, newName])

  return (
    <div className="pb-8 pt-3">
      <SubPageHeader backTo="/settings" backLabel="设置" title="标签管理" />

      <Form
        method="post"
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
        onSubmit={() => {
          setNewName('')
          setNewColor('#cc785c')
        }}
      >
        <input type="hidden" name="intent" value="create" />
        <input type="hidden" name="color" value={newColor} />

        <div className="flex items-center gap-3">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Input
            name="name"
            placeholder="标签名称"
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
        {tags.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom:
                i < tags.length - 1
                  ? '1px solid var(--color-hairline)'
                  : undefined,
            }}
          >
            {editingId === item.id
              ? (
                  <>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-9"
                      autoFocus
                    />
                    <Form method="post" className="flex items-center">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="name" value={editName} />
                      <input type="hidden" name="color" value={editColor} />
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
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="min-w-0 flex-1 truncate text-sm"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-surface-strong)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      {item.assetCount}
                      {' '}
                      个资产
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        style={{ color: 'var(--color-primary)' }}
                        onClick={() => {
                          setEditingId(item.id)
                          setEditName(item.name)
                          setEditColor(item.color)
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
