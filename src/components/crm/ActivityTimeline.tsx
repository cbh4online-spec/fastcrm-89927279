import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Mail,
  Phone,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  UserPlus,
  Tag,
  Clock,
  Zap,
  FileText,
  Eye,
  Calendar,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useCrmActivities, CrmActivity, ActivityType } from "@/hooks/useCrmActivities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  leadId?: string;
  opportunityId?: string;
  conversationId?: string;
  entityType?: "lead" | "opportunity" | "contact" | "company" | "conversation";
  entityId?: string;
  limit?: number;
  className?: string;
}

const activityIcons: Record<ActivityType, typeof MessageSquare> = {
  message_sent: MessageSquare,
  message_received: Mail,
  status_changed: ArrowRight,
  stage_changed: TrendingUp,
  opportunity_created: TrendingUp,
  opportunity_updated: RefreshCw,
  opportunity_won: CheckCircle,
  opportunity_lost: XCircle,
  lead_created: UserPlus,
  lead_updated: RefreshCw,
  lead_contacted: Phone,
  task_created: Calendar,
  task_completed: CheckCircle,
  note_added: FileText,
  tag_added: Tag,
  tag_removed: Tag,
  assigned: UserPlus,
  automation_triggered: Zap,
  proposal_sent: FileText,
  proposal_viewed: Eye,
  proposal_accepted: CheckCircle,
  followup_scheduled: Clock,
  followup_completed: CheckCircle,
  custom: Activity,
};

const activityColors: Record<ActivityType, string> = {
  message_sent: "text-blue-500 bg-blue-500/10",
  message_received: "text-green-500 bg-green-500/10",
  status_changed: "text-amber-500 bg-amber-500/10",
  stage_changed: "text-purple-500 bg-purple-500/10",
  opportunity_created: "text-emerald-500 bg-emerald-500/10",
  opportunity_updated: "text-blue-500 bg-blue-500/10",
  opportunity_won: "text-green-500 bg-green-500/10",
  opportunity_lost: "text-red-500 bg-red-500/10",
  lead_created: "text-cyan-500 bg-cyan-500/10",
  lead_updated: "text-blue-500 bg-blue-500/10",
  lead_contacted: "text-indigo-500 bg-indigo-500/10",
  task_created: "text-orange-500 bg-orange-500/10",
  task_completed: "text-green-500 bg-green-500/10",
  note_added: "text-gray-500 bg-gray-500/10",
  tag_added: "text-pink-500 bg-pink-500/10",
  tag_removed: "text-gray-400 bg-gray-400/10",
  assigned: "text-violet-500 bg-violet-500/10",
  automation_triggered: "text-yellow-500 bg-yellow-500/10",
  proposal_sent: "text-blue-500 bg-blue-500/10",
  proposal_viewed: "text-cyan-500 bg-cyan-500/10",
  proposal_accepted: "text-green-500 bg-green-500/10",
  followup_scheduled: "text-amber-500 bg-amber-500/10",
  followup_completed: "text-green-500 bg-green-500/10",
  custom: "text-gray-500 bg-gray-500/10",
};

export function ActivityTimeline({
  leadId,
  opportunityId,
  conversationId,
  entityType,
  entityId,
  limit = 20,
  className,
}: Props) {
  const { data: activities, isLoading, refetch } = useCrmActivities({
    lead_id: leadId,
    opportunity_id: opportunityId,
    conversation_id: conversationId,
    entity_type: entityType,
    entity_id: entityId,
    limit,
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Activity className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Sem atividades registadas</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Timeline de Atividades
        </h4>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-2">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.activity_type] || Activity;
            const colorClass = activityColors[activity.activity_type] || activityColors.custom;
            const isExpanded = expanded === activity.id;

            return (
              <div
                key={activity.id}
                className="relative pl-10 pb-4 group"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
                    colorClass
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer",
                    isExpanded && "bg-muted/50"
                  )}
                  onClick={() => setExpanded(isExpanded ? null : activity.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {activity.title}
                    </p>
                    {activity.automation_rule_id && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        <Zap className="w-2.5 h-2.5 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: pt,
                    })}
                  </p>

                  {/* Expanded details */}
                  {isExpanded && activity.description && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
