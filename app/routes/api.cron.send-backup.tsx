import process from 'node:process'
import { format } from 'date-fns'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { profiles } from '~/db/schema'
import { generateBackupHtml } from '~/lib/backup.server'

export async function action({ request }: { request: Request }) {
  const secret = request.headers.get('x-cron-secret')
  const isCron = secret === process.env.CRON_SECRET || request.headers.get('x-cron-trigger') === 'true'

  if (!isCron) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const dayOfMonth = today.getDate()
  const todayStr = format(today, 'yyyy-MM-dd')

  const candidates = await db
    .select()
    .from(profiles)
    .where(eq(profiles.backupEnabled, true))

  let totalSent = 0

  for (const profile of candidates) {
    if (!profile.email)
      continue

    if (profile.backupDayOfMonth !== dayOfMonth)
      continue

    if (profile.backupFrequency !== 'monthly')
      continue

    try {
      const html = await generateBackupHtml(profile.id)

      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey)
        continue

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Holdly <notifications@holdly.app>',
          to: profile.email,
          subject: `Holdly 数据备份 - ${todayStr}`,
          html,
        }),
      })

      if (res.ok)
        totalSent++
    }
    catch {
      // skip user on failure
    }
  }

  return Response.json({ ok: true, sent: totalSent })
}
