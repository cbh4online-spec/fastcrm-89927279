import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Calendar, 
  Search, 
  ChevronDown,
  Phone,
  Mail,
  FileText,
  MessageSquare,
  CheckCircle,
  Plus,
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task" | "system";
  title: string;
  description?: string;
  created_at: string;
  performed_by?: string;
  avatar_url?: string;
}

interface OpportunityActivityTimelineProps {
  activities: Activity[];
  opportunityId: string;
  isLoading?: boolean;
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle,
  system: Plus,
};

const activityColors: Record<string, string> = {
  call: "bg-blue-500 text-white",
  email: "bg-purple-500 text-white",
  meeting: "bg-emerald-500 text-white",
  note: "bg-amber-500 text-white",
  task: "bg-green-500 text-white",
  system: "bg-primary text-primary-foreground",
};

export function OpportunityActivityTimeline({
  activities,
  opportunityId,
  isLoading = false,
}: OpportunityActivityTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>(["this-week"]);

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch = searchQuery
        ? activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesFilter = activityFilter === "all" || activity.type === activityFilter;
      return matchesSearch && matchesFilter;
    });
  }, [activities, searchQuery, activityFilter]);

  // Group activities by week
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {
      "this-week": [],
      "last-week": [],
      "older": [],
    };

    filteredActivities.forEach((activity) => {
      const activityDate = new Date(activity.created_at);
      if (isWithinInterval(activityDate, { start: thisWeekStart, end: thisWeekEnd })) {
        groups["this-week"].push(activity);
      } else if (isWithinInterval(activityDate, { start: lastWeekStart, end: lastWeekEnd })) {
        groups["last-week"].push(activity);
      } else {
        groups["older"].push(activity);
      }
    });

    return groups;
  }, [filteredActivities, thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd]);

  const toggleWeek = (week: string) => {
    setExpandedWeeks((prev) =>
      prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week]
    );
  };

  const getInitials = (name?: string) => {
    if (!name) return "SY";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const renderActivity = (activity: Activity) => {
    const Icon = activityIcons[activity.type] || Plus;
    const colorClass = activityColors[activity.type] || activityColors.system;

    return (
      <div key={activity.id} className="flex items-start gap-3 py-3">
        <div className={cn("p-2 rounded-full", colorClass)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {activity.performed_by && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={activity.avatar_url} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {getInitials(activity.performed_by)}
                </AvatarFallback>
              </Avatar>
            )}
            <p className="text-sm font-medium">{activity.title}</p>
          </div>
          {activity.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(activity.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
        </span>
      </div>
    );
  };

  const weekLabels: Record<string, string> = {
    "this-week": "Esta Semana",
    "last-week": "Semana Passada",
    "older": "Anteriores",
  };

  // Calculate date range for display
  const dateRangeStart = subDays(now, 120);
  const dateRangeLabel = `${format(dateRangeStart, "d MMM", { locale: pt })} - ${format(now, "d MMM yyyy", { locale: pt })}`;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-base font-semibold">Atividade</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30">
            <Calendar className="h-3.5 w-3.5" />
            Data: {dateRangeLabel}
          </Button>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda a Atividade</SelectItem>
              <SelectItem value="call">Chamadas</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="meeting">Reuniões</SelectItem>
              <SelectItem value="note">Notas</SelectItem>
              <SelectItem value="task">Tarefas</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {Object.entries(groupedActivities).map(([week, weekActivities]) => {
            if (weekActivities.length === 0) return null;
            
            return (
              <Collapsible
                key={week}
                open={expandedWeeks.includes(week)}
                onOpenChange={() => toggleWeek(week)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-10 px-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {weekLabels[week]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {weekActivities.length} atividade{weekActivities.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedWeeks.includes(week) && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-l-2 border-muted ml-4 pl-4 space-y-1">
                    {weekActivities.map(renderActivity)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem atividades registadas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
