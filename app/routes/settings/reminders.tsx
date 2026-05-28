import type { Route } from './+types/reminders'
import process from 'node:process'
import { IconCheck, IconLoader2, IconSend } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { data, redirect, useFetcher, useLoaderData } from 'react-router'
import { SubPageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { getSettingsProfileByUserId, updateSettingsReminderConfig } from '~/db/queries/settings'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const profile = await getSettingsProfileByUserId(user.id)

  return data({
    reminderEnabled: profile?.reminderEnabled ?? true,
    reminderSubscriptionDays: profile?.reminderSubscriptionDays ?? 7,
    reminderWarrantyDays: profile?.reminderWarrantyDays ?? 14,
  }, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'update_reminder') {
    const reminderEnabled = formData.get('reminderEnabled') === 'true'
    const reminderSubscriptionDays = Number(formData.get('reminderSubscriptionDays') || 7)
    const reminderWarrantyDays = Number(formData.get('reminderWarrantyDays') || 14)

    await updateSettingsReminderConfig(user.id, {
      reminderEnabled,
      reminderSubscriptionDays,
      reminderWarrantyDays,
    })

    return data({ ok: true, intent, error: undefined, sent: 0 }, { headers })
  }

  if (intent === 'manual_reminder_check') {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${request.headers.get('host') || 'localhost:5173'}`

    try {
      const res = await fetch(`${baseUrl}/api/cron/send-reminders`, {
        method: 'POST',
        headers: { Cookie: request.headers.get('Cookie') || '' },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return data({ ok: false, intent, error: body.error || '检查失败', sent: 0 }, { headers })
      }

      const body = await res.json() as { sent?: number }
      return data({ ok: true, intent, error: undefined, sent: body.sent ?? 0 }, { headers })
    }
    catch {
      return data({ ok: false, intent, error: '无法连接到提醒服务', sent: 0 }, { headers })
    }
  }

  return data({ ok: false, intent, error: '不支持的操作', sent: 0 }, { headers })
}

export default function RemindersPage() {
  const loaderData = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()

  const [reminderEnabled, setReminderEnabled] = useState(loaderData.reminderEnabled)
  const [reminderSubscriptionDays, setReminderSubscriptionDays] = useState(loaderData.reminderSubscriptionDays)
  const [reminderWarrantyDays, setReminderWarrantyDays] = useState(loaderData.reminderWarrantyDays)

  const hasChanges = reminderEnabled !== loaderData.reminderEnabled
    || reminderSubscriptionDays !== loaderData.reminderSubscriptionDays
    || reminderWarrantyDays !== loaderData.reminderWarrantyDays

  useEffect(() => {
    setReminderEnabled(loaderData.reminderEnabled)
    setReminderSubscriptionDays(loaderData.reminderSubscriptionDays)
    setReminderWarrantyDays(loaderData.reminderWarrantyDays)
  }, [loaderData.reminderEnabled, loaderData.reminderSubscriptionDays, loaderData.reminderWarrantyDays])

  function saveReminder() {
    const fd = new FormData()
    fd.set('intent', 'update_reminder')
    fd.set('reminderEnabled', String(reminderEnabled))
    fd.set('reminderSubscriptionDays', String(reminderSubscriptionDays))
    fd.set('reminderWarrantyDays', String(reminderWarrantyDays))
    fetcher.submit(fd, { method: 'post' })
  }

  const isSaving = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'update_reminder'
  const isChecking = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'manual_reminder_check'

  return (
    <div className="pb-8">
      <SubPageHeader backTo="/settings" backLabel="设置" title="提醒设置" />

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-card)' }}>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>启用邮件提醒</div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>关闭后所有资产都不会发送提醒</div>
          </div>
          <Switch checked={reminderEnabled} onCheckedChange={v => setReminderEnabled(v)} />
        </div>

        <div className="border-b" style={{ borderColor: 'var(--color-hairline)' }} />

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>订阅续费提醒</div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>到期前发送邮件通知</div>
          </div>
          <Select
            value={String(reminderSubscriptionDays)}
            onValueChange={v => setReminderSubscriptionDays(Number(v))}
            disabled={!reminderEnabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue>
                {value => `${value} 天前`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 天前</SelectItem>
              <SelectItem value="7">7 天前</SelectItem>
              <SelectItem value="14">14 天前</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-b" style={{ borderColor: 'var(--color-hairline)' }} />

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>保修到期提醒</div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>保修到期前发送邮件通知</div>
          </div>
          <Select
            value={String(reminderWarrantyDays)}
            onValueChange={v => setReminderWarrantyDays(Number(v))}
            disabled={!reminderEnabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue>
                {value => `${value} 天前`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 天前</SelectItem>
              <SelectItem value="14">14 天前</SelectItem>
              <SelectItem value="30">30 天前</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasChanges && (
          <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <Button
              variant="default"
              onClick={saveReminder}
              disabled={isSaving}
            >
              {isSaving
                ? <IconLoader2 size={14} className="animate-spin" />
                : <IconCheck size={14} data-icon="inline-start" />}
              保存设置
            </Button>
            {fetcher.data?.ok === true && fetcher.data?.intent === 'update_reminder' && (
              <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                已保存
              </span>
            )}
            {fetcher.data?.ok === false && (
              <span className="text-sm" style={{ color: 'var(--color-error)' }}>
                {fetcher.data.error}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-card)' }}>
        <h3
          className="mb-0.5 text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-muted-soft)' }}
        >
          手动检查
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-muted-soft)' }}>
            立即发送待处理的邮件提醒通知
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const fd = new FormData()
              fd.set('intent', 'manual_reminder_check')
              fetcher.submit(fd, { method: 'post' })
            }}
            disabled={isChecking || !reminderEnabled}
          >
            {isChecking
              ? <IconLoader2 size={14} className="animate-spin" />
              : <IconSend size={14} data-icon="inline-start" />}
            立即检查
          </Button>
        </div>
        {fetcher.data?.ok === true && fetcher.data?.intent === 'manual_reminder_check' && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-success)' }}>
            {`已发送 ${fetcher.data.sent} 封提醒`}
          </p>
        )}
        {fetcher.data?.ok === false && !isChecking && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>
            {fetcher.data.error}
          </p>
        )}
      </div>
    </div>
  )
}
