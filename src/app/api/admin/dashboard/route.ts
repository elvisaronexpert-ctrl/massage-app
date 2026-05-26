import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest(req))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const weeks = Number(req.nextUrl.searchParams.get('weeks') ?? 8)
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysBack = dayOfWeek - 3
  if (daysBack < 0) daysBack += 7
  const lastWed = new Date(today)
  lastWed.setDate(today.getDate() - daysBack)

  const weeklyData = []
  for (let i = weeks - 1; i >= 0; i--) {
    const wed = new Date(lastWed)
    wed.setDate(lastWed.getDate() - i * 7)
    const wedStr = wed.toISOString().split('T')[0]

    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('id, status, evaluations(stars, energy_before, energy_after)')
      .eq('appointment_date', wedStr)

    const total = appts?.length ?? 0
    const completed = appts?.filter(a => a.status === 'completed').length ?? 0
    const no_show = appts?.filter(a => a.status === 'no_show').length ?? 0

    const evals = appts?.flatMap(a => a.evaluations ? [a.evaluations] : []) as
      { stars: number; energy_before: number | null; energy_after: number | null }[]

    const avg_stars = evals.length ? evals.reduce((s, e) => s + e.stars, 0) / evals.length : 0
    const ebRows = evals.filter(e => e.energy_before !== null && e.energy_after !== null)
    const avg_energy_before = ebRows.length ? ebRows.reduce((s, e) => s + (e.energy_before ?? 0), 0) / ebRows.length : 0
    const avg_energy_after = ebRows.length ? ebRows.reduce((s, e) => s + (e.energy_after ?? 0), 0) / ebRows.length : 0

    const eval_rate = completed > 0 ? evals.length / completed : 0
    const attend_rate = total > 0 ? completed / total : 0
    const ibe = total > 0 ? Number(((avg_stars / 5 * 50) + (attend_rate * 30) + (eval_rate * 20)).toFixed(1)) : 0

    weeklyData.push({
      date: wedStr,
      label: wed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total, completed, no_show,
      avg_stars: Number(avg_stars.toFixed(2)),
      avg_energy_before: Number(avg_energy_before.toFixed(2)),
      avg_energy_after: Number(avg_energy_after.toFixed(2)),
      eval_rate: Number(eval_rate.toFixed(2)),
      attend_rate: Number(attend_rate.toFixed(2)),
      ibe, evals: evals.length,
    })
  }

  const { data: allAppts } = await supabaseAdmin
    .from('appointments')
    .select('id, status, employee_id, slot_time, evaluations(stars, energy_before, energy_after)')

  const totals = {
    total: allAppts?.length ?? 0,
    completed: allAppts?.filter(a => a.status === 'completed').length ?? 0,
    no_show: allAppts?.filter(a => a.status === 'no_show').length ?? 0,
    global_avg_stars: 0,
    global_delta: 0,
  }

  const allEvals = allAppts?.flatMap(a => a.evaluations ? [a.evaluations] : []) as
    { stars: number; energy_before: number | null; energy_after: number | null }[]
  if (allEvals.length) {
    totals.global_avg_stars = Number((allEvals.reduce((s, e) => s + e.stars, 0) / allEvals.length).toFixed(2))
    const deltaRows = allEvals.filter(e => e.energy_before !== null && e.energy_after !== null)
    if (deltaRows.length)
      totals.global_delta = Number((deltaRows.reduce((s, e) => s + ((e.energy_after ?? 0) - (e.energy_before ?? 0)), 0) / deltaRows.length).toFixed(2))
  }

  const slotMap: Record<string, number> = {}
  for (const a of allAppts ?? []) {
    const t = (a.slot_time as string).slice(0, 5)
    slotMap[t] = (slotMap[t] ?? 0) + 1
  }

  // Employee stats (anonymised)
  const empMap: Record<number, { sessions: number; completed: number; no_shows: number; stars: number[]; deltas: number[] }> = {}
  for (const a of allAppts ?? []) {
    if (!empMap[a.employee_id]) empMap[a.employee_id] = { sessions: 0, completed: 0, no_shows: 0, stars: [], deltas: [] }
    empMap[a.employee_id].sessions++
    if (a.status === 'completed') empMap[a.employee_id].completed++
    if (a.status === 'no_show') empMap[a.employee_id].no_shows++
    const ev = a.evaluations as { stars: number; energy_before: number | null; energy_after: number | null } | null
    if (ev) {
      empMap[a.employee_id].stars.push(ev.stars)
      if (ev.energy_before !== null && ev.energy_after !== null)
        empMap[a.employee_id].deltas.push((ev.energy_after ?? 0) - (ev.energy_before ?? 0))
    }
  }
  const employees = Object.entries(empMap)
    .sort(([, a], [, b]) => b.completed - a.completed)
    .map(([, v], i) => ({
      display_name: `Colaborador ${String(i + 1).padStart(2, '0')}`,
      sessions: v.sessions,
      completed: v.completed,
      no_shows: v.no_shows,
      avg_stars: v.stars.length ? Number((v.stars.reduce((a, b) => a + b, 0) / v.stars.length).toFixed(1)) : null,
      avg_delta: v.deltas.length ? Number((v.deltas.reduce((a, b) => a + b, 0) / v.deltas.length).toFixed(1)) : null,
      attend_rate: v.sessions ? Number((v.completed / v.sessions).toFixed(2)) : 0,
    }))

  const insights = generateInsights(weeklyData, totals)

  return NextResponse.json({
    current_ibe: [...weeklyData].reverse().find(w => w.total > 0)?.ibe ?? 0,
    weekly_data: weeklyData,
    slot_popularity: Object.entries(slotMap).map(([time, count]) => ({ time, count })).sort((a, b) => a.time.localeCompare(b.time)),
    totals, employees, insights,
    email_enabled: process.env.EMAIL_ENABLED === 'true',
  })
}

