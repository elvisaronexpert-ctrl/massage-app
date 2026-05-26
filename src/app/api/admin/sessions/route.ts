import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/auth'
import { nextWednesday } from '@/lib/slots'

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest(req))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()

  const { data } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, slot_time, status, therapist_note, reminder_sent,
      employees(name, identifier),
      evaluations(stars, energy_before, energy_after, comment)
    `)
    .eq('appointment_date', dateStr)
    .order('slot_time')

  const sessions = (data ?? []).map((r) => ({
    id: r.id,
    slot_time: r.slot_time.slice(0, 5),
    status: r.status,
    therapist_note: r.therapist_note,
    reminder_sent: r.reminder_sent,
    name: (r.employees as { name: string; identifier: string } | null)?.name ?? '',
    identifier: (r.employees as { name: string; identifier: string } | null)?.identifier ?? '',
    stars: (r.evaluations as { stars: number } | null)?.stars ?? null,
    energy_before: (r.evaluations as { energy_before: number } | null)?.energy_before ?? null,
    energy_after: (r.evaluations as { energy_after: number } | null)?.energy_after ?? null,
    eval_comment: (r.evaluations as { comment: string } | null)?.comment ?? null,
  }))

  return NextResponse.json({
    date: dateStr,
    sessions,
    email_enabled: process.env.EMAIL_ENABLED === 'true',
  })
}
