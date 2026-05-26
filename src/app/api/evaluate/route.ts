import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { appointment_id, stars, energy_before, energy_after, comment } = data

  if (!appointment_id || !stars)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  if (stars < 1 || stars > 5)
    return NextResponse.json({ error: 'Avaliação entre 1 e 5.' }, { status: 400 })

  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('id', appointment_id)
    .eq('status', 'completed')
    .maybeSingle()
  if (!appt) return NextResponse.json({ error: 'Agendamento não concluído.' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('evaluations')
    .upsert({
      appointment_id,
      stars: Number(stars),
      energy_before: energy_before ?? null,
      energy_after: energy_after ?? null,
      comment: (comment ?? '').trim() || null,
    }, { onConflict: 'appointment_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Avaliação registrada. Obrigado!' })
}
