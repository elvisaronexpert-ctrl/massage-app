import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSlots, nextWednesday, isWednesday, MAX_PER_SLOT } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()
  if (!isWednesday(dateStr))
    return NextResponse.json({ error: 'Apenas quartas-feiras são permitidas.' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('slot_time, employees(name)')
    .eq('appointment_date', dateStr)
    .order('slot_time')

  const grouped: Record<string, string[]> = {}
  for (const r of data ?? []) {
    const t = r.slot_time.slice(0, 5)
    const name = (r.employees as { name: string } | null)?.name ?? ''
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(name)
  }

  const slots = generateSlots().map((s) => ({
    time: s,
    booked: grouped[s]?.length ?? 0,
    available: MAX_PER_SLOT - (grouped[s]?.length ?? 0),
    full: (grouped[s]?.length ?? 0) >= MAX_PER_SLOT,
    names: grouped[s] ?? [],
  }))

  return NextResponse.json({
    date: dateStr,
    slots,
    total_booked: Object.values(grouped).reduce((a, v) => a + v.length, 0),
  })
}
