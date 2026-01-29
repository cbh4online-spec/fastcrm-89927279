/**
 * Autopilot Status Banner - Shows autopilot state and real-time action logs
 */

import { useState, useEffect } from "react";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Pause,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface AutopilotLog {
  id: string;
  timestamp: Date;
  action: "response_generated" | "response_sent" | "sleeping" | "reactivated" | "limit_reached" | "human_detected";
  conversationId?: string;
  message?: string;
  status: "success" | "pending" | "error";
}

interface AutopilotStatusBannerProps {
  conversationId?: string;
  compact?: boolean;
}

export function AutopilotStatusBanner({ conversationId, compact = false }: AutopilotStatusBannerProps) {
  const { currentWorkspace } = useWorkspace();
  const { config, isActive, toggleActive, isLoading } = useAutopilotConfig();
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [isToggling, setIsToggling] = useState(false);

  // Subscribe to realtime autopilot logs
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    // Fetch recent autopilot logs from ai_response_audits
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("ai_response_audits")
        .select("id, created_at, ai_response, conversation_id, followed_rules, followed_vibe")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        const mappedLogs: AutopilotLog[] = data.map(audit => ({
          id: audit.id,
          timestamp: new Date(audit.created_at),
          action: "response_generated",
          conversationId: audit.conversation_id,
          message: audit.ai_response?.slice(0, 100) + (audit.ai_response?.length > 100 ? "..." : ""),
          status: audit.followed_rules && audit.followed_vibe ? "success" : "pending",
        }));
        setLogs(mappedLogs);
      }
    };

    fetchLogs();

    // Subscribe to new audits
    const channel = supabase
      .channel("autopilot-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_response_audits",
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          const newAudit = payload.new as any;
          const newLog: AutopilotLog = {
            id: newAudit.id,
            timestamp: new Date(newAudit.created_at),
            action: "response_generated",
            conversationId: newAudit.conversation_id,
            message: newAudit.ai_response?.slice(0, 100) + (newAudit.ai_response?.length > 100 ? "..." : ""),
            status: newAudit.followed_rules && newAudit.followed_vibe ? "success" : "pending",
          };
          setLogs(prev => [newLog, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id]);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleActive(!isActive);
    } finally {
      setIsToggling(false);
    }
  };

  const getActionIcon = (action: AutopilotLog["action"]) => {
    switch (action) {
      case "response_generated":
      case "response_sent":
        return <MessageSquare className="w-3 h-3" />;
      case "sleeping":
        return <Pause className="w-3 h-3" />;
      case "reactivated":
        return <Play className="w-3 h-3" />;
      case "limit_reached":
        return <AlertCircle className="w-3 h-3" />;
      case "human_detected":
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Bot className="w-3 h-3" />;
    }
  };

  const getActionLabel = (action: AutopilotLog["action"]) => {
    switch (action) {
      case "response_generated":
        return "Resposta gerada";
      case "response_sent":
        return "Resposta enviada";
      case "sleeping":
        return "Autopilot pausado";
      case "reactivated":
        return "Autopilot reativado";
      case "limit_reached":
        return "Limite atingido";
      case "human_detected":
        return "Humano detectado";
      default:
        return action;
    }
  };

  if (isLoading) {
    return null;
  }

  // Compact version for header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          disabled={isToggling}
          className={cn(
            "gap-2 transition-all",
            isActive && "bg-green-600 hover:bg-green-700 text-white"
          )}
        >
          {isToggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isActive ? "Autopilot ON" : "Autopilot OFF"}
          </span>
        </Button>
        {isActive && logs.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {formatDistanceToNow(logs[0].timestamp, { addSuffix: true, locale: pt })}
          </Badge>
        )}
      </div>
    );
  }

  // Full banner with logs
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(
        "border transition-colors",
        isActive ? "border-green-500/50 bg-green-500/5" : "border-muted"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isActive ? "bg-green-500 text-white" : "bg-muted"
                )}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Auto-Pilot</span>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                      {isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {isActive && config && (
                    <p className="text-xs text-muted-foreground">
                      Delay: {config.response_delay_min}-{config.response_delay_max}s • 
                      Máx: {config.max_messages_per_conversation} msgs
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle();
                  }}
                  disabled={isToggling}
                  className="h-7 text-xs"
                >
                  {isToggling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isActive ? (
                    <>
                      <Pause className="w-3 h-3 mr-1" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t">
            <ScrollArea className="h-40">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-6">
                  Sem atividade recente
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 text-xs"
                    >
                      <div className={cn(
                        "mt-0.5 p-1 rounded",
                        log.status === "success" && "bg-green-500/10 text-green-600",
                        log.status === "pending" && "bg-amber-500/10 text-amber-600",
                        log.status === "error" && "bg-red-500/10 text-red-600"
                      )}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{getActionLabel(log.action)}</span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {format(log.timestamp, "HH:mm")}
                          </span>
                        </div>
                        {log.message && (
                          <p className="text-muted-foreground truncate">{log.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
