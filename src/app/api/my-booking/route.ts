import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { nextWednesday } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const identifier = req.nextUrl.searchParams.get('identifier')?.trim().toLowerCase() ?? ''
  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()
  if (!identifier) return NextResponse.json({ booking: null })

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('id, slot_time, status, employees!inner(identifier)')
    .eq('employees.identifier', identifier)
    .eq('appointment_date', dateStr)
    .limit(1)
    .maybeSingle()

  if (!data) return NextResponse.json({ booking: null })
  return NextResponse.json({
    booking: data.slot_time.slice(0, 5),
    appointment_id: data.id,
    status: data.status,
  })
}
