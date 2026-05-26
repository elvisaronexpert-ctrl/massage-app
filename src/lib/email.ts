import nodemailer from 'nodemailer'

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true'
const EMAIL_FROM = process.env.EMAIL_FROM ?? ''
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD ?? ''
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: EMAIL_FROM, pass: EMAIL_PASSWORD },
  })
}

export function looksLikeEmail(s: string): boolean {
  return s.includes('@') && s.split('@')[1]?.includes('.')
}

export async function sendReminderEmail(
  toEmail: string,
  employeeName: string,
  slotTime: string,
  appointmentDate: string
): Promise<boolean> {
  if (!EMAIL_ENABLED) return false
  try {
    const dateFmt = new Date(appointmentDate + 'T12:00:00')
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;
                border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#2563eb;padding:24px;text-align:center;">
        <div style="font-size:2.5rem;">💆</div>
        <h1 style="color:#fff;font-size:1.3rem;margin:8px 0 4px;">Hora da sua massagem!</h1>
        <p style="color:rgba(255,255,255,.8);font-size:.9rem;margin:0;">Benefício RH · Carrilho Bem-Estar</p>
      </div>
      <div style="padding:28px 24px;background:#fff;">
        <p style="font-size:1rem;color:#1e293b;">Olá, <strong>${employeeName}</strong>! 👋</p>
        <p style="font-size:.95rem;color:#475569;margin:12px 0;">
          Sua sessão de massagem começa em <strong>5 minutos</strong>. Prepare-se!
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
                    padding:16px;margin:20px 0;text-align:center;">
          <div style="font-size:1.8rem;font-weight:800;color:#2563eb;">${slotTime}</div>
          <div style="font-size:.85rem;color:#64748b;margin-top:4px;">${dateFmt} · Quarta-feira</div>
        </div>
        <p style="font-size:.88rem;color:#94a3b8;">
          Lembre-se de avaliar sua experiência após a sessão! ⭐
        </p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;text-align:center;">
        <p style="font-size:.78rem;color:#94a3b8;margin:0;">
          Lembrete automático · Sistema de Agendamento RH
        </p>
      </div>
    </div>`

    await createTransporter().sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject: '💆 Lembrete: sua massagem começa em 5 minutos!',
      html,
    })
    return true
  } catch (e) {
    console.error('[Email] Lembrete falhou:', e)
    return false
  }
}

export async function sendEvalEmail(
  toEmail: string,
  employeeName: string,
  slotTime: string,
  appointmentDate: string
): Promise<boolean> {
  if (!EMAIL_ENABLED) return false
  try {
    const dateFmt = new Date(appointmentDate + 'T12:00:00')
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;
                border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#16a34a;padding:24px;text-align:center;">
        <div style="font-size:2.5rem;">⭐</div>
        <h1 style="color:#fff;font-size:1.3rem;margin:8px 0 4px;">Como foi sua massagem?</h1>
        <p style="color:rgba(255,255,255,.8);font-size:.9rem;margin:0;">Sua opinião é muito importante!</p>
      </div>
      <div style="padding:28px 24px;background:#fff;">
        <p style="font-size:1rem;color:#1e293b;">Olá, <strong>${employeeName}</strong>! 👋</p>
        <p style="font-size:.95rem;color:#475569;margin:12px 0;">
          Sua sessão das <strong>${slotTime}</strong> de <strong>${dateFmt}</strong>
          foi concluída. Conta pra gente como foi!
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${BASE_URL}" style="display:inline-block;background:#16a34a;color:#fff;
             font-size:1rem;font-weight:700;padding:14px 32px;border-radius:8px;
             text-decoration:none;">Avaliar minha sessão ⭐</a>
        </div>
        <p style="font-size:.85rem;color:#94a3b8;text-align:center;">
          Acesse o sistema, informe seu e-mail e clique em "Avaliar agora". Leva menos de 1 minuto!
        </p>
      </div>
      <div style="background:#f8fafc;padding:12px 24px;text-align:center;">
        <p style="font-size:.78rem;color:#94a3b8;margin:0;">
          E-mail automático · Sistema de Agendamento RH · Carrilho Bem-Estar
        </p>
      </div>
    </div>`

    await createTransporter().sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject: '⭐ Como foi sua massagem? Avalie sua experiência!',
      html,
    })
    return true
  } catch (e) {
    console.error('[Email] Avaliação falhou:', e)
    return false
  }
}
