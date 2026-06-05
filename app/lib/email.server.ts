import process from 'node:process'

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailInput {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping email send')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Holdly <notifications@holdly.app>',
      to: input.to,
      subject: input.subject,
      ...(input.text ? { text: input.text } : {}),
      ...(input.html ? { html: input.html } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[email] failed to send:', body)
    return { ok: false, error: body.message || 'Failed to send email' }
  }

  return { ok: true }
}
