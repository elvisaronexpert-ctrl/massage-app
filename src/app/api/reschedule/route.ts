import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSlots, isWednesday, MAX_PER_SLOT } from '@/lib/slots'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const name = (data.name ?? '').trim()
  const identifier = (data.identifier ?? '').trim().toLowerCase()
  const dateStr = (data.date ?? '').trim()
  const newSlot = (data.new_slot_time ?? '').trim()

  if (!name || !identifier || !dateStr || !newSlot)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  if (!isWednesday(dateStr))
    return NextResponse.json({ error: 'Apenas quartas-feiras.' }, { status: 400 })
  if (!generateSlots().includes(newSlot))
    return NextResponse.json({ error: 'Horário inválido.' }, { status: 400 })

  // Upsert employee
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .upsert({ name, identifier }, { onConflict: 'identifier' })
    .select('id')
    .single()
  if (!emp) return NextResponse.json({ error: 'Erro ao localizar funcionário.' }, { status: 500 })

  // Check new slot capacity
  const { count } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_date', dateStr)
    .eq('slot_time', newSlot + ':00')
  if ((count ?? 0) >= MAX_PER_SLOT)
    return NextResponse.json({ error: 'O horário escolhido já está lotado.' }, { status: 409 })

  // Delete old and insert new
  await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('employee_id', emp.id)
    .eq('appointment_date', dateStr)

  const { error } = await supabaseAdmin
    .from('appointments')
    .insert({ employee_id: emp.id, appointment_date: dateStr, slot_time: newSlot + ':00', reminder_sent: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: `Reagendamento confirmado para ${name} às ${newSlot}.` })
}
