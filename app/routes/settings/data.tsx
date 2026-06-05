import type { Route } from './+types/data'
import { IconCheck, IconDownload, IconLoader2, IconSend } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { data, redirect, useFetcher, useLoaderData } from 'react-router'
import { toast } from 'sonner'
import { SubPageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { getSettingsProfileByUserId, updateBackupConfig } from '~/db/queries/settings'
import { processUserBackup } from '~/lib/backup.server'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const profile = await getSettingsProfileByUserId(user.id)

  const hostname = new URL(request.url).hostname
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'

  return data({
    backupEnabled: profile?.backupEnabled ?? false,
    backupDayOfMonth: profile?.backupDayOfMonth ?? 1,
    backupFrequency: profile?.backupFrequency ?? 'monthly',
    isLocal,
  }, { headers })
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const formData = await request.formData()
  const intent = String(formData.get('intent') || '')

  if (intent === 'update_backup') {
    const backupEnabled = formData.get('backupEnabled') === 'true'
    const backupDayOfMonth = Number(formData.get('backupDayOfMonth') || 1)
    const backupFrequency = String(formData.get('backupFrequency') || 'monthly')

    await updateBackupConfig(user.id, { backupEnabled, backupDayOfMonth, backupFrequency })

    return data({ ok: true, intent, error: undefined, sent: 0 }, { headers })
  }

  if (intent === 'manual_backup') {
    try {
      const sent = await processUserBackup(user.id)
      return data({ ok: true, intent, error: undefined, sent }, { headers })
    }
    catch {
      return data({ ok: false, intent, error: '备份发送失败', sent: 0 }, { headers })
    }
  }

  return data({ ok: false, intent, error: '不支持的操作', sent: 0 }, { headers })
}

export default function DataPage() {
  const loaderData = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()

  const [backupEnabled, setBackupEnabled] = useState(loaderData.backupEnabled)
  const [backupDayOfMonth, setBackupDayOfMonth] = useState(loaderData.backupDayOfMonth)
  const [backupFrequency, setBackupFrequency] = useState(loaderData.backupFrequency)

  const [isExporting, setIsExporting] = useState(false)

  const isChecking = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'manual_backup'

  const hasChanges = backupEnabled !== loaderData.backupEnabled
    || backupDayOfMonth !== loaderData.backupDayOfMonth
    || backupFrequency !== loaderData.backupFrequency

  useEffect(() => {
    setBackupEnabled(loaderData.backupEnabled)
    setBackupDayOfMonth(loaderData.backupDayOfMonth)
    setBackupFrequency(loaderData.backupFrequency)
  }, [loaderData.backupEnabled, loaderData.backupDayOfMonth, loaderData.backupFrequency])

  useEffect(() => {
    if (fetcher.data?.ok === false)
      toast.error(fetcher.data.error)
  }, [fetcher.data])

  function saveBackup() {
    const fd = new FormData()
    fd.set('intent', 'update_backup')
    fd.set('backupEnabled', String(backupEnabled))
    fd.set('backupDayOfMonth', String(backupDayOfMonth))
    fd.set('backupFrequency', backupFrequency)
    fetcher.submit(fd, { method: 'post' })
  }

  const isSaving = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'update_backup'

  return (
    <div className="pb-8">
      <SubPageHeader backTo="/settings" backLabel="设置" title="数据备份" />

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-card)' }}>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>定时备份</div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>每月自动将数据通过邮件发送给你</div>
          </div>
          <Switch checked={backupEnabled} onCheckedChange={setBackupEnabled} />
        </div>

        {backupEnabled && (
          <>
            <div className="border-b" style={{ borderColor: 'var(--color-hairline)' }} />

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>发送频率</div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>目前仅支持每月备份</div>
              </div>
              <Select
                value={backupFrequency}
                onValueChange={v => v && setBackupFrequency(v)}
                disabled
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    {value => value === 'monthly' ? '每月' : value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">每月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-b" style={{ borderColor: 'var(--color-hairline)' }} />

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>发送日期</div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-soft)' }}>每月第几日发送备份邮件</div>
              </div>
              <Select
                value={String(backupDayOfMonth)}
                onValueChange={v => setBackupDayOfMonth(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue>
                    {value => `第 ${value} 日`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                      日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {hasChanges && (
          <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <Button
              variant="default"
              onClick={saveBackup}
              disabled={isSaving}
            >
              {isSaving
                ? <IconLoader2 size={14} className="animate-spin" />
                : <IconCheck size={14} data-icon="inline-start" />}
              保存设置
            </Button>
            {fetcher.data?.ok === true && (
              <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                已保存
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
          导出数据
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-muted-soft)' }}>
            导出所有数据为 xlsx 文件
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={isExporting}
            onClick={async () => {
              if (isExporting)
                return
              setIsExporting(true)
              try {
                const res = await fetch('/settings/export-xlsx')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `holdly-export-${new Date().toISOString().slice(0, 10)}.xlsx`
                a.click()
                URL.revokeObjectURL(url)
              }
              catch {
                toast.error('导出失败，请重试')
              }
              finally {
                setIsExporting(false)
              }
            }}
          >
            {isExporting
              ? <IconLoader2 size={14} className="animate-spin" />
              : <IconDownload size={14} data-icon="inline-start" />}
            导出数据
          </Button>
        </div>
      </div>

      {loaderData.isLocal && (
        <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          <h3
            className="mb-0.5 text-sm font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-muted-soft)' }}
          >
            手动备份
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-muted-soft)' }}>
              立即发送备份邮件
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const fd = new FormData()
                fd.set('intent', 'manual_backup')
                fetcher.submit(fd, { method: 'post' })
              }}
              disabled={isChecking}
            >
              {isChecking
                ? <IconLoader2 size={14} className="animate-spin" />
                : <IconSend size={14} data-icon="inline-start" />}
              立即备份
            </Button>
          </div>
          {fetcher.data?.ok === true && fetcher.data?.intent === 'manual_backup' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-success)' }}>
              {fetcher.data.sent > 0 ? '备份邮件已发送' : '没有发送备份邮件，请检查邮件服务配置'}
            </p>
          )}
          {fetcher.data?.ok === false && fetcher.data?.intent === 'manual_backup' && !isChecking && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>
              {fetcher.data.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
