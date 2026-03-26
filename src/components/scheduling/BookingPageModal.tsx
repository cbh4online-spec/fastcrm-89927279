import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCreateBookingPage, useUpdateBookingPage, type BookingPage } from '@/hooks/useBookingPages';
import type { Calendar } from '@/hooks/useCalendars';

interface BookingPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
  editingPage?: BookingPage | null;
}

const DAY_LABELS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

export function BookingPageModal({ open, onOpenChange, calendars, editingPage }: BookingPageModalProps) {
  const createPage = useCreateBookingPage();
  const updatePage = useUpdateBookingPage();
  const isEditing = !!editingPage;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [buffer, setBuffer] = useState('0');
  const [maxDays, setMaxDays] = useState('30');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [requirePhone, setRequirePhone] = useState(false);
  const [customMessageLabel, setCustomMessageLabel] = useState('');

  // Populate form when editing
  useState(() => {
    if (editingPage) {
      setTitle(editingPage.title);
      setSlug(editingPage.slug);
      setCalendarId(editingPage.calendar_id);
      setDescription(editingPage.description || '');
      setDuration(String(editingPage.duration_minutes));
      setBuffer(String(editingPage.buffer_minutes));
      setMaxDays(String(editingPage.max_advance_days));
      setBrandColor(editingPage.brand_color);
      setWorkingDays(editingPage.working_days);
      setStartHour(editingPage.start_hour);
      setEndHour(editingPage.end_hour);
      setRequirePhone(editingPage.require_phone);
      setCustomMessageLabel(editingPage.custom_message_label || '');
    } else {
      resetForm();
    }
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing && (!slug || slug === generateSlug(title))) {
      setSlug(generateSlug(value));
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (!title || !slug || !calendarId || workingDays.length === 0) return;
    const payload = {
      title,
      slug,
      calendar_id: calendarId,
      description,
      duration_minutes: parseInt(duration),
      buffer_minutes: parseInt(buffer),
      max_advance_days: parseInt(maxDays),
      is_active: editingPage?.is_active ?? true,
      brand_color: brandColor,
      working_days: workingDays,
      start_hour: startHour,
      end_hour: endHour,
      availability_id: editingPage?.availability_id ?? null,
      require_phone: requirePhone,
      custom_message_label: customMessageLabel || null,
    };
    if (isEditing) {
      await updatePage.mutateAsync({ id: editingPage!.id, ...payload });
    } else {
      await createPage.mutateAsync(payload);
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setSlug(''); setCalendarId(''); setDescription('');
    setDuration('30'); setBuffer('0'); setMaxDays('30'); setBrandColor('#6366f1');
    setWorkingDays([1, 2, 3, 4, 5]); setStartHour('09:00'); setEndHour('18:00');
    setRequirePhone(false); setCustomMessageLabel('');
  };

  const isPending = createPage.isPending || updatePage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Link de Agendamento' : 'Novo Link de Agendamento'}</DialogTitle>
        </DialogHeader>
        </DialogHeader>
        <div className="space-y-5">
          {/* Basic info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Reunião com João" value={title} onChange={e => handleTitleChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/book/</span>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="reuniao-joao" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Calendário</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger><SelectValue placeholder="Selecionar calendário" /></SelectTrigger>
                <SelectContent>
                  {calendars.map(cal => (
                    <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Instruções para o cliente..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          <Separator />

          {/* Schedule config */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Configuração de horários</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buffer (min)</Label>
                <Select value={buffer} onValueChange={setBuffer}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 30].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max dias</Label>
                <Input type="number" value={maxDays} onChange={e => setMaxDays(e.target.value)} min={1} max={90} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias disponíveis</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      workingDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hora início</Label>
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora fim</Label>
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lead capture config */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Campos do formulário</h4>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir telefone</Label>
              <Switch checked={requirePhone} onCheckedChange={setRequirePhone} />
            </div>
            <div className="space-y-2">
              <Label>Campo de mensagem (opcional)</Label>
              <Input
                placeholder="Ex: Descreva o motivo da reunião"
                value={customMessageLabel}
                onChange={e => setCustomMessageLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para não mostrar campo de mensagem</p>
            </div>
          </div>

          <Separator />

          {/* Branding */}
          <div className="space-y-2">
            <Label>Cor da marca</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">{brandColor}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title || !slug || !calendarId || workingDays.length === 0 || isPending}>
            {isPending ? (isEditing ? 'A guardar...' : 'A criar...') : (isEditing ? 'Guardar Alterações' : 'Criar Link')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
