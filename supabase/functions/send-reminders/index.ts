import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')!
const EMAIL_PASSWORD = Deno.env.get('EMAIL_PASSWORD')!
const BASE_URL = Deno.env.get('BASE_URL') ?? ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function looksLikeEmail(s: string) {
  return s.includes('@') && s.split('@')[1]?.includes('.')
}

async function sendEmail(to: string, subject: string, html: string) {
  const auth = btoa(`${EMAIL_FROM}:${EMAIL_PASSWORD}`)
  // Usar Gmail SMTP via fetch (requires SMTP relay ou usar Resend/Postmark)
  // Abaixo: exemplo com Resend (recomendado para Edge Functions)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })
    return
  }
  // Fallback: chamar o endpoint /api/cron do Next.js (que usa nodemailer)
  const cronSecret = Deno.env.get('CRON_SECRET')
  const nextUrl = Deno.env.get('NEXT_PUBLIC_BASE_URL')
  if (cronSecret && nextUrl) {
    await fetch(`${nextUrl}/api/cron`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret, 'Content-Type': 'application/json' },
      body: '{}',
    })
  }
  void auth // suppress unused warning
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const now = new Date()
  const winStart = new Date(now.getTime() + 4.5 * 60 * 1000)
  const winEnd = new Date(now.getTime() + 5.5 * 60 * 1000)
  const todayStr = now.toISOString().split('T')[0]
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`

  const { data: rows, error } = await supabase
    .from('appointments')
    .select('id, slot_time, appointment_date, employees(name, identifier)')
    .eq('appointment_date', todayStr)
    .eq('reminder_sent', false)
    .gte('slot_time', fmt(winStart))
    .lte('slot_time', fmt(winEnd))

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  let sent = 0
  for (const row of rows ?? []) {
    const emp = row.employees as { name: string; identifier: string } | null
    if (emp && looksLikeEmail(emp.identifier)) {
      const dateFmt = new Date(row.appointment_date + 'T12:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const slotTime = (row.slot_time as string).slice(0, 5)

      const html = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;
                  border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#2563eb;padding:24px;text-align:center;">
          <div style="font-size:2.5rem;">💆</div>
          <h1 style="color:#fff;font-size:1.3rem;margin:8px 0 4px;">Hora da sua massagem!</h1>
          <p style="color:rgba(255,255,255,.8);font-size:.9rem;margin:0;">Benefício RH · Carrilho Bem-Estar</p>
        </div>
        <div style="padding:28px 24px;background:#fff;">
          <p>Olá, <strong>${emp.name}</strong>! 👋</p>
          <p>Sua sessão começa em <strong>5 minutos</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <div style="font-size:1.8rem;font-weight:800;color:#2563eb;">${slotTime}</div>
            <div style="font-size:.85rem;color:#64748b;margin-top:4px;">${dateFmt} · Quarta-feira</div>
          </div>
          <p style="font-size:.88rem;color:#94a3b8;">Lembre de avaliar após a sessão! ⭐</p>
        </div>
        <div style="background:#f8fafc;padding:12px 24px;text-align:center;">
          <p style="font-size:.78rem;color:#94a3b8;margin:0;">Lembrete automático · Sistema RH</p>
        </div>
      </div>`

      await sendEmail(emp.identifier, '💆 Lembrete: sua massagem começa em 5 minutos!', html)
      sent++
    }
    await supabase.from('appointments').update({ reminder_sent: true }).eq('id', row.id)
  }

  return new Response(JSON.stringify({ processed: rows?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
