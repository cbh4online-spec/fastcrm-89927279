import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Calendar, ChevronRight, AlertCircle, 
  CheckCircle2, Clock 
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import type { SJProfile } from "@/types/studentJourney";
import { LIFECYCLE_STAGE_CONFIG } from "@/types/studentJourney";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WeeklyContactsProps {
  profiles: SJProfile[];
  maxItems?: number;
}

export function WeeklyContacts({ profiles, maxItems = 6 }: WeeklyContactsProps) {
  // Get profiles with follow-ups this week or overdue
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const weeklyProfiles = profiles
    .filter(p => p.next_follow_up_at)
    .map(p => ({
      profile: p,
      followUpDate: parseISO(p.next_follow_up_at!),
      isOverdue: isPast(parseISO(p.next_follow_up_at!)) && !isToday(parseISO(p.next_follow_up_at!)),
      isToday: isToday(parseISO(p.next_follow_up_at!)),
      isTomorrow: isTomorrow(parseISO(p.next_follow_up_at!)),
      daysUntil: differenceInDays(parseISO(p.next_follow_up_at!), now)
    }))
    .filter(p => p.isOverdue || p.followUpDate <= weekFromNow)
    .sort((a, b) => {
      // Overdue first, then today, then by date
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.followUpDate.getTime() - b.followUpDate.getTime();
    });

  const displayProfiles = weeklyProfiles.slice(0, maxItems);
  const overdueCount = weeklyProfiles.filter(p => p.isOverdue).length;
  const todayCount = weeklyProfiles.filter(p => p.isToday).length;

  const getStatusBadge = (item: typeof weeklyProfiles[0]) => {
    if (item.isOverdue) {
      return (
        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 border-0 gap-1">
          <AlertCircle className="h-3 w-3" />
          Atrasado
        </Badge>
      );
    }
    if (item.isToday) {
      return (
        <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 border-0 gap-1">
          <Clock className="h-3 w-3" />
          Hoje
        </Badge>
      );
    }
    if (item.isTomorrow) {
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-0">
          Amanhã
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {item.daysUntil}d
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Quem Abordar Esta Semana
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follow-ups agendados e atrasados
            </p>
          </div>
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 border-0">
                {overdueCount} atrasado{overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
            {todayCount > 0 && (
              <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 border-0">
                {todayCount} hoje
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weeklyProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
            <p className="text-sm text-center">Nenhum follow-up pendente esta semana!</p>
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="space-y-2">
              {displayProfiles.map((item) => {
                const stageConfig = LIFECYCLE_STAGE_CONFIG[item.profile.lifecycle_stage];
                return (
                  <Link 
                    key={item.profile.id} 
                    to={`/dashboard/student-journey/profiles/${item.profile.id}`}
                    className="block"
                  >
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-colors border",
                      item.isOverdue 
                        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20" 
                        : "hover:bg-muted/50 border-transparent hover:border-border"
                    )}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0",
                          item.isOverdue 
                            ? "bg-gradient-to-br from-red-400 to-red-600"
                            : "bg-gradient-to-br from-primary/60 to-primary"
                        )}>
                          {item.profile.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.profile.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {format(item.followUpDate, "dd MMM, HH:mm", { locale: pt })}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-1.5 py-0", stageConfig.color, stageConfig.bgColor, "border-0")}
                            >
                              {stageConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(item)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {weeklyProfiles.length > maxItems && (
              <div className="mt-3 pt-3 border-t">
                <Link to="/dashboard/student-journey/profiles?sort=follow_up">
                  <Button variant="ghost" size="sm" className="w-full gap-2">
                    Ver todos ({weeklyProfiles.length})
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
