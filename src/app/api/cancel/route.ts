import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const identifier = (data.identifier ?? '').trim().toLowerCase()
  const dateStr = (data.date ?? '').trim()
  if (!identifier || !dateStr)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('identifier', identifier)
    .maybeSingle()
  if (!emp) return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 })

  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id, slot_time')
    .eq('employee_id', emp.id)
    .eq('appointment_date', dateStr)
    .maybeSingle()
  if (!appt) return NextResponse.json({ error: 'Nenhum agendamento encontrado.' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('id', appt.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: `Agendamento das ${appt.slot_time.slice(0, 5)} cancelado.` })
}
