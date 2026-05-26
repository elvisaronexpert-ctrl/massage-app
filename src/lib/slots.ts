export const MAX_PER_SLOT = 3
export const SESSION_MIN = 15
export const SLOT_START = '14:00'
export const SLOT_END_EXCL = '17:30'

export function generateSlots(): string[] {
  const slots: string[] = []
  const [sh, sm] = SLOT_START.split(':').map(Number)
  const [eh, em] = SLOT_END_EXCL.split(':').map(Number)
  let minutes = sh * 60 + sm
  const end = eh * 60 + em
  while (minutes < end) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    minutes += SESSION_MIN
  }
  return slots
}

export function nextWednesday(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun,1=Mon,...,6=Sat; Wed=3
  let ahead = 3 - day
  if (ahead <= 0) ahead += 7
  const d = new Date(today)
  d.setDate(today.getDate() + ahead)
  return d.toISOString().split('T')[0]
}

export function isWednesday(dateStr: string): boolean {
  return new Date(dateStr + 'T12:00:00').getDay() === 3
}
