'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import BackgroundBlobs from '@/components/BackgroundBlobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const SESSION_KEY = 'massage_user'

function LoginScreen({ onLogin }: { onLogin: (name: string, email: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Informe seu nome completo.')
    if (!email.trim()) return setError('Informe seu e-mail corporativo.')
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(email.trim())) return setError('Digite um e-mail válido.')
    onLogin(name.trim(), email.trim().toLowerCase())
  }

  return (
    <div className="relative min-h-screen bg-[#04003d] flex flex-col items-center px-6 pt-14 pb-16">
      <BackgroundBlobs />

      <div className="relative z-10 w-full max-w-[580px] flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Agendamento de Massagem</h1>
          <p className="text-sm text-white/45 mt-1 font-light tracking-wide">Cuide de você. Reserve sua sessão.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/saude-bem-estar.svg" alt="Saúde e Bem Estar" className="h-10 w-auto shrink-0 ml-6 drop-shadow-lg" />
      </div>

      <div className="relative z-10 w-full max-w-[580px] bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.50)] overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-[#04003d]">
          <Image src="/zen.jpg" alt="Bem estar corporativo" fill className="object-cover object-center" priority />
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-8 space-y-5">
          <div>
            <div className="mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888]">Identificação</span>
              <div className="mt-1 h-[2px] w-6 bg-[#dc0019] rounded-full" />
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Acesse com seu nome e e-mail corporativo para fazer seu agendamento.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Nome completo</Label>
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="h-10 text-sm border-neutral-200 focus-visible:ring-[#04003d]/20 focus-visible:border-[#04003d]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">E-mail corporativo</Label>
              <Input
                placeholder="voce@empresa.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 text-sm border-neutral-200 focus-visible:ring-[#04003d]/20 focus-visible:border-[#04003d]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-10 text-sm font-bold tracking-wide bg-[#04003d] hover:bg-[#04003d]/90">
            Acessar
          </Button>
        </form>
      </div>

      <a href="/backoffice" className="relative z-10 mt-6 text-[11px] text-white/25 hover:text-white/60 transition-colors tracking-wide">
        Back Office →
      </a>
    </div>
  )
}

interface Slot {
  time: string; booked: number; available: number
  full: boolean; past: boolean; too_soon: boolean
}
interface PendingEval { id: number; appointment_date: string; slot_time: string }

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}
function formatDateShort(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'long',
  })
}
function addWeeks(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888]">{children}</span>
      <div className="mt-1 h-[2px] w-6 bg-[#dc0019] rounded-full" />
    </div>
  )
}

