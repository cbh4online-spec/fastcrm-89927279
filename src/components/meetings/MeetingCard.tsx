import { format, isPast, isFuture, isToday, differenceInMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Video, 
  MapPin, 
  Phone, 
  MessageCircle,
  Clock,
  User,
  Users,
  Building2,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar as CalendarIcon,
  ExternalLink,
  FileText,
  Share2,
  ClipboardCheck,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Meeting, MeetingStatus, MeetingCategory, MeetingMode, MeetingOutcome } from '@/hooks/useMeetings';

interface MeetingCardProps {
  meeting: Meeting;
  compact?: boolean;
  onStatusChange: (id: string, status: MeetingStatus, reason?: string) => void;
  onClick: (meeting: Meeting) => void;
  onRegisterOutcome?: (meeting: Meeting) => void;
  onPublishToTeam?: (meetingId: string) => void;
  onPrepare?: (meeting: Meeting) => void;
  onNoShow?: (meeting: Meeting) => void;
}

const statusConfig: Record<MeetingStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-blue-500', icon: Check },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: X },
  no_show: { label: 'Sem comparência', color: 'bg-orange-500', icon: AlertTriangle },
  completed: { label: 'Concluída', color: 'bg-green-500', icon: CheckCircle2 },
};

const categoryConfig: Record<MeetingCategory, { label: string; icon: typeof Users; color: string }> = {
  client: { label: 'Cliente', icon: User, color: 'text-blue-500' },
  internal: { label: 'Interna', icon: Users, color: 'text-purple-500' },
  hybrid: { label: 'Híbrida', icon: Building2, color: 'text-green-500' },
};

