import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBookingPage } from '@/hooks/useBookingPages';
import type { Calendar } from '@/hooks/useCalendars';

interface BookingPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
}

export function BookingPageModal({ open, onOpenChange, calendars }: BookingPageModalProps) {
  const createPage = useCreateBookingPage();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [buffer, setBuffer] = useState('0');
  const [maxDays, setMaxDays] = useState('30');
  const [brandColor, setBrandColor] = useState('#6366f1');

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
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async () => {
    if (!title || !slug || !calendarId) return;
    await createPage.mutateAsync({
      title,
      slug,
      calendar_id: calendarId,
      description,
      duration_minutes: parseInt(duration),
      buffer_minutes: parseInt(buffer),
      max_advance_days: parseInt(maxDays),
      is_active: true,
      brand_color: brandColor,
    });
    onOpenChange(false);
    setTitle('');
    setSlug('');
    setCalendarId('');
    setDescription('');
    setDuration('30');
    setBuffer('0');
    setMaxDays('30');
    setBrandColor('#6366f1');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Link de Agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
              <SelectTrigger>
                <SelectValue placeholder="Selecionar calendário" />
              </SelectTrigger>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="45">45</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buffer (min)</Label>
              <Select value={buffer} onValueChange={setBuffer}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max dias</Label>
              <Input type="number" value={maxDays} onChange={e => setMaxDays(e.target.value)} min={1} max={90} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">{brandColor}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title || !slug || !calendarId || createPage.isPending}>
            {createPage.isPending ? 'A criar...' : 'Criar Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
