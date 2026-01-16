import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarIcon, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { UserAvailability, CreateSlotData, CreateExceptionData } from '@/hooks/useAvailability';
import type { Calendar as CalendarType } from '@/hooks/useCalendars';

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const TIMEZONES = [
  { value: 'Europe/Lisbon', label: 'Lisboa (WET/WEST)' },
  { value: 'Europe/London', label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'America/New_York', label: 'Nova Iorque (EST/EDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'UTC', label: 'UTC' },
];

const DEFAULT_SLOTS: CreateSlotData[] = [
  { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
  { day_of_week: 1, start_time: '14:00', end_time: '18:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '13:00' },
  { day_of_week: 2, start_time: '14:00', end_time: '18:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '13:00' },
  { day_of_week: 3, start_time: '14:00', end_time: '18:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '13:00' },
  { day_of_week: 4, start_time: '14:00', end_time: '18:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '13:00' },
  { day_of_week: 5, start_time: '14:00', end_time: '18:00' },
];

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  availability?: UserAvailability | null;
  calendars: CalendarType[];
  onSave: (data: {
    name: string;
    timezone: string;
    is_default: boolean;
    slots: CreateSlotData[];
  }) => Promise<void>;
  onUpdateSlots?: (availabilityId: string, slots: CreateSlotData[]) => Promise<void>;
  onAddException?: (availabilityId: string, data: CreateExceptionData) => Promise<void>;
  onRemoveException?: (exceptionId: string) => Promise<void>;
  onAssignCalendar?: (availabilityId: string, calendarId: string) => Promise<void>;
  onRemoveCalendarAssignment?: (assignmentId: string) => Promise<void>;
}

export function AvailabilityModal({
  isOpen,
  onClose,
  availability,
  calendars,
  onSave,
  onUpdateSlots,
  onAddException,
  onRemoveException,
  onAssignCalendar,
  onRemoveCalendarAssignment,
}: AvailabilityModalProps) {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Lisbon');
  const [isDefault, setIsDefault] = useState(false);
  const [slots, setSlots] = useState<CreateSlotData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Exception form
  const [exceptionDate, setExceptionDate] = useState<Date>();
  const [exceptionType, setExceptionType] = useState<'unavailable' | 'custom'>('unavailable');
  const [exceptionStart, setExceptionStart] = useState('09:00');
  const [exceptionEnd, setExceptionEnd] = useState('18:00');
  const [exceptionReason, setExceptionReason] = useState('');

  // Calendar assignment
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  const isEditing = !!availability;

  useEffect(() => {
    if (availability) {
      setName(availability.name);
      setTimezone(availability.timezone);
      setIsDefault(availability.is_default);
      setSlots(
        (availability.slots || []).map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
        }))
      );
    } else {
      setName('Horário Principal');
      setTimezone('Europe/Lisbon');
      setIsDefault(true);
      setSlots([...DEFAULT_SLOTS]);
    }
    setActiveTab('basic');
  }, [availability, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({ name, timezone, is_default: isDefault, slots });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSlots = async () => {
    if (!availability?.id || !onUpdateSlots) return;

    setIsSubmitting(true);
    try {
      await onUpdateSlots(availability.id, slots);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSlot = (dayOfWeek: number) => {
    setSlots([...slots, { day_of_week: dayOfWeek, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof CreateSlotData, value: string | number) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const copyDaySlots = (fromDay: number, toDay: number) => {
    const daySlots = slots.filter(s => s.day_of_week === fromDay);
    const otherSlots = slots.filter(s => s.day_of_week !== toDay);
    const copiedSlots = daySlots.map(s => ({ ...s, day_of_week: toDay }));
    setSlots([...otherSlots, ...copiedSlots]);
  };

  const handleAddException = async () => {
    if (!availability?.id || !onAddException || !exceptionDate) return;

    await onAddException(availability.id, {
      exception_date: format(exceptionDate, 'yyyy-MM-dd'),
      exception_type: exceptionType,
      start_time: exceptionType === 'custom' ? exceptionStart : undefined,
      end_time: exceptionType === 'custom' ? exceptionEnd : undefined,
      reason: exceptionReason || undefined,
    });

    setExceptionDate(undefined);
    setExceptionReason('');
  };

  const handleAssignCalendar = async () => {
    if (!availability?.id || !onAssignCalendar || !selectedCalendarId) return;

    await onAssignCalendar(availability.id, selectedCalendarId);
    setSelectedCalendarId('');
  };

  const assignedCalendarIds = (availability?.calendar_assignments || []).map(a => a.calendar_id);
  const availableCalendars = calendars.filter(c => !assignedCalendarIds.includes(c.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Disponibilidade' : 'Nova Disponibilidade'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="exceptions" disabled={!isEditing}>
              Exceções
            </TabsTrigger>
            <TabsTrigger value="calendars" disabled={!isEditing}>
              Calendários
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Horário de Trabalho"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Disponibilidade Principal</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar como disponibilidade padrão para novos calendários
                  </p>
                </div>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const daySlots = slots
                  .map((s, i) => ({ ...s, index: i }))
                  .filter(s => s.day_of_week === day)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div key={day} className="space-y-2 border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{DAY_NAMES[day]}</span>
                      <div className="flex gap-1">
                        {day > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copiar de
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40" align="end">
                              <div className="space-y-1">
                                {[1, 2, 3, 4, 5, 6, 0]
                                  .filter(d => d !== day)
                                  .map(d => (
                                    <Button
                                      key={d}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start"
                                      onClick={() => copyDaySlots(d, day)}
                                    >
                                      {DAY_NAMES[d]}
                                    </Button>
                                  ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => addSlot(day)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>

                    {daySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Indisponível</p>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map(slot => (
                          <div key={slot.index} className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={slot.start_time}
                              onChange={e => updateSlot(slot.index, 'start_time', e.target.value)}
                              className="w-28"
                            />
                            <span className="text-muted-foreground">até</span>
                            <Input
                              type="time"
                              value={slot.end_time}
                              onChange={e => updateSlot(slot.index, 'end_time', e.target.value)}
                              className="w-28"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSlot(slot.index)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isEditing && (
                <Button onClick={handleSaveSlots} disabled={isSubmitting} className="w-full">
                  Guardar Horários
                </Button>
              )}
            </TabsContent>

            <TabsContent value="exceptions" className="space-y-4 mt-4">
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Nova Exceção</h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exceptionDate ? (
                            format(exceptionDate, 'PPP', { locale: pt })
                          ) : (
                            <span className="text-muted-foreground">Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exceptionDate}
                          onSelect={setExceptionDate}
                          locale={pt}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={exceptionType} onValueChange={(v: 'unavailable' | 'custom') => setExceptionType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unavailable">Indisponível (dia todo)</SelectItem>
                        <SelectItem value="custom">Horário personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {exceptionType === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={exceptionStart}
                      onChange={e => setExceptionStart(e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={exceptionEnd}
                      onChange={e => setExceptionEnd(e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={exceptionReason}
                    onChange={e => setExceptionReason(e.target.value)}
                    placeholder="Ex: Férias, Feriado, Consulta..."
                  />
                </div>

                <Button onClick={handleAddException} disabled={!exceptionDate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Exceção
                </Button>
              </div>

              {(availability?.exceptions || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Exceções Configuradas</h4>
                  <div className="space-y-2">
                    {(availability?.exceptions || [])
                      .sort((a, b) => a.exception_date.localeCompare(b.exception_date))
                      .map(exception => (
                        <div
                          key={exception.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {format(new Date(exception.exception_date), 'PPP', { locale: pt })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {exception.exception_type === 'unavailable'
                                ? 'Indisponível'
                                : `${exception.start_time?.slice(0, 5)} - ${exception.end_time?.slice(0, 5)}`}
                              {exception.reason && ` • ${exception.reason}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveException?.(exception.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendars" className="space-y-4 mt-4">
              {availableCalendars.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar calendário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCalendars.map(calendar => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: calendar.color || '#3B82F6' }}
                            />
                            {calendar.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignCalendar} disabled={!selectedCalendarId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Associar
                  </Button>
                </div>
              )}

              {(availability?.calendar_assignments || []).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium">Calendários Associados</h4>
                  <div className="space-y-2">
                    {(availability?.calendar_assignments || []).map(assignment => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: assignment.calendar?.color || '#3B82F6' }}
                          />
                          <span>{assignment.calendar?.name || 'Calendário'}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveCalendarAssignment?.(assignment.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum calendário associado. Associe esta disponibilidade a calendários para controlar quando pode ser marcado.
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {activeTab === 'basic' && (
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isEditing ? 'Guardar' : 'Criar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
