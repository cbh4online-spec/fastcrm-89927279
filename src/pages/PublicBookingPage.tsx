import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay, isBefore, isAfter, parseISO, addMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarDays, Clock, CheckCircle2, Loader2, AlertCircle, User, Mail, Phone, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface BookingPageData {
  id: string;
  calendar_id: string;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  max_advance_days: number;
  is_active: boolean;
  brand_color: string;
  working_days: number[];
  start_hour: string;
  end_hour: string;
  availability_id: string | null;
  require_phone: boolean;
  custom_message_label: string | null;
}

interface TimeSlot {
  time: string;
  label: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityException {
  exception_date: string;
  is_blocked: boolean;
}

type Step = 'info' | 'schedule' | 'confirmed';

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string; workspaceSlug?: string }>();
  const [page, setPage] = useState<BookingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('info');

  // Step 1 — Guest info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [savingLead, setSavingLead] = useState(false);

  // Step 2 — Schedule
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);

  // Availability data
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);
  const [availExceptions, setAvailExceptions] = useState<AvailabilityException[]>([]);

  // Fetch booking page
  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;
      const { data, error: err } = await supabase
        .from('booking_pages' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (err || !data) {
        setError('Link de agendamento não encontrado ou inativo.');
        setLoading(false);
        return;
      }
      const pageData = data as unknown as BookingPageData;
      setPage(pageData);

      // If linked to availability, fetch slots + exceptions
      if (pageData.availability_id) {
        const [slotsRes, exceptionsRes] = await Promise.all([
          supabase
            .from('availability_slots' as any)
            .select('day_of_week, start_time, end_time')
            .eq('availability_id', pageData.availability_id),
          supabase
            .from('availability_exceptions' as any)
            .select('exception_date, is_blocked')
            .eq('availability_id', pageData.availability_id),
        ]);
        if (slotsRes.data) setAvailSlots(slotsRes.data as unknown as AvailabilitySlot[]);
        if (exceptionsRes.data) setAvailExceptions(exceptionsRes.data as unknown as AvailabilityException[]);
      }
      setLoading(false);
    }
    fetchPage();
  }, [slug]);

  // Available dates using working_days config
  const availableDates = useMemo(() => {
    if (!page) return [];
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    const blockedDates = new Set(
      availExceptions.filter(e => e.is_blocked).map(e => e.exception_date)
    );

    for (let i = 1; i <= page.max_advance_days; i++) {
      const d = addDays(today, i);
      const dow = d.getDay();
      if (!page.working_days.includes(dow)) continue;
      const dateStr = format(d, 'yyyy-MM-dd');
      if (blockedDates.has(dateStr)) continue;

      // If availability_id, check if there are slots for this day_of_week
      if (page.availability_id && availSlots.length > 0) {
        const hasSlots = availSlots.some(s => s.day_of_week === dow);
        if (!hasSlots) continue;
      }
      dates.push(d);
    }
    return dates;
  }, [page, availSlots, availExceptions]);

  // Fetch events for selected date
  useEffect(() => {
    if (!selectedDate || !page) return;
    async function fetchEvents() {
      const dayStart = startOfDay(selectedDate!);
      const dayEnd = addDays(dayStart, 1);
      const { data } = await supabase
        .from('calendar_events')
        .select('start_time, end_time')
        .eq('calendar_id', page!.calendar_id)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString());
      setExistingEvents(data || []);
    }
    fetchEvents();
  }, [selectedDate, page]);

  // Generate time slots using start_hour/end_hour or availability_slots
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!page || !selectedDate) return [];
    const slots: TimeSlot[] = [];
    const duration = page.duration_minutes;
    const buffer = page.buffer_minutes;
    const step = duration + buffer;
    const dow = selectedDate.getDay();

    // Determine time ranges for this day
    let ranges: { start: string; end: string }[] = [];

    if (page.availability_id && availSlots.length > 0) {
      // Use availability slots for this day of week
      ranges = availSlots
        .filter(s => s.day_of_week === dow)
        .map(s => ({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) }));
    } else {
      // Use booking page start/end
      ranges = [{ start: page.start_hour, end: page.end_hour }];
    }

    for (const range of ranges) {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);
      const rangeStartMin = startH * 60 + startM;
      const rangeEndMin = endH * 60 + endM;

      for (let min = rangeStartMin; min + duration <= rangeEndMin; min += step) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
        const slotEnd = addMinutes(slotStart, duration);

        // Check overlap with existing events
        const hasConflict = existingEvents.some(ev => {
          const evStart = parseISO(ev.start_time);
          const evEnd = parseISO(ev.end_time);
          return isBefore(slotStart, evEnd) && isAfter(slotEnd, evStart);
        });

        if (!hasConflict && isAfter(slotStart, new Date())) {
          const timeStr = format(slotStart, 'HH:mm');
          slots.push({ time: timeStr, label: `${timeStr} - ${format(slotEnd, 'HH:mm')}` });
        }
      }
    }
    return slots;
  }, [page, selectedDate, existingEvents, availSlots]);

  // Step 1: Save lead
  const handleSaveLead = async () => {
    if (!page || !guestName || !guestEmail) return;
    if (page.require_phone && !guestPhone) return;
    setSavingLead(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-booking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lead',
          booking_page_id: page.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone || null,
          guest_message: guestMessage || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao guardar dados');
      setLeadId(result.lead_id);
      setStep('schedule');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingLead(false);
    }
  };

  // Step 2: Confirm booking
  const handleConfirmBooking = async () => {
    if (!page || !selectedDate || !selectedSlot || !leadId) return;
    setSubmitting(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-booking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_booking',
          booking_page_id: page.id,
          lead_id: leadId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedSlot,
          guest_name: guestName,
          guest_email: guestEmail,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao agendar');
      setStep('confirmed');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">{error}</p>
        </Card>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: page.brand_color }}>
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{page.title}</h1>
          {page.description && <p className="text-muted-foreground mt-2">{page.description}</p>}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {page.duration_minutes} min</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {(['info', 'schedule', 'confirmed'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s
                      ? 'text-white'
                      : ((['info', 'schedule', 'confirmed'].indexOf(step) > i)
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground')
                  }`}
                  style={step === s ? { backgroundColor: page.brand_color } : undefined}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="w-8 h-0.5 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Guest info */}
        {step === 'info' && (
          <Card className="p-6 max-w-md mx-auto">
            <h3 className="font-semibold mb-4 text-lg">Os seus dados</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nome *</Label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="O seu nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email *</Label>
                <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              {page.require_phone && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone *</Label>
                  <Input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+351 912 345 678" />
                </div>
              )}
              {page.custom_message_label && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {page.custom_message_label}</Label>
                  <Textarea value={guestMessage} onChange={e => setGuestMessage(e.target.value)} rows={3} placeholder="Escreva aqui..." />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full gap-2"
                onClick={handleSaveLead}
                disabled={!guestName || !guestEmail || (page.require_phone && !guestPhone) || savingLead}
                style={{ backgroundColor: page.brand_color }}
              >
                {savingLead ? 'A guardar...' : 'Continuar'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: Date/Time selection */}
        {step === 'schedule' && (
          <div>
            <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setStep('info')}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">Selecione um dia</h3>
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-auto">
                  {availableDates.slice(0, 30).map(date => {
                    const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                        className={`p-2 rounded-lg text-center text-sm transition-colors border ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground">{format(date, 'EEE', { locale: pt })}</div>
                        <div className="font-medium">{format(date, 'd')}</div>
                        <div className="text-xs text-muted-foreground">{format(date, 'MMM', { locale: pt })}</div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Time slots */}
              <div className="space-y-4">
                {selectedDate && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-3">
                      Horários — {format(selectedDate, "d 'de' MMMM", { locale: pt })}
                    </h3>
                    {timeSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem horários disponíveis neste dia.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-auto">
                        {timeSlots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`p-2 rounded-lg text-sm text-center transition-colors border ${
                              selectedSlot === slot.time
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:border-primary/50 hover:bg-muted'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {selectedSlot && (
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-3">
                      <strong>{guestName}</strong> · {format(selectedDate!, "d 'de' MMMM", { locale: pt })} · {selectedSlot}
                    </div>
                    {error && <p className="text-sm text-destructive mb-3">{error}</p>}
                    <Button
                      className="w-full"
                      onClick={handleConfirmBooking}
                      disabled={submitting}
                      style={{ backgroundColor: page.brand_color }}
                    >
                      {submitting ? 'A agendar...' : 'Confirmar Agendamento'}
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 'confirmed' && (
          <Card className="p-8 text-center max-w-md mx-auto">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: page.brand_color }} />
            <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-4">
              A sua reunião foi marcada para {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: pt })} às {selectedSlot}.
            </p>
            <p className="text-sm text-muted-foreground">Receberá uma confirmação por email.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
