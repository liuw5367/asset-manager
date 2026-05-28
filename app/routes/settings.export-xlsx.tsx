import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { generateExportXlsx } from '~/lib/backup.server'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    throw redirect('/login', { headers })

  const buf = await generateExportXlsx(user.id)

  return new Response(buf as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="holdly-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
