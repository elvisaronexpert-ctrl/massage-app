import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSlots, nextWednesday, isWednesday, MAX_PER_SLOT } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get('date') ?? nextWednesday()
  if (!isWednesday(dateStr))
    return NextResponse.json({ error: 'Apenas quartas-feiras são permitidas.' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('slot_time')
    .eq('appointment_date', dateStr)

  const booked: Record<string, number> = {}
  for (const r of data ?? []) {
    const t = r.slot_time.slice(0, 5)
    booked[t] = (booked[t] ?? 0) + 1
  }

  const now = new Date()
  const deadline = new Date(now.getTime() + 60 * 60 * 1000)

  const slots = generateSlots().map((s) => {
    const dt = new Date(`${dateStr}T${s}:00`)
    return {
      time: s,
      booked: booked[s] ?? 0,
      available: MAX_PER_SLOT - (booked[s] ?? 0),
      full: (booked[s] ?? 0) >= MAX_PER_SLOT,
      past: dt < now,
      too_soon: dt >= now && dt < deadline,
    }
  })

  return NextResponse.json({ date: dateStr, slots })
}
