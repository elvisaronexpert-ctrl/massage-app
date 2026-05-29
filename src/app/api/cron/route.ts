import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendReminderEmail, looksLikeEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Roda toda quarta às 13h UTC — envia lembretes matinais para todos os agendamentos do dia
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: rows } = await supabaseAdmin
    .from('appointments')
    .select('id, slot_time, appointment_date, employees(name, identifier)')
    .eq('appointment_date', todayStr)
    .eq('status', 'pending')
    .eq('reminder_sent', false)

  let sent = 0
  for (const row of rows ?? []) {
    const emp = row.employees as { name: string; identifier: string } | null
    if (emp && looksLikeEmail(emp.identifier)) {
      const ok = await sendReminderEmail(emp.identifier, emp.name, row.slot_time.slice(0, 5), row.appointment_date)
      if (ok) sent++
    }
    await supabaseAdmin.from('appointments').update({ reminder_sent: true }).eq('id', row.id)
  }

  return NextResponse.json({ processed: rows?.length ?? 0, sent })
}
