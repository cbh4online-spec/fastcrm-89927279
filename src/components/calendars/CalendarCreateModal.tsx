import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type { Calendar, CalendarGroup, CreateCalendarData } from '@/hooks/useCalendars';

const calendarSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  calendar_type: z.enum(['client', 'internal', 'event']),
  group_id: z.string().optional(),
  color: z.string().default('#3B82F6'),
  timezone: z.string().default('Europe/Lisbon'),
  default_duration: z.number().min(5).max(480).default(60),
  buffer_before: z.number().min(0).max(120).default(0),
  buffer_after: z.number().min(0).max(120).default(0),
  is_public: z.boolean().default(false),
});

type CalendarFormData = z.infer<typeof calendarSchema>;

interface CalendarCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CalendarGroup[];
  calendar?: Calendar | null;
  onSubmit: (data: CreateCalendarData) => Promise<void>;
  onDelete?: (id: string) => Promise<boolean>;
}

const colorOptions = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Cinza' },
  { value: '#14B8A6', label: 'Turquesa' },
];

export function CalendarCreateModal({
  open,
  onOpenChange,
  groups,
  calendar,
  onSubmit,
  onDelete,
}: CalendarCreateModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!calendar || !onDelete) return;
    
    const confirmed = window.confirm('Tem a certeza que deseja eliminar este calendário? Esta ação não pode ser revertida.');
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      await onDelete(calendar.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CalendarFormData>({
    resolver: zodResolver(calendarSchema),
    defaultValues: calendar
      ? {
          name: calendar.name,
          description: calendar.description || '',
          calendar_type: calendar.calendar_type,
          group_id: calendar.group_id || undefined,
          color: calendar.color,
          timezone: calendar.timezone,
          default_duration: calendar.default_duration,
          buffer_before: calendar.buffer_before,
          buffer_after: calendar.buffer_after,
          is_public: calendar.is_public,
        }
      : {
          name: '',
          description: '',
          calendar_type: 'internal',
          color: '#3B82F6',
          timezone: 'Europe/Lisbon',
          default_duration: 60,
          buffer_before: 0,
          buffer_after: 0,
          is_public: false,
        },
  });

  // Reset form when calendar changes (for editing)
  useEffect(() => {
    if (open) {
      if (calendar) {
        form.reset({
          name: calendar.name,
          description: calendar.description || '',
          calendar_type: calendar.calendar_type,
          group_id: calendar.group_id || undefined,
          color: calendar.color,
          timezone: calendar.timezone,
          default_duration: calendar.default_duration,
          buffer_before: calendar.buffer_before,
          buffer_after: calendar.buffer_after,
          is_public: calendar.is_public,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          calendar_type: 'internal',
          color: '#3B82F6',
          timezone: 'Europe/Lisbon',
          default_duration: 60,
          buffer_before: 0,
          buffer_after: 0,
          is_public: false,
        });
      }
    }
  }, [open, calendar, form]);

  const handleSubmit = async (data: CalendarFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: data.name,
        description: data.description,
        calendar_type: data.calendar_type,
        group_id: data.group_id === 'none' ? undefined : data.group_id,
        color: data.color,
        timezone: data.timezone,
        default_duration: data.default_duration,
        buffer_before: data.buffer_before,
        buffer_after: data.buffer_after,
        is_public: data.is_public,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {calendar ? 'Editar Calendário' : 'Novo Calendário'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reuniões com clientes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do calendário..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calendar_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Interno</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="event">Evento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem grupo</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.onChange(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="default_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração padrão (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buffer_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer antes (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buffer_after"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer depois (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Calendário público</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Visível para todos os membros do workspace
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-between">
              {calendar && onDelete ? (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'A eliminar...' : 'Eliminar'}
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'A guardar...' : calendar ? 'Guardar' : 'Criar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
