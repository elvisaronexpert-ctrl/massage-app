import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/auth'
import { generateSlots, nextWednesday, MAX_PER_SLOT } from '@/lib/slots'

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest(req))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()
  const target = new Date(dateStr + 'T12:00:00')
  const prevWed = new Date(target)
  prevWed.setDate(target.getDate() - 7)
  const prevStr = prevWed.toISOString().split('T')[0]

  const { count: groupB } = await supabaseAdmin
    .from('appointments')
    .select('employee_id', { count: 'exact', head: true })
    .eq('appointment_date', prevStr)
    .neq('status', 'no_show')

  const { count: bookedThisWeek } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_date', dateStr)

  const total_slots = generateSlots().length * MAX_PER_SLOT
  const mondayOpen = new Date(target); mondayOpen.setDate(target.getDate() - 2); mondayOpen.setHours(9, 0, 0, 0)
  const tuesdayOpen = new Date(target); tuesdayOpen.setDate(target.getDate() - 1); tuesdayOpen.setHours(9, 0, 0, 0)

  return NextResponse.json({
    date: dateStr,
    prev_wednesday: prevStr,
    group_b_count: groupB ?? 0,
    booked_this_week: bookedThisWeek ?? 0,
    total_slots,
    available: total_slots - (bookedThisWeek ?? 0),
    window_group_a: mondayOpen.toISOString(),
    window_group_b: tuesdayOpen.toISOString(),
  })
}
