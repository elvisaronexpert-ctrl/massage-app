import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/auth'
import { sendEvalEmail } from '@/lib/email'
import { looksLikeEmail } from '@/lib/email'

const VALID_STATUSES = ['pending', 'completed', 'no_show']

export async function POST(req: NextRequest) {
  if (!await getAdminFromRequest(req))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const data = await req.json()
  const { appointment_id, status, therapist_note } = data

  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  if (therapist_note !== undefined) update.therapist_note = therapist_note

  const { error } = await supabaseAdmin
    .from('appointments')
    .update(update)
    .eq('id', appointment_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'completed' && process.env.EMAIL_ENABLED === 'true') {
    const { data: row } = await supabaseAdmin
      .from('appointments')
      .select('slot_time, appointment_date, employees(name, identifier)')
      .eq('id', appointment_id)
      .single()

    if (row) {
      const emp = row.employees as { name: string; identifier: string } | null
      if (emp && looksLikeEmail(emp.identifier)) {
        sendEvalEmail(emp.identifier, emp.name, row.slot_time.slice(0, 5), row.appointment_date)
          .catch(console.error)
      }
    }
  }

  return NextResponse.json({ success: true })
}
