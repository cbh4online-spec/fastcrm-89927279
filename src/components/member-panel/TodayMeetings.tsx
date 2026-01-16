import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  Building2,
  MessageSquare,
  Sparkles,
  CalendarClock,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MeetingToday } from '@/hooks/useMemberPanel';

interface TodayMeetingsProps {
  meetings: MeetingToday[];
  isLoading?: boolean;
  onPrepareMeeting?: (meeting: MeetingToday) => void;
  onOpenClient?: (meeting: MeetingToday) => void;
  onSendMessage?: (meeting: MeetingToday) => void;
  onReschedule?: (meeting: MeetingToday) => void;
}

export function TodayMeetings({
  meetings,
  isLoading,
  onPrepareMeeting,
  onOpenClient,
  onSendMessage,
  onReschedule,
}: TodayMeetingsProps) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-20 bg-muted rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const sortedMeetings = [...meetings].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const getTimeStatus = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (now >= start && now <= end) return 'active';
    if (now < start) return 'upcoming';
    return 'past';
  };

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Reuniões de Hoje</CardTitle>
              <p className="text-xs text-muted-foreground">
                {meetings.length} reunião{meetings.length !== 1 ? 'ões' : ''} agendada{meetings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {meetings.length === 0 ? (
          <div className="text-center py-8 px-4">
            <CalendarClock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Sem reuniões hoje</p>
            <p className="text-sm text-muted-foreground/70">Aproveita para fazer follow-ups!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-3">
              {sortedMeetings.map((meeting) => {
                const timeStatus = getTimeStatus(meeting.start_time, meeting.end_time);
                const isOnline = !!meeting.meeting_url;
                const isClient = meeting.calendar?.calendar_type === 'client';

                return (
                  <div
                    key={meeting.id}
                    className={cn(
                      "relative p-4 rounded-xl border transition-all hover:shadow-md",
                      timeStatus === 'active' && "ring-2 ring-green-500/50 bg-green-500/5 border-green-500/30",
                      timeStatus === 'upcoming' && "bg-background",
                      timeStatus === 'past' && "opacity-60 bg-muted/30"
                    )}
                  >
                    {/* Time indicator */}
                    {timeStatus === 'active' && (
                      <Badge className="absolute -top-2 right-4 bg-green-500 animate-pulse">
                        A decorrer
                      </Badge>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Time column */}
                      <div className="text-center min-w-[50px]">
                        <p className="text-lg font-bold">
                          {format(new Date(meeting.start_time), 'HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(meeting.end_time), 'HH:mm')}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className={cn(
                        "w-1 h-full min-h-[60px] rounded-full",
                        timeStatus === 'active' ? "bg-green-500" : "bg-muted"
                      )} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{meeting.title}</h4>
                          <div className="flex items-center gap-1">
                            {isOnline ? (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Video className="h-3 w-3" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <MapPin className="h-3 w-3" />
                                Presencial
                              </Badge>
                            )}
                            {isClient && (
                              <Badge variant="secondary" className="gap-1 text-[10px]">
                                <User className="h-3 w-3" />
                                Cliente
                              </Badge>
                            )}
                          </div>
                        </div>

                        {meeting.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </p>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => onPrepareMeeting?.(meeting)}
                          >
                            <Sparkles className="h-3 w-3" />
                            Preparar
                          </Button>
                          {meeting.meeting_url && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => window.open(meeting.meeting_url!, '_blank')}
                            >
                              <Video className="h-3 w-3" />
                              Entrar
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOpenClient?.(meeting)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSendMessage?.(meeting)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Enviar mensagem
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onReschedule?.(meeting)}>
                                <CalendarClock className="h-4 w-4 mr-2" />
                                Reagendar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
