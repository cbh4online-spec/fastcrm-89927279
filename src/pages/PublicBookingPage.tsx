import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay, isBefore, isAfter, parseISO, addMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarDays, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

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
}

interface TimeSlot {
  time: string;
  label: string;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<BookingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);

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
      setPage(data as unknown as BookingPageData);
      setLoading(false);
    }
    fetchPage();
  }, [slug]);

  // Available dates
  const availableDates = useMemo(() => {
    if (!page) return [];
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 1; i <= page.max_advance_days; i++) {
      const d = addDays(today, i);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) { // Skip weekends
        dates.push(d);
      }
    }
    return dates;
  }, [page]);

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

  // Generate time slots (9:00 - 18:00)
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!page || !selectedDate) return [];
    const slots: TimeSlot[] = [];
    const duration = page.duration_minutes;
    const buffer = page.buffer_minutes;
    const step = duration + buffer;

    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += step) {
        if (hour * 60 + min + duration > 18 * 60) break;
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hour, min, 0, 0);
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
  }, [page, selectedDate, existingEvents]);

  const handleSubmit = async () => {
    if (!page || !selectedDate || !selectedSlot || !guestName || !guestEmail) return;
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-booking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_page_id: page.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedSlot,
          guest_name: guestName,
          guest_email: guestEmail,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao agendar');
      setConfirmed(true);
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

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: page?.brand_color }} />
          <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
          <p className="text-muted-foreground mb-4">
            A sua reunião foi marcada para {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: pt })} às {selectedSlot}.
          </p>
          <p className="text-sm text-muted-foreground">Receberá uma confirmação por email.</p>
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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Selecione um dia</h3>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-auto">
              {availableDates.slice(0, 21).map(date => {
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

          {/* Time & Details */}
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
                <h3 className="font-medium mb-3">Os seus dados</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="O seu nome" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={!guestName || !guestEmail || submitting}
                    style={{ backgroundColor: page.brand_color }}
                  >
                    {submitting ? 'A agendar...' : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
