import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSlots, isWednesday, MAX_PER_SLOT } from '@/lib/slots'
import { checkRotation } from '@/lib/rotation'
import { looksLikeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const name = (data.name ?? '').trim()
  const identifier = (data.identifier ?? '').trim().toLowerCase()
  const dateStr = (data.date ?? '').trim()
  const slotTime = (data.slot_time ?? '').trim()

  if (!name || !identifier || !dateStr || !slotTime)
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
  if (!isWednesday(dateStr))
    return NextResponse.json({ error: 'Apenas quartas-feiras são permitidas.' }, { status: 400 })
  if (!generateSlots().includes(slotTime))
    return NextResponse.json({ error: 'Horário inválido.' }, { status: 400 })

  const slotDt = new Date(`${dateStr}T${slotTime}:00`)
  const now = new Date()
  if (slotDt < now)
    return NextResponse.json({ error: 'Não é possível agendar em horários já passados.' }, { status: 400 })
  if (slotDt < new Date(now.getTime() + 60 * 60 * 1000))
    return NextResponse.json({ error: 'O agendamento deve ser feito com pelo menos 1 hora de antecedência.' }, { status: 400 })

  const rotation = await checkRotation(identifier, dateStr)
  if (!rotation.allowed)
    return NextResponse.json({
      error: rotation.message,
      rotation_blocked: true,
      group: rotation.group,
      opens_at: rotation.opens_at,
    }, { status: 403 })

  // Upsert employee
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .upsert({ name, identifier }, { onConflict: 'identifier' })
    .select('id')
    .single()
  if (!emp) return NextResponse.json({ error: 'Erro ao criar funcionário.' }, { status: 500 })

  // Check existing booking
  const { data: existing } = await supabaseAdmin
    .from('appointments')
    .select('slot_time')
    .eq('employee_id', emp.id)
    .eq('appointment_date', dateStr)
    .maybeSingle()
  if (existing)
    return NextResponse.json({ error: `Você já possui agendamento neste dia às ${existing.slot_time.slice(0, 5)}.` }, { status: 409 })

  // Check slot capacity
  const { count } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_date', dateStr)
    .eq('slot_time', slotTime + ':00')
  if ((count ?? 0) >= MAX_PER_SLOT)
    return NextResponse.json({ error: 'Este horário já está lotado.' }, { status: 409 })

  // Insert appointment
  const { error: insErr } = await supabaseAdmin
    .from('appointments')
    .insert({ employee_id: emp.id, appointment_date: dateStr, slot_time: slotTime + ':00' })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const groupLbl = rotation.group === 'A' ? 'Grupo A — Prioridade' : 'Grupo B — Repescagem'
  const emailNote = looksLikeEmail(identifier) ? ' Um lembrete será enviado por e-mail 5 min antes.' : ''
  return NextResponse.json({
    success: true,
    message: `Agendamento confirmado para ${name} às ${slotTime}.${emailNote}`,
    group: rotation.group,
    group_label: groupLbl,
  }, { status: 201 })
}