const modeConfig: Record<MeetingMode, { label: string; icon: typeof Video }> = {
  online: { label: 'Online', icon: Video },
  in_person: { label: 'Presencial', icon: MapPin },
  phone: { label: 'Telefone', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
};

export function MeetingCard({ meeting, compact, onStatusChange, onClick, onRegisterOutcome, onPublishToTeam, onPrepare, onNoShow }: MeetingCardProps) {
  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const duration = differenceInMinutes(endTime, startTime);
  const isUpcoming = isFuture(startTime);
  const isPastMeeting = isPast(endTime);
  const isHappening = isPast(startTime) && isFuture(endTime);

  const statusInfo = statusConfig[meeting.status];
  const StatusIcon = statusInfo.icon;
  const categoryInfo = categoryConfig[meeting.category];
  const CategoryIcon = categoryInfo.icon;
  const modeInfo = modeConfig[meeting.mode];
  const ModeIcon = modeInfo.icon;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
          meeting.status === 'cancelled' && "opacity-60",
          isHappening && "ring-2 ring-primary"
        )}
        onClick={() => onClick(meeting)}
      >
        {/* Time */}
        <div className="w-16 text-center flex-shrink-0">
          <div className="text-sm font-semibold">
            {format(startTime, 'HH:mm')}
          </div>
          <div className="text-xs text-muted-foreground">
            {duration} min
          </div>
        </div>

        {/* Status indicator */}
        <div className={cn("w-1 h-10 rounded-full", statusInfo.color)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{meeting.title}</span>
            <Badge variant="outline" className="text-xs">
              <CategoryIcon className={cn("h-3 w-3 mr-1", categoryInfo.color)} />
              {categoryInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <ModeIcon className="h-3 w-3" />
            <span>{modeInfo.label}</span>
            {meeting.contact && (
              <>
                <span>•</span>
                <span className="truncate">{meeting.contact.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* AI Preparation for client meetings */}
            {(meeting.category === 'client' || meeting.category === 'hybrid') && onPrepare && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPrepare(meeting); }}>
                  <Brain className="h-4 w-4 mr-2 text-primary" />
                  Preparar com IA
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {meeting.status === 'pending' && (
              <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'confirmed')}>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Confirmar
              </DropdownMenuItem>
            )}
            {(meeting.status === 'pending' || meeting.status === 'confirmed') && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'cancelled')}>
                  <X className="h-4 w-4 mr-2 text-red-500" />
                  Cancelar
                </DropdownMenuItem>
                {isPastMeeting && (
                  <>
                    <DropdownMenuSeparator />
                    {onRegisterOutcome && !meeting.outcome && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRegisterOutcome(meeting); }}>
                        <ClipboardCheck className="h-4 w-4 mr-2 text-primary" />
                        Registar resultado
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'completed')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Marcar como concluída
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNoShow ? onNoShow(meeting) : onStatusChange(meeting.id, 'no_show'); }}>
                      <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                      Sem comparência
                    </DropdownMenuItem>
                  </>
                )}
                {meeting.category === 'internal' && onPublishToTeam && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublishToTeam(meeting.id); }}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Publicar no mural da equipa
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
            {meeting.meeting_url && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir link da reunião
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
        meeting.status === 'cancelled' && "opacity-60",
        isHappening && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => onClick(meeting)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(statusInfo.color, "text-white border-0")}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
          {isHappening && (
            <Badge variant="default" className="animate-pulse">
              A decorrer
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* AI Preparation for client meetings */}
            {(meeting.category === 'client' || meeting.category === 'hybrid') && onPrepare && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPrepare(meeting); }}>
                  <Brain className="h-4 w-4 mr-2 text-primary" />
                  Preparar com IA
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {meeting.status === 'pending' && (
              <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'confirmed')}>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Confirmar
              </DropdownMenuItem>
            )}
            {(meeting.status === 'pending' || meeting.status === 'confirmed') && (
              <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'cancelled')}>
                <X className="h-4 w-4 mr-2 text-red-500" />
                Cancelar
              </DropdownMenuItem>
            )}
            {isPastMeeting && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
              <>
                <DropdownMenuSeparator />
                {onRegisterOutcome && !meeting.outcome && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRegisterOutcome(meeting); }}>
                    <ClipboardCheck className="h-4 w-4 mr-2 text-primary" />
                    Registar resultado
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onStatusChange(meeting.id, 'completed')}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Marcar como concluída
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNoShow ? onNoShow(meeting) : onStatusChange(meeting.id, 'no_show'); }}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                  Sem comparência
                </DropdownMenuItem>
              </>
            )}
            {meeting.category === 'internal' && onPublishToTeam && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublishToTeam(meeting.id); }}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Publicar no mural da equipa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-lg mb-2",
        meeting.status === 'cancelled' && "line-through"
      )}>
        {meeting.title}
      </h3>

      {/* Time and mode */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          {format(startTime, "EEE, d 'de' MMM", { locale: pt })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
        </span>
        <span className="flex items-center gap-1">
          <ModeIcon className="h-4 w-4" />
          {modeInfo.label}
        </span>
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline">
          <CategoryIcon className={cn("h-3 w-3 mr-1", categoryInfo.color)} />
          {categoryInfo.label}
        </Badge>
        {meeting.meeting_type && (
          <Badge variant="secondary">{meeting.meeting_type.name}</Badge>
        )}
      </div>

      {/* Client info (for client/hybrid meetings) */}
      {(meeting.category === 'client' || meeting.category === 'hybrid') && (
        <div className="flex items-center gap-2 pt-3 border-t">
          {meeting.contact && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {meeting.contact.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{meeting.contact.name}</span>
            </div>
          )}
          {meeting.company && (
            <span className="text-sm text-muted-foreground">
              • {meeting.company.name}
            </span>
          )}
        </div>
      )}

      {/* Location/link */}
      {(meeting.location || meeting.meeting_url) && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
          {meeting.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {meeting.location}
            </div>
          )}
          {meeting.meeting_url && (
            <a 
              href={meeting.meeting_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={e => e.stopPropagation()}
            >
              <Video className="h-3 w-3" />
              Abrir link da reunião
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
