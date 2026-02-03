import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Video, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityPicker } from '@/components/common/EntityPicker';
import type { Calendar as CalendarType, CalendarEvent, CreateEventData } from '@/hooks/useCalendars';

const eventSchema = z.object({
  calendar_id: z.string().min(1, 'Selecione um calendário'),
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  start_date: z.date(),
  start_time: z.string(),
  end_date: z.date(),
  end_time: z.string(),
  all_day: z.boolean().default(false),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  status: z.enum(['tentative', 'confirmed', 'cancelled']).default('confirmed'),
  contact_id: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: CalendarType[];
  event?: CalendarEvent | null;
  defaultDate?: Date;
  onSubmit: (data: CreateEventData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CalendarEventModal({
  open,
  onOpenChange,
  calendars,
  event,
  defaultDate = new Date(),
  onSubmit,
  onDelete,
}: CalendarEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityValue, setEntityValue] = useState<{ contactId?: string | null; companyId?: string | null }>({
    contactId: null,
    companyId: null,
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          calendar_id: event.calendar_id,
          title: event.title,
          description: event.description || '',
          start_date: new Date(event.start_time),
          start_time: format(new Date(event.start_time), 'HH:mm'),
          end_date: new Date(event.end_time),
          end_time: format(new Date(event.end_time), 'HH:mm'),
          all_day: event.all_day,
          location: event.location || '',
          meeting_url: event.meeting_url || '',
          status: event.status,
          contact_id: event.contact_id || null,
          company_id: event.company_id || null,
        }
      : {
          calendar_id: calendars[0]?.id || '',
          title: '',
          description: '',
          start_date: defaultDate,
          start_time: format(defaultDate, 'HH:mm'),
          end_date: defaultDate,
          end_time: format(new Date(defaultDate.getTime() + 60 * 60 * 1000), 'HH:mm'),
          all_day: false,
          location: '',
          meeting_url: '',
          status: 'confirmed',
          contact_id: null,
          company_id: null,
        },
  });

  // Update entityValue when event changes
  useEffect(() => {
    if (event) {
      setEntityValue({
        contactId: event.contact_id || null,
        companyId: event.company_id || null,
      });
    } else {
      setEntityValue({ contactId: null, companyId: null });
    }
  }, [event]);

  const handleSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const [startHour, startMin] = data.start_time.split(':').map(Number);
      const [endHour, endMin] = data.end_time.split(':').map(Number);

      const startTime = new Date(data.start_date);
      startTime.setHours(startHour, startMin, 0, 0);

      const endTime = new Date(data.end_date);
      endTime.setHours(endHour, endMin, 0, 0);

      await onSubmit({
        calendar_id: data.calendar_id,
        title: data.title,
        description: data.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: data.all_day,
        location: data.location,
        meeting_url: data.meeting_url,
        status: data.status,
        contact_id: entityValue.contactId || undefined,
        company_id: entityValue.companyId || undefined,
      });
      form.reset();
      setEntityValue({ contactId: null, companyId: null });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (event && onDelete) {
      await onDelete(event.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="calendar_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendário</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar calendário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {calendars.filter(c => c.status === 'active').map(calendar => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: calendar.color }}
                            />
                            {calendar.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião com cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entity Picker for Contact/Company */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Cliente/Contacto
              </FormLabel>
              <EntityPicker
                value={entityValue}
                onChange={setEntityValue}
                placeholder="Associar a contacto ou empresa..."
              />
            </div>

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Dia inteiro</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!form.watch('all_day') && (
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora início</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data fim</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecionar'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!form.watch('all_day') && (
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora fim</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes do evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Localização
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço ou sala" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meeting_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Link de reunião
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="URL da videochamada" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="tentative">Tentativo</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {event && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : event ? 'Guardar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
