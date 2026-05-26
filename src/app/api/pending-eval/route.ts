import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const identifier = req.nextUrl.searchParams.get('identifier')?.trim().toLowerCase() ?? ''
  if (!identifier) return NextResponse.json({ pending: [] })

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('id, appointment_date, slot_time, employees!inner(identifier), evaluations(id)')
    .eq('employees.identifier', identifier)
    .eq('status', 'completed')
    .is('evaluations.id', null)
    .order('appointment_date', { ascending: false })
    .limit(5)

  return NextResponse.json({
    pending: (data ?? []).map((r) => ({
      id: r.id,
      appointment_date: r.appointment_date,
      slot_time: r.slot_time.slice(0, 5),
    })),
  })
}
