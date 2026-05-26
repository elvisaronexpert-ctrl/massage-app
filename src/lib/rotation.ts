import { supabaseAdmin } from './supabase'

const WINDOW_GROUP_A = '09:00' // Segunda
const WINDOW_GROUP_B = '09:00' // Terça

function getPreviousWednesday(targetDate: Date): Date {
  const d = new Date(targetDate)
  d.setDate(d.getDate() - 7)
  return d
}

function bookingWindows(targetWedStr: string) {
  const target = new Date(targetWedStr + 'T12:00:00')
  const monday = new Date(target)
  monday.setDate(target.getDate() - 2)
  const tuesday = new Date(target)
  tuesday.setDate(target.getDate() - 1)

  const [ah, am] = WINDOW_GROUP_A.split(':').map(Number)
  const [bh, bm] = WINDOW_GROUP_B.split(':').map(Number)

  const windowA = new Date(monday)
  windowA.setHours(ah, am, 0, 0)
  const windowB = new Date(tuesday)
  windowB.setHours(bh, bm, 0, 0)

  return { A: windowA, B: windowB }
}

async function wasPresentLastWeek(identifier: string, targetWedStr: string): Promise<boolean> {
  const target = new Date(targetWedStr + 'T12:00:00')
  const prevWed = getPreviousWednesday(target).toISOString().split('T')[0]

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('id, employees!inner(identifier)')
    .eq('employees.identifier', identifier)
    .eq('appointment_date', prevWed)
    .neq('status', 'no_show')
    .limit(1)

  return (data?.length ?? 0) > 0
}

export async function checkRotation(identifier: string, targetWedStr: string) {
  const now = new Date()
  const windows = bookingWindows(targetWedStr)

  if (now < windows.A) {
    return {
      allowed: false,
      group: '?',
      opens_at: windows.A.toISOString(),
      message: `Os agendamentos para esta quarta abrem na Segunda-feira às ${WINDOW_GROUP_A}. Volte em breve!`,
    }
  }

  const presentLastWeek = await wasPresentLastWeek(identifier, targetWedStr)
  const group = presentLastWeek ? 'B' : 'A'

  if (group === 'B' && now < windows.B) {
    return {
      allowed: false,
      group: 'B',
      opens_at: windows.B.toISOString(),
      message: `Você utilizou o serviço na semana passada. Sua janela de agendamento abre na Terça-feira às ${WINDOW_GROUP_B}, caso ainda restem vagas.`,
    }
  }

  return { allowed: true, group, opens_at: null, message: null }
}
