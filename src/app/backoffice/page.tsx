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

  // Check auth
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
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="text-5xl">🔐</div>
            <CardTitle className="text-xl">Back Office</CardTitle>
            <p className="text-sm text-stone-500">Sistema de Agendamento RH</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Usuário</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="rh / massagem" autoComplete="username" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full bg-[#6b4c35] hover:bg-[#5a3e2b]" disabled={loginLoading}>
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <a href="/" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">← Voltar ao agendamento</a>
            </div>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-[#6b4c35] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">💆</div>
          <div>
            <h1 className="font-bold text-base leading-tight">Back Office · Massagem RH</h1>
            <p className="text-xs opacity-75">{displayName}</p>
          </div>
          <nav className="ml-auto flex gap-2 flex-wrap">
            {(['sessions', 'rotation', 'dashboard'] as const).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all
                  ${page === p ? 'bg-white/20 border-white' : 'border-white/30 hover:bg-white/10'}`}>
                {p === 'sessions' ? 'Sessões' : p === 'rotation' ? 'Rodízio' : 'Dashboard'}
              </button>
            ))}
            <button onClick={handleLogout}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-red-300/50 text-red-200 hover:bg-red-500/20 transition-all">
              Sair
            </button>
          </nav>
          <a href="/" className="text-xs text-white/50 hover:text-white transition-colors ml-2">← Agendamento</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Sessões ──────────────────────────────────────────────────────── */}
        {page === 'sessions' && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o - 1)}>← Ant.</Button>
              <span className="font-semibold text-stone-700">{currentDate ? formatDate(currentDate) : '...'}</span>
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o + 1)}>Próx. →</Button>
              <Badge variant="secondary" className="ml-auto">{sessions.length} sessão(ões)</Badge>
            </div>

            {Object.keys(grouped).sort().map(slot => (
              <Card key={slot}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">{slot} — {grouped[slot].length} pessoa(s)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grouped[slot].map(s => (
                    <div key={s.id} className="rounded-xl border border-stone-200 p-4 bg-white space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-stone-800">{s.name}</p>
                          <p className="text-xs text-stone-400">{s.identifier}</p>
                          {s.stars && (
                            <p className="text-xs text-amber-600 mt-1">⭐ {s.stars}/5{s.eval_comment ? ` · "${s.eval_comment}"` : ''}</p>
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
                          <SelectTrigger className="w-36 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="no_show">Faltou</SelectItem>
                          </SelectContent>
                        </Select>
                        {emailEnabled && s.identifier.includes('@') && !s.reminder_sent && s.status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => sendReminder(s.id)}>
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
              <Card><CardContent className="py-12 text-center text-stone-400">Nenhuma sessão agendada para esta data.</CardContent></Card>
            )}
          </>
        )}

        {/* ── Rodízio ──────────────────────────────────────────────────────── */}
        {page === 'rotation' && rotData && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o - 1)}>← Ant.</Button>
              <span className="font-semibold text-stone-700">{currentDate ? formatDate(currentDate) : '...'}</span>
              <Button size="sm" variant="outline" onClick={() => setDateOffset(o => o + 1)}>Próx. →</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Vagas total', value: rotData.total_slots, color: 'text-stone-700' },
                { label: 'Agendadas', value: rotData.booked_this_week, color: 'text-blue-600' },
                { label: 'Disponíveis', value: rotData.available, color: 'text-green-600' },
                { label: 'Grupo B (semana passada)', value: rotData.group_b_count, color: 'text-amber-600' },
              ].map(item => (
                <Card key={item.label}>
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-stone-500 mt-1">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">Janelas de abertura</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-600">Grupo A (prioridade) — Segunda-feira</span>
                  <Badge variant="outline">{new Date(rotData.window_group_a).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-stone-600">Grupo B (repescagem) — Terça-feira</span>
                  <Badge variant="secondary">{new Date(rotData.window_group_b).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</Badge>
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
                { label: 'IBE Atual', value: dashData.current_ibe.toFixed(1), color: 'text-blue-600', desc: 'Índice de Bem-Estar' },
                { label: 'Total sessões', value: dashData.totals.total, color: 'text-stone-700', desc: 'Histórico geral' },
                { label: 'Média avaliações', value: dashData.totals.global_avg_stars.toFixed(1) + ' ⭐', color: 'text-amber-600', desc: 'Todas as sessões' },
                { label: 'Delta energia', value: '+' + dashData.totals.global_delta.toFixed(1), color: 'text-green-600', desc: 'Antes → Depois' },
              ].map(k => (
                <Card key={k.label}>
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-xs font-semibold text-stone-600 mt-0.5">{k.label}</p>
                    <p className="text-xs text-stone-400">{k.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Insights */}
            {dashData.insights.length > 0 && (
              <div className="space-y-2">
                {dashData.insights.map((ins, i) => (
                  <Alert key={i} className={ins.type === 'alert' ? 'border-red-200 bg-red-50' : ins.type === 'positive' ? 'border-green-200 bg-green-50' : 'border-stone-200'}>
                    <AlertDescription className="flex items-center gap-2">
                      <span>{ins.icon}</span><span className="text-sm">{ins.text}</span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Chart IBE */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">IBE semanal</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashData.weekly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ibe" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="IBE" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart attendance */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">Sessões por semana</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.weekly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#4a7c5a" name="Concluídas" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="no_show" fill="#c0392b" name="Faltas" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Slot popularity */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">Horários mais procurados</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dashData.slot_popularity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="time" type="category" width={48} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7a9e87" name="Agendamentos" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Employees table */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#6b4c35] uppercase tracking-wide">Colaboradores (anonimizados)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Sessões</TableHead>
                      <TableHead className="text-right">Concluídas</TableHead>
                      <TableHead className="text-right">Faltas</TableHead>
                      <TableHead className="text-right">Presença</TableHead>
                      <TableHead className="text-right">⭐ Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashData.employees.map(emp => (
                      <TableRow key={emp.display_name}>
                        <TableCell className="font-medium">{emp.display_name}</TableCell>
                        <TableCell className="text-right">{emp.sessions}</TableCell>
                        <TableCell className="text-right text-green-700">{emp.completed}</TableCell>
                        <TableCell className="text-right text-red-600">{emp.no_shows}</TableCell>
                        <TableCell className="text-right">{(emp.attend_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-right">{emp.avg_stars ?? '—'}</TableCell>
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
