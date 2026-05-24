import type { Route } from './+types/payment-types'
import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Form, redirect, useLoaderData, useNavigation } from 'react-router'
import { SubPageHeader } from '~/components/page-header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  createSettingsPaymentType,
  getSettingsPaymentTypesByUserId,
  softDeleteSettingsPaymentType,
  updateSettingsPaymentType,
} from '~/db/queries/settings'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const paymentTypes = await getSettingsPaymentTypesByUserId(user.id)
  return { paymentTypes }
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login')

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'create') {
    const name = String(formData.get('name') || '').trim()
    if (!name)
      return { ok: false, intent, error: '支付类型名称不能为空' }

    await createSettingsPaymentType(user.id, { name })
    return { ok: true, intent }
  }

  if (intent === 'update') {
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    if (!id || !name)
      return { ok: false, intent, error: '参数不完整' }

    await updateSettingsPaymentType(user.id, id, { name })
    return { ok: true, intent }
  }

  if (intent === 'delete') {
    const id = String(formData.get('id') || '')
    if (!id)
      return { ok: false, intent, error: '参数不完整' }

    await softDeleteSettingsPaymentType(user.id, id)
    return { ok: true, intent }
  }

  return { ok: false, intent, error: '不支持的操作' }
}

export default function PaymentTypesPage() {
  const { paymentTypes } = useLoaderData<typeof loader>()
  const navigation = useNavigation()

  const [newName, setNewName] = useState('')
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
      <SubPageHeader backTo="/settings" backLabel="设置" title="支付类型管理" />

      <Form
        method="post"
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--color-surface-card)' }}
        onSubmit={() => setNewName('')}
      >
        <input type="hidden" name="intent" value="create" />
        <div className="flex items-center gap-3">
          <Input
            name="name"
            placeholder="支付类型名称"
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
        {paymentTypes.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom:
                i < paymentTypes.length - 1
                  ? '1px solid var(--color-hairline)'
                  : undefined,
            }}
          >
            {editingId === item.id
              ? (
                  <>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-9"
                      autoFocus
                    />
                    <Form method="post">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="name" value={editName} />
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant="ghost"
                        disabled={!editName.trim() || isUpdatingCurrent(item.id)}
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
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditName(item.name)
                      }}
                    >
                      <IconPencil />
                    </Button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant="ghost"
                        disabled={item.isPreset || isDeletingCurrent(item.id)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        {isDeletingCurrent(item.id) ? <IconLoader2 className="animate-spin" /> : <IconTrash />}
                      </Button>
                    </Form>
                  </>
                )}
          </div>
        ))}
      </div>
    </div>
  )
}
