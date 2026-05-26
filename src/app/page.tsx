'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Slot {
  time: string
  booked: number
  available: number
  full: boolean
  past: boolean
  too_soon: boolean
}

interface PendingEval {
  id: number
  appointment_date: string
  slot_time: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

function addWeeks(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

export default function Home() {
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), identifier: identifier.trim().toLowerCase(), date: currentDate, slot_time: selectedSlot }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success(d.message)
      setSelectedSlot('')
      loadSlots(); loadMyBooking()
    } else {
      toast.error(d.error)
    }
  }

  async function handleCancel() {
    if (!identifier.trim()) return
    setLoading(true)
    const r = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim().toLowerCase(), date: currentDate }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success(d.message); setMyBooking(null); loadSlots()
    } else {
      toast.error(d.error)
    }
  }

  async function handleReschedule() {
    if (!selectedSlot || !name.trim() || !identifier.trim()) return
    setLoading(true)
    const r = await fetch('/api/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), identifier: identifier.trim().toLowerCase(), date: currentDate, new_slot_time: selectedSlot }),
    })
    const d = await r.json()
    setLoading(false)
    if (d.success) {
      toast.success(d.message); setRescheduling(false); setSelectedSlot('')
      loadSlots(); loadMyBooking()
    } else {
      toast.error(d.error)
    }
  }

  async function handleEvaluate() {
    if (!evalDialog || !stars) return toast.error('Selecione uma avaliação de 1 a 5 estrelas.')
    const r = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: evalDialog.id, stars, energy_before: energyBefore || null, energy_after: energyAfter || null, comment }),
    })
    const d = await r.json()
    if (d.success) {
      toast.success(d.message)
      setEvalDialog(null); setStars(0); setEnergyBefore(0); setEnergyAfter(0); setComment('')
      setPendingEvals(prev => prev.filter(e => e.id !== evalDialog.id))
    } else {
      toast.error(d.error)
    }
  }

  function slotClass(slot: Slot) {
    if (slot.full) return 'bg-red-50 border-red-200 opacity-60 cursor-not-allowed'
    if (slot.past) return 'bg-stone-100 border-stone-200 opacity-40 cursor-not-allowed'
    if (slot.too_soon) return 'bg-amber-50 border-amber-200 opacity-70 cursor-not-allowed'
    if (rescheduling && selectedSlot === slot.time) return 'bg-amber-100 border-amber-500 ring-2 ring-amber-300'
    if (!rescheduling && selectedSlot === slot.time) return 'bg-green-50 border-green-500 ring-2 ring-green-200'
    return 'bg-white border-stone-200 hover:border-green-400 hover:shadow-md cursor-pointer'
  }

  function vacancyClass(slot: Slot) {
    if (slot.full) return 'text-red-500'
    if (slot.available === 1) return 'text-amber-500'
    return 'text-green-600'
  }

  const disabled = (s: Slot) => s.full || s.past || s.too_soon
  const hasBooking = myBooking?.booking != null

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-[#7a9e87] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">💆</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Agendamento de Massagem</h1>
            <p className="text-sm opacity-80">Carrilho Bem-Estar · Benefício RH</p>
          </div>
          <a href="/backoffice" className="ml-auto text-xs text-white/60 hover:text-white transition-colors">Back Office →</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Tabs defaultValue="agendar">
          <TabsList className="w-full">
            <TabsTrigger value="agendar" className="flex-1">Agendar</TabsTrigger>
            <TabsTrigger value="meu-agendamento" className="flex-1">Meu Agendamento</TabsTrigger>
            <TabsTrigger value="avaliar" className="flex-1">
              Avaliar
              {pendingEvals.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0">{pendingEvals.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agendar" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#7a9e87] uppercase tracking-wide">Seus dados</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail corporativo</Label>
                    <Input placeholder="voce@empresa.com" type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} />
                  </div>
                </div>
                {rotationMsg && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{rotationMsg}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm text-[#7a9e87] uppercase tracking-wide">Horários disponíveis</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDateOffset(o => Math.max(0, o - 1))} disabled={dateOffset === 0}>← Ant.</Button>
                    <span className="text-sm font-medium capitalize text-stone-700">{currentDate ? formatDate(currentDate) : '...'}</span>
                    <Button size="sm" variant="outline" onClick={() => setDateOffset(o => Math.min(3, o + 1))} disabled={dateOffset === 3}>Próx. →</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={disabled(slot)}
                      onClick={() => !disabled(slot) && setSelectedSlot(slot.time === selectedSlot ? '' : slot.time)}
                      className={`relative rounded-xl border-2 p-3 text-center transition-all duration-150 ${slotClass(slot)}`}
                    >
                      {myBooking?.booking === slot.time && (
                        <span className="absolute -top-2 -right-2 bg-[#7a9e87] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">meu</span>
                      )}
                      <div className="font-bold text-stone-800">{slot.time}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${vacancyClass(slot)}`}>
                        {slot.full ? 'Lotado' : slot.past ? 'Encerrado' : slot.too_soon ? 'Em breve' : `${slot.available} vaga${slot.available !== 1 ? 's' : ''}`}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedSlot && !rescheduling && !hasBooking && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-green-800">Horário selecionado: {selectedSlot}</p>
                      <p className="text-sm text-green-600 capitalize">{currentDate ? formatDate(currentDate) : ''}</p>
                    </div>
                    <Button onClick={handleBook} disabled={loading} className="bg-[#7a9e87] hover:bg-[#6b8e78]">
                      {loading ? 'Agendando...' : 'Confirmar agendamento'}
                    </Button>
                  </div>
                )}

                {rescheduling && selectedSlot && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-amber-800">Novo horário: {selectedSlot}</p>
                      <p className="text-sm text-amber-600">Substituirá {myBooking?.booking}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setRescheduling(false); setSelectedSlot('') }}>Cancelar</Button>
                      <Button onClick={handleReschedule} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                        {loading ? 'Reagendando...' : 'Confirmar'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meu-agendamento" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#7a9e87] uppercase tracking-wide">Seu agendamento</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!identifier.trim() ? (
                  <p className="text-stone-500 text-sm">Informe seu e-mail na aba &quot;Agendar&quot; para ver seu agendamento.</p>
                ) : !hasBooking ? (
                  <p className="text-stone-500 text-sm">Nenhum agendamento encontrado para esta data.</p>
                ) : (
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#7a9e87]/10 flex items-center justify-center text-2xl">💆</div>
                      <div>
                        <p className="font-bold text-stone-800 text-lg">{myBooking?.booking}</p>
                        <p className="text-sm text-stone-500 capitalize">{currentDate ? formatDate(currentDate) : ''}</p>
                      </div>
                      <Badge className="ml-auto" variant={myBooking?.status === 'completed' ? 'default' : myBooking?.status === 'no_show' ? 'destructive' : 'secondary'}>
                        {myBooking?.status === 'completed' ? 'Concluído' : myBooking?.status === 'no_show' ? 'Faltou' : 'Agendado'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setRescheduling(true); setSelectedSlot('') }} disabled={myBooking?.status !== 'pending'}>
                        Reagendar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleCancel} disabled={loading || myBooking?.status !== 'pending'}>
                        {loading ? 'Cancelando...' : 'Cancelar agendamento'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avaliar" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#7a9e87] uppercase tracking-wide">Sessões para avaliar</CardTitle></CardHeader>
              <CardContent>
                {!identifier.trim() ? (
                  <p className="text-stone-500 text-sm">Informe seu e-mail na aba &quot;Agendar&quot; para ver suas avaliações pendentes.</p>
                ) : pendingEvals.length === 0 ? (
                  <p className="text-stone-500 text-sm">Nenhuma sessão aguardando avaliação.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingEvals.map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50">
                        <div>
                          <p className="font-medium text-stone-800">Sessão das {ev.slot_time}</p>
                          <p className="text-sm text-stone-500 capitalize">{formatDate(ev.appointment_date)}</p>
                        </div>
                        <Button size="sm" onClick={() => setEvalDialog(ev)} className="bg-amber-500 hover:bg-amber-600 text-white">
                          Avaliar ⭐
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!evalDialog} onOpenChange={o => !o && setEvalDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Como foi sua massagem?</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Avaliação geral</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setStars(n)} className={`text-2xl transition-transform hover:scale-110 ${stars >= n ? '' : 'opacity-30'}`}>⭐</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Energia antes (1–5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setEnergyBefore(energyBefore === n ? 0 : n)}
                    className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all
                      ${energyBefore === n ? 'bg-[#7a9e87] border-[#7a9e87] text-white' : 'border-stone-300 text-stone-500 hover:border-[#7a9e87]'}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Energia depois (1–5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setEnergyAfter(energyAfter === n ? 0 : n)}
                    className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all
                      ${energyAfter === n ? 'bg-[#7a9e87] border-[#7a9e87] text-white' : 'border-stone-300 text-stone-500 hover:border-[#7a9e87]'}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea placeholder="Como foi a sessão?" value={comment} onChange={e => setComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialog(null)}>Cancelar</Button>
            <Button onClick={handleEvaluate} disabled={!stars} className="bg-[#7a9e87] hover:bg-[#6b8e78]">Enviar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
