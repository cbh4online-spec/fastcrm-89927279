import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Instagram,
  Globe,
  Facebook,
  User,
  Bot,
  Hash,
  Send,
} from "lucide-react";
import { useCrmActivities, CrmActivity, ActivityType } from "@/hooks/useCrmActivities";
import { cn } from "@/lib/utils";

interface Props {
  leadId?: string;
  opportunityId?: string;
  conversationId?: string;
  entityType?: "lead" | "opportunity" | "contact" | "company" | "conversation";
  entityId?: string;
  limit?: number;
  className?: string;
  compact?: boolean;
}

const activityIcons: Record<ActivityType, typeof MessageSquare> = {
  message_sent: Send,
  message_received: MessageSquare,
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

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
};

function getChannelBadge(channel: string | undefined) {
  if (!channel) return null;
  const Icon = channelIcons[channel] || Globe;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
      <Icon className="w-2.5 h-2.5" />
      {channel}
    </Badge>
  );
}

function getInvolvementBadge(metadata: Record<string, unknown>) {
  const isAI = metadata?.ai_generated === true || metadata?.ai_assisted === true;
  const isAutomation = metadata?.automation_rule_id != null;
  
  if (isAI) {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
        <Bot className="w-2.5 h-2.5" />
        AI
      </Badge>
    );
  }
  
  if (isAutomation) {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Zap className="w-2.5 h-2.5" />
        Auto
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
      <User className="w-2.5 h-2.5" />
      Manual
    </Badge>
  );
}

export function UnifiedActivityLog({
  leadId,
  opportunityId,
  conversationId,
  entityType,
  entityId,
  limit = 30,
  className,
  compact = false,
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
          Log de Atividades
        </h4>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea className={cn(compact ? "h-[250px]" : "h-[400px]", "pr-2")}>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || Activity;
            const colorClass = activityColors[activity.activity_type] || activityColors.custom;
            const isExpanded = expanded === activity.id;
            const metadata = (activity.metadata || {}) as Record<string, unknown>;
            const channel = metadata?.channel as string | undefined;
            const templateId = metadata?.template_id as string | undefined;
            const templateName = metadata?.template_name as string | undefined;

            return (
              <div
                key={activity.id}
                className="relative pl-10 pb-3 group"
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
                  {/* Title & Badges Row */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground line-clamp-2 flex-1 min-w-0">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                      {getInvolvementBadge(metadata)}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Conversation ID */}
                    {activity.conversation_id && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-mono">
                        <Hash className="w-2.5 h-2.5" />
                        {activity.conversation_id.slice(0, 8)}
                      </Badge>
                    )}
                    
                    {/* Channel */}
                    {channel && getChannelBadge(channel)}
                    
                    {/* Template Used */}
                    {(templateId || templateName) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        {templateName || "Template"}
                      </Badge>
                    )}
                    
                    {/* Automation */}
                    {activity.automation_rule_id && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-yellow-500/30 text-yellow-600">
                        <Zap className="w-2.5 h-2.5" />
                        Automação
                      </Badge>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: pt,
                    })}
                  </p>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border space-y-2">
                      {activity.description && (
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground">ID Conversa:</span>
                          <span className="ml-1 font-mono">
                            {activity.conversation_id ? activity.conversation_id.slice(0, 12) + "..." : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Canal:</span>
                          <span className="ml-1 capitalize">{channel || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Template:</span>
                          <span className="ml-1">{templateName || templateId || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Automação:</span>
                          <span className="ml-1">{activity.automation_rule_id ? "Sim" : "Não"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Origem:</span>
                          <span className="ml-1">
                            {metadata?.ai_generated ? "AI" : metadata?.automation_rule_id ? "Automação" : "Manual"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <span className="ml-1">
                            {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                          </span>
                        </div>
                      </div>
                      
                      {activity.performed_by && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>Por: {activity.performed_by.slice(0, 8)}...</span>
                        </div>
                      )}
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
