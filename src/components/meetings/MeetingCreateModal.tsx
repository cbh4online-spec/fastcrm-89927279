import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  Video, 
  MapPin, 
  Phone, 
  MessageCircle,
  Users,
  Building2,
  User,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  Meeting, 
  MeetingType, 
  CreateMeetingData, 
  MeetingCategory, 
  MeetingMode 
} from '@/hooks/useMeetings';

const meetingSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  category: z.enum(['client', 'internal', 'hybrid']),
  mode: z.enum(['online', 'in_person', 'phone', 'whatsapp']),
  meeting_type_id: z.string().optional(),
  start_date: z.date(),
  start_time: z.string(),
  duration: z.number().min(15).max(480),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  phone_number: z.string().optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  internal_notes: z.string().optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingTypes: MeetingType[];
  meeting?: Meeting | null;
  defaultDate?: Date;
  onSubmit: (data: CreateMeetingData) => Promise<void>;
}

const categoryConfig: Record<MeetingCategory, { label: string; icon: typeof Users; color: string }> = {
  client: { label: 'Cliente', icon: User, color: 'bg-blue-500' },
  internal: { label: 'Interna', icon: Users, color: 'bg-purple-500' },
  hybrid: { label: 'Híbrida', icon: Building2, color: 'bg-green-500' },
};

const modeConfig: Record<MeetingMode, { label: string; icon: typeof Video }> = {
  online: { label: 'Online', icon: Video },
  in_person: { label: 'Presencial', icon: MapPin },
  phone: { label: 'Telefone', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
};

export function MeetingCreateModal({
  open,
  onOpenChange,
  meetingTypes,
  meeting,
  defaultDate = new Date(),
  onSubmit,
}: MeetingCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: meeting
      ? {
          title: meeting.title,
          description: meeting.description || '',
          category: meeting.category,
          mode: meeting.mode,
          meeting_type_id: meeting.meeting_type_id || undefined,
          start_date: new Date(meeting.start_time),
          start_time: format(new Date(meeting.start_time), 'HH:mm'),
          duration: Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000),
          location: meeting.location || '',
          meeting_url: meeting.meeting_url || '',
          phone_number: meeting.phone_number || '',
          contact_id: meeting.contact_id || undefined,
          company_id: meeting.company_id || undefined,
          internal_notes: meeting.internal_notes || '',
        }
      : {
          title: '',
          description: '',
          category: 'client',
          mode: 'online',
          start_date: defaultDate,
          start_time: format(defaultDate, 'HH:mm'),
          duration: 60,
          location: '',
          meeting_url: '',
          phone_number: '',
          internal_notes: '',
        },
  });

  const selectedCategory = form.watch('category');
  const selectedMode = form.watch('mode');

  const handleSubmit = async (data: MeetingFormData) => {
    setIsSubmitting(true);
    try {
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = new Date(data.start_date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, data.duration);

      await onSubmit({
        title: data.title,
        description: data.description,
        category: data.category,
        mode: data.mode,
        meeting_type_id: data.meeting_type_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: data.location,
        meeting_url: data.meeting_url,
        phone_number: data.phone_number,
        contact_id: data.contact_id,
        company_id: data.company_id,
        internal_notes: data.internal_notes,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {meeting ? 'Editar Reunião' : 'Nova Reunião'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Reunião</FormLabel>
                  <div className="flex gap-2">
                    {(Object.keys(categoryConfig) as MeetingCategory[]).map(cat => {
                      const config = categoryConfig[cat];
                      const Icon = config.icon;
                      return (
                        <Button
                          key={cat}
                          type="button"
                          variant={field.value === cat ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => field.onChange(cat)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode Selection */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(modeConfig) as MeetingMode[]).map(mode => {
                      const config = modeConfig[mode];
                      const Icon = config.icon;
                      return (
                        <Button
                          key={mode}
                          type="button"
                          variant={field.value === mode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => field.onChange(mode)}
                        >
                          <Icon className="h-4 w-4 mr-1" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião de kickoff" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
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

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <Select 
                      onValueChange={v => field.onChange(parseInt(v))} 
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[15, 30, 45, 60, 90, 120, 180, 240].map(d => (
                          <SelectItem key={d} value={String(d)}>
                            {d < 60 ? `${d} min` : `${d / 60}h`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mode-specific fields */}
            {selectedMode === 'online' && (
              <FormField
                control={form.control}
                name="meeting_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      Link da reunião
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://zoom.us/j/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedMode === 'in_person' && (
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
            )}

            {(selectedMode === 'phone' || selectedMode === 'whatsapp') && (
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Número de telefone
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+351 912 345 678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Agenda, objetivos, notas..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal notes */}
            <FormField
              control={form.control}
              name="internal_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas internas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas visíveis apenas para a equipa..."
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : meeting ? 'Guardar' : 'Criar Reunião'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
