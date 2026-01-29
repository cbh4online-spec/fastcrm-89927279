import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Plus,
  UserPlus,
  FileEdit,
  CheckCircle2,
  Mail,
  MailOpen,
  Phone,
  PhoneIncoming,
  Calendar,
  CalendarCheck,
  Target,
  Trophy,
  XCircle,
  FileText,
  Send,
  Eye,
  Tag,
  UserCheck,
  MessageSquare,
  Upload,
  ArrowRight,
  RefreshCw,
  Loader2,
  History,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EntityActivity {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  related_type: string | null;
  related_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface EntityTimelineSectionProps {
  entityType: "lead" | "contact" | "company" | "opportunity";
  entityId: string;
  entityName: string;
  showHeader?: boolean;
  maxHeight?: string;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="w-4 h-4" />,
  updated: <FileEdit className="w-4 h-4" />,
  status_change: <ArrowRight className="w-4 h-4" />,
  status_changed: <ArrowRight className="w-4 h-4" />,
  stage_change: <ArrowRight className="w-4 h-4" />,
  stage_changed: <ArrowRight className="w-4 h-4" />,
  note_added: <MessageSquare className="w-4 h-4" />,
  task_created: <CheckCircle2 className="w-4 h-4" />,
  task_completed: <CheckCircle2 className="w-4 h-4" />,
  email_sent: <Mail className="w-4 h-4" />,
  email_received: <MailOpen className="w-4 h-4" />,
  message_sent: <Send className="w-4 h-4" />,
  message_received: <MessageSquare className="w-4 h-4" />,
  call_made: <Phone className="w-4 h-4" />,
  call_received: <PhoneIncoming className="w-4 h-4" />,
  lead_created: <UserPlus className="w-4 h-4" />,
  lead_updated: <FileEdit className="w-4 h-4" />,
  lead_contacted: <Phone className="w-4 h-4" />,
  meeting_scheduled: <Calendar className="w-4 h-4" />,
  meeting_completed: <CalendarCheck className="w-4 h-4" />,
  opportunity_created: <Target className="w-4 h-4" />,
  opportunity_updated: <FileEdit className="w-4 h-4" />,
  opportunity_won: <Trophy className="w-4 h-4" />,
  opportunity_lost: <XCircle className="w-4 h-4" />,
  invoice_sent: <FileText className="w-4 h-4" />,
  invoice_paid: <FileText className="w-4 h-4" />,
  document_uploaded: <Upload className="w-4 h-4" />,
  proposal_sent: <Send className="w-4 h-4" />,
  proposal_viewed: <Eye className="w-4 h-4" />,
  proposal_accepted: <CheckCircle2 className="w-4 h-4" />,
  tag_added: <Tag className="w-4 h-4" />,
  tag_removed: <Tag className="w-4 h-4" />,
  assigned: <UserCheck className="w-4 h-4" />,
  followup_scheduled: <Calendar className="w-4 h-4" />,
  followup_completed: <CheckCircle2 className="w-4 h-4" />,
  automation_triggered: <RefreshCw className="w-4 h-4" />,
  custom: <MessageSquare className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  created: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  updated: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  status_change: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  status_changed: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  stage_change: "bg-purple-500/20 text-purple-600 border-purple-500/30",
  stage_changed: "bg-purple-500/20 text-purple-600 border-purple-500/30",
  note_added: "bg-slate-500/20 text-slate-600 border-slate-500/30",
  task_created: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
  task_completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  email_sent: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  email_received: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30",
  message_sent: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  message_received: "bg-green-500/20 text-green-600 border-green-500/30",
  call_made: "bg-green-500/20 text-green-600 border-green-500/30",
  call_received: "bg-green-500/20 text-green-600 border-green-500/30",
  lead_created: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30",
  lead_updated: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  lead_contacted: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
  meeting_scheduled: "bg-violet-500/20 text-violet-600 border-violet-500/30",
  meeting_completed: "bg-violet-500/20 text-violet-600 border-violet-500/30",
  opportunity_created: "bg-orange-500/20 text-orange-600 border-orange-500/30",
  opportunity_updated: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  opportunity_won: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  opportunity_lost: "bg-red-500/20 text-red-600 border-red-500/30",
  invoice_sent: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  invoice_paid: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  document_uploaded: "bg-slate-500/20 text-slate-600 border-slate-500/30",
  proposal_sent: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  proposal_viewed: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30",
  proposal_accepted: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  tag_added: "bg-pink-500/20 text-pink-600 border-pink-500/30",
  tag_removed: "bg-slate-500/20 text-slate-600 border-slate-500/30",
  assigned: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
  followup_scheduled: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  followup_completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  automation_triggered: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  custom: "bg-slate-500/20 text-slate-600 border-slate-500/30",
};

function getDateGroup(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  if (isThisWeek(date)) return "Esta semana";
  if (isThisMonth(date)) return "Este mês";
  return format(date, "MMMM yyyy", { locale: pt });
}

function formatActivityTime(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  if (isYesterday(date)) {
    return `Ontem às ${format(date, "HH:mm")}`;
  }
  return format(date, "d MMM 'às' HH:mm", { locale: pt });
}

export function EntityTimelineSection({
  entityType,
  entityId,
  entityName,
  showHeader = true,
  maxHeight = "500px",
}: EntityTimelineSectionProps) {
  const { currentWorkspace } = useWorkspace();

  // Fetch activities from entity_activities
  const { data: activities = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["entity-activities", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("entity_activities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as EntityActivity[];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  // Also fetch from crm_activities using lead_id, contact_id, or company_id
  const { data: crmActivities = [] } = useQuery({
    queryKey: ["crm-activities-timeline", entityType, entityId, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      // Build query based on entity type - use the specific foreign key fields
      let query = supabase
        .from("crm_activities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      // Filter by the appropriate foreign key based on entity type
      if (entityType === "lead") {
        query = query.eq("lead_id", entityId);
      } else if (entityType === "opportunity") {
        query = query.eq("opportunity_id", entityId);
      } else if (entityType === "contact" || entityType === "company") {
        // For contacts/companies, we need to check entity_type + entity_id
        query = query.eq("entity_type", entityType).eq("entity_id", entityId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[Timeline] Error fetching crm_activities:", error);
        return [];
      }
      
      return (data || []) as Array<{
        id: string;
        activity_type: string;
        title: string;
        description: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  // Also fetch related data: tasks, notes, opportunities, invoices
  const { data: tasks = [] } = useQuery({
    queryKey: ["entity-tasks-timeline", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, created_at, updated_at")
        .eq("related_type", entityType)
        .eq("related_id", entityId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["entity-notes-timeline", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("entity_notes")
        .select("id, content, note_type, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  // Combine all activities into unified timeline
  const unifiedTimeline = useMemo(() => {
    const timeline: Array<{
      id: string;
      type: string;
      title: string;
      description: string | null;
      date: Date;
      metadata?: Record<string, unknown>;
    }> = [];

    // Track IDs to prevent duplicates
    const addedIds = new Set<string>();

    // Add stored activities from entity_activities
    activities.forEach((activity) => {
      if (!addedIds.has(activity.id)) {
        addedIds.add(activity.id);
        timeline.push({
          id: activity.id,
          type: activity.activity_type,
          title: activity.title,
          description: activity.description,
          date: new Date(activity.created_at),
          metadata: activity.metadata || undefined,
        });
      }
    });

    // Add CRM activities (messages, status changes, etc.)
    crmActivities.forEach((activity) => {
      if (!addedIds.has(activity.id)) {
        addedIds.add(activity.id);
        timeline.push({
          id: activity.id,
          type: activity.activity_type,
          title: activity.title,
          description: activity.description,
          date: new Date(activity.created_at),
          metadata: activity.metadata || undefined,
        });
      }
    });

    // Add tasks
    tasks.forEach((task) => {
      const taskCreatedId = `task-created-${task.id}`;
      if (!addedIds.has(taskCreatedId)) {
        addedIds.add(taskCreatedId);
        timeline.push({
          id: taskCreatedId,
          type: "task_created",
          title: "Tarefa criada",
          description: task.title,
          date: new Date(task.created_at),
        });
      }

      // Task completion - use updated_at as completion time
      if (task.status === "done") {
        const taskCompletedId = `task-completed-${task.id}`;
        if (!addedIds.has(taskCompletedId)) {
          addedIds.add(taskCompletedId);
          timeline.push({
            id: taskCompletedId,
            type: "task_completed",
            title: "Tarefa concluída",
            description: task.title,
            date: new Date(task.updated_at),
          });
        }
      }
    });

    // Add notes
    notes.forEach((note) => {
      const noteId = `note-${note.id}`;
      if (!addedIds.has(noteId)) {
        addedIds.add(noteId);
        timeline.push({
          id: noteId,
          type: "note_added",
          title: note.note_type === "voice" ? "Nota de voz adicionada" : "Nota adicionada",
          description: note.content?.slice(0, 100) || null,
          date: new Date(note.created_at),
        });
      }
    });

    // Sort by date descending
    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    return timeline;
  }, [activities, crmActivities, tasks, notes]);

  // Group by date
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, typeof unifiedTimeline> = {};

    unifiedTimeline.forEach((item) => {
      const group = getDateGroup(item.date);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    });

    return groups;
  }, [unifiedTimeline]);

  const groupOrder = Object.keys(groupedTimeline);

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      {showHeader && (
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <History className="w-4 h-4" />
              </div>
              Timeline de Atividades
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{unifiedTimeline.length} eventos</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            Histórico completo de atividades de {entityName}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && "pt-4")}>
        {unifiedTimeline.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Sem atividades registadas</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              As atividades aparecerão aqui à medida que interagir com {entityName}
            </p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }} className="pr-4">
            <div className="space-y-6">
              {groupOrder.map((group) => (
                <div key={group}>
                  {/* Date Group Header */}
                  <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 py-2 mb-3">
                    <Badge variant="outline" className="text-xs font-medium">
                      {group}
                    </Badge>
                  </div>

                  {/* Activities */}
                  <div className="relative pl-6 space-y-4">
                    {/* Timeline Line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border/50" />

                    {groupedTimeline[group].map((activity, index) => (
                      <div key={activity.id} className="relative flex gap-3">
                        {/* Timeline Dot */}
                        <div
                          className={cn(
                            "absolute -left-6 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.custom
                          )}
                        >
                          {ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.custom}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatActivityTime(activity.date.toISOString())}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}