type WeekData = { total: number; ibe: number; no_show: number; eval_rate: number; completed: number }
type Totals = { global_avg_stars: number; global_delta: number }

function generateInsights(weeklyData: WeekData[], totals: Totals) {
  const insights: { type: string; icon: string; text: string }[] = []
  const filled = weeklyData.filter(w => w.total > 0)
  if (filled.length < 2) return insights
  const last = filled[filled.length - 1], prev = filled[filled.length - 2]
  if (last.ibe > prev.ibe + 3)
    insights.push({ type: 'positive', icon: '📈', text: `IBE subiu ${(last.ibe - prev.ibe).toFixed(1)} pontos.` })
  else if (last.ibe < prev.ibe - 3)
    insights.push({ type: 'alert', icon: '📉', text: `IBE caiu ${(prev.ibe - last.ibe).toFixed(1)} pontos.` })
  if (last.total > 0) {
    const ns = last.no_show / last.total
    if (ns > 0.2) insights.push({ type: 'alert', icon: '⚠️', text: `${Math.round(ns * 100)}% de não comparecimento esta semana.` })
    else if (ns === 0) insights.push({ type: 'positive', icon: '🎯', text: 'Zero faltas esta semana!' })
  }
  if (totals.global_delta > 0)
    insights.push({ type: 'positive', icon: '⚡', text: `Funcionários saem com +${totals.global_delta.toFixed(1)} pts de energia.` })
  if (totals.global_avg_stars >= 4.5)
    insights.push({ type: 'positive', icon: '⭐', text: `Média de avaliações em ${totals.global_avg_stars.toFixed(1)} — excelente!` })
  else if (totals.global_avg_stars > 0 && totals.global_avg_stars < 3.5)
    insights.push({ type: 'alert', icon: '🔔', text: `Média de avaliações em ${totals.global_avg_stars.toFixed(1)}. Atenção!` })
  if (last.completed > 0 && last.eval_rate < 0.4)
    insights.push({ type: 'neutral', icon: '💬', text: 'Menos de 40% avaliaram a última sessão.' })
  return insights.slice(0, 5)
}
