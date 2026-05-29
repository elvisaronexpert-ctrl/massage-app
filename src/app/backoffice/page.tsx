'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
  id: number
  slot_time: string
  status: string
  therapist_note: string | null
  reminder_sent: boolean
  name: string
  identifier: string
  stars: number | null
  energy_before: number | null
  energy_after: number | null
  eval_comment: string | null
}

interface WeekData {
  date: string; label: string; total: number; completed: number; no_show: number
  avg_stars: number; attend_rate: number; eval_rate: number; ibe: number
  avg_energy_before: number; avg_energy_after: number
}

interface DashboardData {
  current_ibe: number
  weekly_data: WeekData[]
  slot_popularity: { time: string; count: number }[]
  totals: { total: number; completed: number; no_show: number; global_avg_stars: number; global_delta: number }
  employees: { display_name: string; sessions: number; completed: number; no_shows: number; avg_stars: number | null; attend_rate: number }[]
  insights: { type: string; icon: string; text: string }[]
  email_enabled: boolean
}

interface RotationData {
  date: string; prev_wednesday: string; group_b_count: number
  booked_this_week: number; total_slots: number; available: number
  window_group_a: string; window_group_b: string
}

function statusLabel(s: string) {
  return s === 'completed' ? 'Concluído' : s === 'no_show' ? 'Faltou' : 'Pendente'
}
function statusVariant(s: string): 'default' | 'destructive' | 'secondary' {
  return s === 'completed' ? 'default' : s === 'no_show' ? 'destructive' : 'secondary'
}
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}
function addWeeks(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</span>
      <div className="mt-1 h-0.5 w-8 bg-[#dc0019] rounded-full" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Backoffice() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [page, setPage] = useState<'sessions' | 'rotation' | 'dashboard'>('sessions')
  const [date, setDate] = useState('')
  const [dateOffset, setDateOffset] = useState(0)
  const [sessions, setSessions] = useState<Session[]>([])
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [rotData, setRotData] = useState<RotationData | null>(null)

  useEffect(() => {
    fetch('/api/admin/check').then(r => r.json()).then(d => {
      if (d.logged_in) { setLoggedIn(true); setDisplayName(d.display_name) }
    })
    fetch('/api/next-wednesday').then(r => r.json()).then(d => setDate(d.date))
  }, [])

  const currentDate = date ? addWeeks(date, dateOffset) : ''

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    const r = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const d = await r.json()
    setLoginLoading(false)
    if (d.success) { setLoggedIn(true); setDisplayName(d.display_name); toast.success(`Bem-vindo, ${d.display_name}!`) }
    else toast.error(d.error)
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setLoggedIn(false); setDisplayName('')
  }

  const loadSessions = useCallback(async () => {
    if (!loggedIn || !currentDate) return
    const r = await fetch(`/api/admin/sessions?date=${currentDate}`)
    const d = await r.json()
    if (d.sessions) { setSessions(d.sessions); setEmailEnabled(d.email_enabled) }
  }, [loggedIn, currentDate])

  useEffect(() => { if (page === 'sessions') loadSessions() }, [page, loadSessions])

  useEffect(() => {
    if (!loggedIn || page !== 'dashboard') return
    fetch('/api/admin/dashboard?weeks=8').then(r => r.json()).then(setDashData)
  }, [loggedIn, page])

  useEffect(() => {
    if (!loggedIn || page !== 'rotation' || !currentDate) return
    fetch(`/api/admin/rotation-overview?date=${currentDate}`).then(r => r.json()).then(setRotData)
  }, [loggedIn, page, currentDate])

  async function updateStatus(id: number, status: string, note?: string) {
    const r = await fetch('/api/admin/update-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id, status, therapist_note: note }),
    })
    const d = await r.json()
    if (d.success) { toast.success('Status atualizado.'); loadSessions() }
    else toast.error(d.error)
  }

  async function sendReminder(id: number) {
    const r = await fetch('/api/admin/send-reminder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id }),
    })
    const d = await r.json()
    if (d.success) { toast.success(d.message); loadSessions() }
    else toast.error(d.error)
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="relative min-h-screen bg-[#04003d] flex flex-col items-center justify-center px-6 py-16">
        {/* Background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <svg preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80" className="absolute inset-0 w-full h-full">
            <path fill="#07005c" fillOpacity="0.22" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
            <path fill="#0d00a3" fillOpacity="0.18" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
            <path fill="#1e14e0" fillOpacity="0.16" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
            <path fill="#4d40e8" fillOpacity="0.14" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
          </svg>
        </div>

        {/* Logo above card */}
        <div className="relative z-10 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/saude-bem-estar-full.svg" alt="Saúde e Bem Estar" className="h-12 w-auto drop-shadow-lg" />
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.50)] overflow-hidden">
          <div className="px-8 pt-8 pb-6 space-y-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888]">Back Office</p>
            <div className="mt-1 h-[2px] w-6 bg-[#dc0019] rounded-full mx-auto" />
            <p className="text-sm text-neutral-400 pt-1">Sistema de Agendamento RH</p>
          </div>

          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Usuário</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="rh / massagem" autoComplete="username" autoFocus
                className="h-10 text-sm border-neutral-200 focus-visible:ring-[#04003d]/20 focus-visible:border-[#04003d]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Senha</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••" autoComplete="current-password"
                className="h-10 text-sm border-neutral-200 focus-visible:ring-[#04003d]/20 focus-visible:border-[#04003d]" />
            </div>
            <Button type="submit" className="w-full h-10 text-sm font-bold tracking-wide bg-[#04003d] hover:bg-[#04003d]/90" disabled={loginLoading}>
              {loginLoading ? 'Entrando…' : 'Entrar'}
            </Button>
            <div className="text-center pt-1">
              <a href="/" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                ← Voltar ao agendamento
              </a>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── App ────────────────────────────────────────────────────────────────────
  const grouped: Record<string, Session[]> = {}
  for (const s of sessions) {
    if (!grouped[s.slot_time]) grouped[s.slot_time] = []
    grouped[s.slot_time].push(s)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(4,0,61,0.18)]">
        <div className="h-1 bg-[#dc0019]" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" />
              <path d="M10 4 C10 4 14 7 14 10 C14 13 10 16 10 16 C10 16 6 13 6 10 C6 7 10 4 10 4Z"
                fill="white" fillOpacity="0.75" />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-base leading-tight tracking-tight">Back Office · Massagem RH</h1>
            <p className="text-[11px] text-white/50 tracking-wide">{displayName}</p>
          </div>

          <nav className="ml-auto flex gap-2 flex-wrap items-center">
            {(['sessions', 'rotation', 'dashboard'] as const).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all
                  ${page === p
                    ? 'bg-white/20 border-white text-white'
                    : 'border-white/25 text-white/70 hover:bg-white/10 hover:text-white'}`}>
                {p === 'sessions' ? 'Sessões' : p === 'rotation' ? 'Rodízio' : 'Dashboard'}
              </button>
            ))}
            <button onClick={handleLogout}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-[#dc0019]/60 text-[#ff8090] hover:bg-[#dc0019]/20 transition-all">
              Sair
            </button>
            <a href="/" className="text-[11px] text-white/40 hover:text-white/80 transition-colors ml-1">
              ← Agendamento
            </a>
          </nav>
        </div>
        <div className="h-0.5 bg-[#dc0019]/30" />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Sessões ──────────────────────────────────────────────────────── */}
        {page === 'sessions' && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o - 1)}
                className="border-neutral-200 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                ← Ant.
              </Button>
              <span className="font-semibold text-foreground">{currentDate ? formatDate(currentDate) : '…'}</span>
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o + 1)}
                className="border-neutral-200 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                Próx. →
              </Button>
              <Badge variant="secondary" className="ml-auto">{sessions.length} sessão(ões)</Badge>
            </div>

            {Object.keys(grouped).sort().map(slot => (
              <Card key={slot} className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
                <CardHeader className="pb-3">
                  <SectionTitle>{slot} — {grouped[slot].length} pessoa(s)</SectionTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grouped[slot].map(s => (
                    <div key={s.id} className="rounded-xl border border-neutral-200 p-4 bg-white space-y-3 shadow-[0_1px_2px_rgba(4,0,61,0.06)]">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.identifier}</p>
                          {s.stars && (
                            <p className="text-xs text-amber-600 mt-1">
                              ⭐ {s.stars}/5{s.eval_comment ? ` · "${s.eval_comment}"` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                          {s.reminder_sent && <Badge variant="outline" className="text-xs">✉ lembrete</Badge>}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select defaultValue={s.status} onValueChange={v => updateStatus(s.id, v)}>
                          <SelectTrigger className="w-36 h-8 text-sm border-neutral-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="no_show">Faltou</SelectItem>
                          </SelectContent>
                        </Select>
                        {emailEnabled && s.identifier.includes('@') && !s.reminder_sent && s.status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-8 text-xs border-neutral-200"
                            onClick={() => sendReminder(s.id)}>
                            ✉ Enviar lembrete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {sessions.length === 0 && (
              <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma sessão agendada para esta data.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── Rodízio ──────────────────────────────────────────────────────── */}
        {page === 'rotation' && rotData && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o - 1)}
                className="border-neutral-200 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                ← Ant.
              </Button>
              <span className="font-semibold text-foreground">{currentDate ? formatDate(currentDate) : '…'}</span>
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o + 1)}
                className="border-neutral-200 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                Próx. →
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Vagas total', value: rotData.total_slots, color: 'text-foreground' },
                { label: 'Agendadas', value: rotData.booked_this_week, color: 'text-primary' },
                { label: 'Disponíveis', value: rotData.available, color: 'text-[#1a7a3a]' },
                { label: 'Grupo B (sem. passada)', value: rotData.group_b_count, color: 'text-amber-600' },
              ].map(item => (
                <Card key={item.label} className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
              <CardHeader className="pb-4">
                <SectionTitle>Janelas de abertura</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-sm text-muted-foreground">Grupo A (prioridade) — Segunda-feira</span>
                  <Badge variant="outline">
                    {new Date(rotData.window_group_a).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Grupo B (repescagem) — Terça-feira</span>
                  <Badge variant="secondary">
                    {new Date(rotData.window_group_b).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Dashboard ────────────────────────────────────────────────────── */}
        {page === 'dashboard' && dashData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'IBE Atual', value: dashData.current_ibe.toFixed(1), color: 'text-primary', desc: 'Índice de Bem-Estar' },
                { label: 'Total sessões', value: dashData.totals.total, color: 'text-foreground', desc: 'Histórico geral' },
                { label: 'Média avaliações', value: dashData.totals.global_avg_stars.toFixed(1) + ' ⭐', color: 'text-amber-600', desc: 'Todas as sessões' },
                { label: 'Delta energia', value: '+' + dashData.totals.global_delta.toFixed(1), color: 'text-[#1a7a3a]', desc: 'Antes → Depois' },
              ].map(k => (
                <Card key={k.label} className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{k.label}</p>
                    <p className="text-xs text-muted-foreground">{k.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Insights */}
            {dashData.insights.length > 0 && (
              <div className="space-y-2">
                {dashData.insights.map((ins, i) => (
                  <Alert key={i}
                    className={ins.type === 'alert'
                      ? 'border-[#dc0019]/20 bg-[#fff0f2]'
                      : ins.type === 'positive'
                        ? 'border-[#1a7a3a]/20 bg-[#e8f5ed]'
                        : 'border-neutral-200'}>
                    <AlertDescription className="flex items-center gap-2">
                      <span>{ins.icon}</span>
                      <span className="text-sm">{ins.text}</span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Chart IBE */}
            <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
              <CardHeader className="pb-4">
                <SectionTitle>IBE semanal</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashData.weekly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ibe" stroke="#04003d" strokeWidth={2.5}
                      dot={{ r: 3, fill: '#04003d' }} name="IBE" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart attendance */}
            <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
              <CardHeader className="pb-4">
                <SectionTitle>Sessões por semana</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.weekly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#1a7a3a" name="Concluídas" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="no_show" fill="#dc0019" name="Faltas" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Slot popularity */}
            <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
              <CardHeader className="pb-4">
                <SectionTitle>Horários mais procurados</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dashData.slot_popularity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="time" type="category" width={48} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#04003d" name="Agendamentos" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Employees table */}
            <Card className="shadow-[0_2px_4px_rgba(4,0,61,0.08)] border-neutral-200">
              <CardHeader className="pb-4">
                <SectionTitle>Colaboradores (anonimizados)</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Colaborador</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Sessões</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Concluídas</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Faltas</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Presença</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">⭐ Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashData.employees.map(emp => (
                      <TableRow key={emp.display_name} className="border-neutral-100">
                        <TableCell className="font-semibold text-foreground">{emp.display_name}</TableCell>
                        <TableCell className="text-right text-foreground">{emp.sessions}</TableCell>
                        <TableCell className="text-right text-[#1a7a3a] font-medium">{emp.completed}</TableCell>
                        <TableCell className="text-right text-[#dc0019] font-medium">{emp.no_shows}</TableCell>
                        <TableCell className="text-right text-foreground">{(emp.attend_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-right text-foreground">{emp.avg_stars ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
