import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRotation } from '@/lib/rotation'
import { generateSlots, nextWednesday, MAX_PER_SLOT } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const identifier = req.nextUrl.searchParams.get('identifier')?.trim().toLowerCase() ?? ''
  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()

  if (!identifier) {
    return NextResponse.json({ allowed: true, group: '?', opens_at: null, message: null })
  }

  const result = await checkRotation(identifier, dateStr)

  const { count } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_date', dateStr)

  const total_slots = generateSlots().length * MAX_PER_SLOT
  return NextResponse.json({
    ...result,
    total_slots,
    total_booked: count ?? 0,
    available: total_slots - (count ?? 0),
  })
}