type TabId = 'agendar' | 'meu-agendamento' | 'avaliar'
const TABS: { id: TabId; label: string }[] = [
  { id: 'agendar', label: 'Agendar' },
  { id: 'meu-agendamento', label: 'Meu Agendamento' },
  { id: 'avaliar', label: 'Avaliar' },
]

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [tab, setTab] = useState<TabId>('agendar')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [myBooking, setMyBooking] = useState<{ booking: string | null; appointment_id?: number; status?: string } | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingEvals, setPendingEvals] = useState<PendingEval[]>([])
  const [evalDialog, setEvalDialog] = useState<PendingEval | null>(null)
  const [stars, setStars] = useState(0)
  const [energyBefore, setEnergyBefore] = useState(0)
  const [energyAfter, setEnergyAfter] = useState(0)
  const [comment, setComment] = useState('')
  const [rotationMsg, setRotationMsg] = useState('')
  const [dateOffset, setDateOffset] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const { name: n, email: e } = JSON.parse(saved)
        if (n && e) { setName(n); setIdentifier(e); setLoggedIn(true) }
      } catch { /* ignore */ }
    }
  }, [])

  function handleLogin(n: string, e: string) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name: n, email: e }))
    setName(n); setIdentifier(e); setLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setLoggedIn(false); setName(''); setIdentifier('')
  }

  useEffect(() => {
    fetch('/api/next-wednesday').then(r => r.json()).then(d => setDate(d.date))
  }, [])

  const currentDate = date ? addWeeks(date, dateOffset) : ''

  const loadSlots = useCallback(async () => {
    if (!currentDate) return
    const r = await fetch(`/api/slots?date=${currentDate}`)
    const d = await r.json()
    if (d.slots) setSlots(d.slots)
  }, [currentDate])

  useEffect(() => { loadSlots() }, [loadSlots])

  const loadMyBooking = useCallback(async () => {
    if (!identifier.trim() || !currentDate) return
    const r = await fetch(`/api/my-booking?identifier=${encodeURIComponent(identifier.trim().toLowerCase())}&date=${currentDate}`)
    const d = await r.json()
    setMyBooking(d)
  }, [identifier, currentDate])

  useEffect(() => {
    const t = setTimeout(loadMyBooking, 600)
    return () => clearTimeout(t)
  }, [loadMyBooking])

  useEffect(() => {
    if (!identifier.trim()) return
    const t = setTimeout(async () => {
      const r = await fetch(`/api/pending-eval?identifier=${encodeURIComponent(identifier.trim().toLowerCase())}`)
      const d = await r.json()
      setPendingEvals(d.pending ?? [])
    }, 800)
    return () => clearTimeout(t)
  }, [identifier])

  useEffect(() => {
    if (!identifier.trim() || !currentDate) return
    const t = setTimeout(async () => {
      const r = await fetch(`/api/rotation-status?identifier=${encodeURIComponent(identifier.trim().toLowerCase())}&date=${currentDate}`)
      const d = await r.json()
      setRotationMsg(d.message ?? '')
    }, 600)
    return () => clearTimeout(t)
  }, [identifier, currentDate])

  async function handleBook() {
    if (!name.trim() || !identifier.trim() || !selectedSlot)
      return toast.error('Preencha seu nome, e-mail e selecione um horário.')
    setLoading(true)
    const r = await fetch('/api/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), identifier: identifier.trim().toLowerCase(), date: currentDate, slot_time: selectedSlot }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success(d.message); setSelectedSlot(''); loadSlots(); loadMyBooking() }
    else toast.error(d.error)
  }

  async function handleCancel() {
    if (!identifier.trim()) return
    setLoading(true)
    const r = await fetch('/api/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim().toLowerCase(), date: currentDate }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) { toast.success(d.message); setMyBooking(null); loadSlots() }
    else toast.error(d.error)
  }

  async function handleReschedule() {
    if (!selectedSlot || !name.trim() || !identifier.trim()) return
    setLoading(true)
    const r = await fetch('/api/reschedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), identifier: identifier.trim().toLowerCase(), date: currentDate, new_slot_time: selectedSlot }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success(d.message); setRescheduling(false); setSelectedSlot('')
      loadSlots(); loadMyBooking()
    } else toast.error(d.error)
  }

  async function handleEvaluate() {
    if (!evalDialog || !stars) return toast.error('Selecione uma avaliação de 1 a 5 estrelas.')
    const r = await fetch('/api/evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: evalDialog.id, stars, energy_before: energyBefore || null, energy_after: energyAfter || null, comment }),
    })
    const d = await r.json()
    if (d.success) {
      toast.success(d.message)
      setEvalDialog(null); setStars(0); setEnergyBefore(0); setEnergyAfter(0); setComment('')
      setPendingEvals(prev => prev.filter(e => e.id !== evalDialog.id))
    } else toast.error(d.error)
  }

  function slotClass(slot: Slot) {
    if (slot.full) return 'bg-red-50 border-red-200 opacity-60 cursor-not-allowed'
    if (slot.past) return 'bg-neutral-100 border-neutral-200 opacity-40 cursor-not-allowed'
    if (slot.too_soon) return 'bg-amber-50 border-amber-200 opacity-60 cursor-not-allowed'
    if (rescheduling && selectedSlot === slot.time) return 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
    if (!rescheduling && selectedSlot === slot.time) return 'bg-[#f0f0fd] border-[#04003d] ring-1 ring-[#04003d]/20'
    return 'bg-white border-neutral-200 hover:border-[#04003d] hover:shadow-sm cursor-pointer'
  }

  function vacancyColor(slot: Slot) {
    if (slot.full) return '#dc0019'
    if (slot.available === 1) return '#b87400'
    return '#04003d'
  }

  const disabled = (s: Slot) => s.full || s.past || s.too_soon
  const hasBooking = myBooking?.booking != null

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="relative min-h-screen bg-[#04003d] flex flex-col items-center px-6 pt-14 pb-16">

      {/* Animated background */}
      <BackgroundBlobs />

      {/* Page title — alinhado à largura do card */}
      <div className="relative z-10 w-full max-w-[580px] flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Agendamento de Massagem</h1>
          <p className="text-sm text-white/45 mt-1 font-light tracking-wide">Cuide de você. Reserve sua sessão.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/saude-bem-estar.svg" alt="Saúde e Bem Estar" className="h-10 w-auto shrink-0 ml-6 drop-shadow-lg" />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[580px] bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.50)] overflow-hidden">

        {/* Header image */}
        <div className="relative h-44 overflow-hidden bg-[#04003d]">
          <Image src="/zen.jpg" alt="Bem estar corporativo"
            fill className="object-cover object-center" priority />
        </div>

        {/* Tab bar — Carrilho DS outline navy com espaçamento */}
        <div className="flex gap-2.5 px-5 py-4 border-b border-neutral-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex-1 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest
                          border-2 transition-all duration-150
                ${tab === t.id
                  ? 'bg-[#04003d] text-white border-[#04003d]'
                  : 'bg-white text-[#04003d] border-[#04003d] hover:bg-[#f0f0fd]'}`}>
              {t.label}
              {t.id === 'avaliar' && pendingEvals.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#dc0019] text-white text-[9px] font-bold">
                  {pendingEvals.length}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#dc0019] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-7 py-6">

          {/* Agendar */}
          {tab === 'agendar' && (
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888]">
                    {(() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })()}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#04003d] leading-snug">{name} 👋</p>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 shrink-0 -mr-2 text-[11px] font-semibold text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-full px-3 py-1.5 transition-all duration-150">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sair
                </button>
              </div>
              {rotationMsg && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  {rotationMsg}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <SectionLabel>Horários disponíveis</SectionLabel>
                  <div className="flex items-center gap-1.5 text-xs -mt-2">
                    <button onClick={() => setDateOffset(o => Math.max(0, o - 1))} disabled={dateOffset === 0}
                      className="text-[#04003d] font-semibold hover:underline disabled:opacity-30 disabled:cursor-not-allowed">
                      Ant.
                    </button>
                    <span className="text-neutral-500 capitalize font-medium">
                      {currentDate ? formatDateShort(currentDate) : '…'}
                    </span>
                    <button onClick={() => setDateOffset(o => Math.min(3, o + 1))} disabled={dateOffset === 3}
                      className="text-[#04003d] font-semibold hover:underline disabled:opacity-30 disabled:cursor-not-allowed">
                      Próx.
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {slots.map(slot => (
                    <button key={slot.time} disabled={disabled(slot)}
                      onClick={() => !disabled(slot) && setSelectedSlot(slot.time === selectedSlot ? '' : slot.time)}
                      className={`relative rounded-lg border-2 py-2 px-1 text-center transition-all duration-150 ${slotClass(slot)}`}>
                      {myBooking?.booking === slot.time && (
                        <span className="absolute -top-1.5 -right-1.5 bg-[#04003d] text-white text-[8px] font-bold px-1 py-px rounded-full leading-none">
                          meu
                        </span>
                      )}
                      <div className="font-bold text-[13px] text-neutral-800">{slot.time}</div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: vacancyColor(slot) }}>
                        {slot.full ? 'Lotado' : slot.past ? 'Encerrado' : slot.too_soon ? 'Em breve' : `${slot.available} vaga${slot.available !== 1 ? 's' : ''}`}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedSlot && !rescheduling && !hasBooking && (
                  <div className="mt-3 p-3 bg-[#f0f0fd] rounded-xl border border-[#04003d]/15 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-sm text-[#04003d]">Horário: {selectedSlot}</p>
                      <p className="text-xs text-neutral-500 capitalize">{currentDate ? formatDate(currentDate) : ''}</p>
                    </div>
                    <Button size="sm" onClick={handleBook} disabled={loading} className="text-xs">
                      {loading ? 'Agendando…' : 'Confirmar'}
                    </Button>
                  </div>
                )}

                {rescheduling && selectedSlot && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-sm text-amber-800">Novo horário: {selectedSlot}</p>
                      <p className="text-xs text-amber-600">Substituirá {myBooking?.booking}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-8"
                        onClick={() => { setRescheduling(false); setSelectedSlot('') }}>Cancelar</Button>
                      <Button size="sm" onClick={handleReschedule} disabled={loading}
                        className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white">
                        {loading ? 'Reagendando…' : 'Confirmar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meu agendamento */}
          {tab === 'meu-agendamento' && (
            <div>
              <SectionLabel>Seu agendamento</SectionLabel>
              {!identifier.trim() ? (
                <p className="text-sm text-neutral-400">Informe seu e-mail na aba &quot;Agendar&quot; para ver seu agendamento.</p>
              ) : !hasBooking ? (
                <p className="text-sm text-neutral-400">Nenhum agendamento encontrado para esta data.</p>
              ) : (
                <div className="rounded-xl bg-[#f8f8f8] border border-neutral-200 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#04003d]/10 flex items-center justify-center text-xl shrink-0">💆</div>
                    <div className="min-w-0">
                      <p className="font-black text-lg text-[#04003d]">{myBooking?.booking}</p>
                      <p className="text-xs text-neutral-400 capitalize">{currentDate ? formatDate(currentDate) : ''}</p>
                    </div>
                    <Badge className="ml-auto shrink-0"
                      variant={myBooking?.status === 'completed' ? 'default' : myBooking?.status === 'no_show' ? 'destructive' : 'secondary'}>
                      {myBooking?.status === 'completed' ? 'Concluído' : myBooking?.status === 'no_show' ? 'Faltou' : 'Agendado'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="text-xs border-neutral-200"
                      onClick={() => { setRescheduling(true); setSelectedSlot(''); setTab('agendar') }}
                      disabled={myBooking?.status !== 'pending'}>Reagendar</Button>
                    <Button variant="destructive" size="sm" className="text-xs"
                      onClick={handleCancel} disabled={loading || myBooking?.status !== 'pending'}>
                      {loading ? 'Cancelando…' : 'Cancelar agendamento'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avaliar */}
          {tab === 'avaliar' && (
            <div>
              <SectionLabel>Sessões para avaliar</SectionLabel>
              {!identifier.trim() ? (
                <p className="text-sm text-neutral-400">Informe seu e-mail na aba &quot;Agendar&quot; para ver suas avaliações pendentes.</p>
              ) : pendingEvals.length === 0 ? (
                <p className="text-sm text-neutral-400">Nenhuma sessão aguardando avaliação.</p>
              ) : (
                <div className="space-y-2">
                  {pendingEvals.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white">
                      <div>
                        <p className="font-semibold text-sm text-[#04003d]">Sessão das {ev.slot_time}</p>
                        <p className="text-xs text-neutral-400 capitalize">{formatDate(ev.appointment_date)}</p>
                      </div>
                      <Button size="sm" onClick={() => setEvalDialog(ev)}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white">Avaliar ⭐</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <a href="/backoffice" className="relative z-10 mt-6 text-[11px] text-white/25 hover:text-white/60 transition-colors tracking-wide">
        Back Office →
      </a>

      {/* Evaluation Dialog */}
      <Dialog open={!!evalDialog} onOpenChange={o => !o && setEvalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black tracking-tight text-[#04003d]">Como foi sua massagem?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Avaliação geral</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setStars(n)}
                    className={`text-2xl transition-transform hover:scale-110 ${stars >= n ? '' : 'opacity-25'}`}>⭐</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Energia antes (1–5)</Label>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setEnergyBefore(energyBefore === n ? 0 : n)}
                    className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all
                      ${energyBefore === n ? 'bg-[#04003d] border-[#04003d] text-white' : 'border-neutral-200 text-neutral-400 hover:border-[#04003d]'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Energia depois (1–5)</Label>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setEnergyAfter(energyAfter === n ? 0 : n)}
                    className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all
                      ${energyAfter === n ? 'bg-[#04003d] border-[#04003d] text-white' : 'border-neutral-200 text-neutral-400 hover:border-[#04003d]'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Comentário (opcional)</Label>
              <Textarea placeholder="Como foi a sessão?" value={comment} onChange={e => setComment(e.target.value)}
                className="text-sm border-neutral-200 focus-visible:ring-[#04003d]/20 focus-visible:border-[#04003d]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialog(null)} className="border-neutral-200 text-sm">Cancelar</Button>
            <Button onClick={handleEvaluate} disabled={!stars} className="text-sm">Enviar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
