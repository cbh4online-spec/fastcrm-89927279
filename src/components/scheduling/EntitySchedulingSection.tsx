import { useState, useMemo } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  CalendarCheck, 
  Plus, 
  Clock, 
  MapPin, 
  Video, 
  Phone,
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMeetings, type Meeting, type MeetingStatus, type MeetingMode } from '@/hooks/useMeetings';
import { CalendarEventModal } from '@/components/calendars/CalendarEventModal';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendars, type CreateEventData } from '@/hooks/useCalendars';
import { EntityEmptyState } from '@/components/entity/EntityEmptyState';

interface EntitySchedulingSectionProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
  entityName: string;
  entityEmail?: string | null;
  entityPhone?: string | null;
}

const statusConfig: Record<MeetingStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle2 },
  completed: { label: 'Concluída', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  no_show: { label: 'Sem comparência', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: AlertCircle },
};

const modeIcons: Record<MeetingMode, React.ComponentType<{ className?: string }>> = {
  online: Video,
  in_person: MapPin,
  phone: Phone,
  whatsapp: MessageCircle,
};

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const startDate = parseISO(meeting.start_time);
  const endDate = parseISO(meeting.end_time);
  const status = statusConfig[meeting.status];
  const StatusIcon = status.icon;
  const ModeIcon = modeIcons[meeting.mode];
  
  const isPastMeeting = isPast(endDate) && meeting.status !== 'completed';
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-md cursor-pointer",
      isPastMeeting && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs", status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              {meeting.source === 'calendar_event' && (
                <Badge variant="secondary" className="text-xs">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  Evento
                </Badge>
              )}
            </div>
            
            <h4 className="font-medium text-sm truncate">{meeting.title}</h4>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(startDate, "dd MMM, HH:mm", { locale: pt })} - {format(endDate, "HH:mm", { locale: pt })}
              </span>
              {meeting.mode && (
                <span className="flex items-center gap-1">
                  <ModeIcon className="w-3 h-3" />
                  {meeting.mode === 'online' ? 'Online' : 
                   meeting.mode === 'in_person' ? 'Presencial' : 
                   meeting.mode === 'phone' ? 'Telefone' : 'WhatsApp'}
                </span>
              )}
            </div>
            
            {meeting.location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {meeting.location}
              </p>
            )}
          </div>
          
          <div className="text-right shrink-0">
            <div className={cn(
              "text-sm font-medium",
              isToday(startDate) && "text-primary"
            )}>
              {isToday(startDate) ? 'Hoje' : format(startDate, "dd/MM", { locale: pt })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(startDate, "HH:mm", { locale: pt })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EntitySchedulingSection({
  entityType,
  entityId,
  entityName,
}: EntitySchedulingSectionProps) {
  const [showEventModal, setShowEventModal] = useState(false);
  const { meetings, isLoading } = useMeetings();
  const { calendars, selectedCalendarIds } = useCalendars();
  const { createEvent } = useCalendarEvents(selectedCalendarIds);

  // Filter meetings for this entity
  const entityMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      if (entityType === 'contact' && meeting.contact_id === entityId) return true;
      if (entityType === 'company' && meeting.company_id === entityId) return true;
      if (entityType === 'lead' && meeting.lead_id === entityId) return true;
      return false;
    });
  }, [meetings, entityType, entityId]);

  // Separate into upcoming and past
  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = new Date();
    const upcoming = entityMeetings
      .filter(m => new Date(m.end_time) >= now || ['pending', 'confirmed'].includes(m.status))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    const past = entityMeetings
      .filter(m => new Date(m.end_time) < now && !['pending', 'confirmed'].includes(m.status))
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [entityMeetings]);

  const handleCreateEvent = async (data: CreateEventData) => {
    // Add entity linking to the event
    const eventData = {
      ...data,
      contact_id: entityType === 'contact' ? entityId : undefined,
      company_id: entityType === 'company' ? entityId : undefined,
      lead_id: entityType === 'lead' ? entityId : undefined,
    };
    
    await createEvent(eventData);
    setShowEventModal(false);
  };

  const handleNewMeeting = () => {
    setShowEventModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Agendamentos
          </h2>
          <p className="text-sm text-muted-foreground">
            {entityMeetings.length} agendamento{entityMeetings.length !== 1 ? 's' : ''} associado{entityMeetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleNewMeeting} className="gap-2">
          <Plus className="h-4 w-4" />
          Agendar
        </Button>
      </div>

      {entityMeetings.length === 0 ? (
        <EntityEmptyState
          section="scheduling"
          entityName={entityName}
          onAction={handleNewMeeting}
        />
      ) : (
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Próximos ({upcomingMeetings.length})
              </h3>
              <div className="space-y-3">
                {upcomingMeetings.map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div>
              <Separator className="my-4" />
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Histórico ({pastMeetings.length})
              </h3>
              <div className="space-y-3">
                {pastMeetings.slice(0, 5).map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
                {pastMeetings.length > 5 && (
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    Ver mais {pastMeetings.length - 5} agendamentos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Event Modal */}
      <CalendarEventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        calendars={calendars}
        event={null}
        defaultDate={new Date()}
        onSubmit={handleCreateEvent}
        onDelete={async () => {}}
        defaultContactId={entityType === 'contact' ? entityId : null}
        defaultCompanyId={entityType === 'company' ? entityId : null}
        defaultLeadId={entityType === 'lead' ? entityId : null}
      />
    </div>
  );
}
