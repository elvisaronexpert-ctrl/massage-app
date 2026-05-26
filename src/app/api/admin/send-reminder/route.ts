import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/auth'
import { sendReminderEmail, looksLikeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  if (!await getAdminFromRequest(req))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  if (process.env.EMAIL_ENABLED !== 'true')
    return NextResponse.json({ error: 'E-mail não configurado.' }, { status: 400 })

  const { appointment_id } = await req.json()

  const { data: row } = await supabaseAdmin
    .from('appointments')
    .select('id, slot_time, appointment_date, employees(name, identifier)')
    .eq('id', appointment_id)
    .single()
  if (!row) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  const emp = row.employees as { name: string; identifier: string } | null
  if (!emp || !looksLikeEmail(emp.identifier))
    return NextResponse.json({ error: 'Identificador não é e-mail válido.' }, { status: 400 })

  const ok = await sendReminderEmail(emp.identifier, emp.name, row.slot_time.slice(0, 5), row.appointment_date)
  if (!ok) return NextResponse.json({ error: 'Falha ao enviar. Verifique as credenciais Gmail.' }, { status: 500 })

  await supabaseAdmin.from('appointments').update({ reminder_sent: true }).eq('id', appointment_id)
  return NextResponse.json({ success: true, message: `Lembrete enviado para ${emp.identifier}.` })
}
