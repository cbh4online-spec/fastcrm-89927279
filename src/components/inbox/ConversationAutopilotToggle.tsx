/**
 * Per-Conversation Autopilot Toggle
 * Allows overriding the global autopilot setting for a specific conversation
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Pause, Play, AlertCircle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConversationAutopilotState {
  is_paused: boolean;
  paused_reason?: string;
  paused_at?: string;
  messages_sent?: number;
}

interface ConversationAutopilotToggleProps {
  conversationId: string;
  compact?: boolean;
}

export function ConversationAutopilotToggle({ conversationId, compact = false }: ConversationAutopilotToggleProps) {
  const { isActive: globalActive, config } = useAutopilotConfig();
  const [conversationState, setConversationState] = useState<ConversationAutopilotState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch conversation-specific autopilot state from variables column
  useEffect(() => {
    const fetchState = async () => {
      setIsLoading(true);
      try {
        // Check conversation_sessions for autopilot state stored in variables
        const { data: session } = await supabase
          .from("conversation_sessions")
          .select("variables")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session?.variables) {
          const variables = session.variables as Record<string, unknown>;
          const autopilotState = variables.autopilot_state as Record<string, unknown> | undefined;
          if (autopilotState) {
            setConversationState({
              is_paused: autopilotState.is_paused as boolean ?? false,
              paused_reason: autopilotState.paused_reason as string,
              paused_at: autopilotState.paused_at as string,
              messages_sent: autopilotState.messages_sent as number ?? 0,
            });
          } else {
            setConversationState({ is_paused: false, messages_sent: 0 });
          }
        } else {
          setConversationState({ is_paused: false, messages_sent: 0 });
        }
      } catch (error) {
        console.error("Error fetching autopilot state:", error);
        setConversationState({ is_paused: false });
      } finally {
        setIsLoading(false);
      }
    };

    if (conversationId) {
      fetchState();
    }
  }, [conversationId]);

  const handleToggle = async () => {
    if (!conversationId) return;
    
    setIsToggling(true);
    try {
      const newPausedState = !conversationState?.is_paused;
      
      // First check if a session already exists
      const { data: existingSession } = await supabase
        .from("conversation_sessions")
        .select("id, variables")
        .eq("conversation_id", conversationId)
        .limit(1)
        .maybeSingle();

      const autopilotState = {
        is_paused: newPausedState,
        paused_reason: newPausedState ? "manual_pause" : null,
        paused_at: newPausedState ? new Date().toISOString() : null,
        messages_sent: conversationState?.messages_sent || 0,
      };

      if (existingSession) {
        // Update existing session
        const existingVars = (existingSession.variables as Record<string, unknown>) || {};
        const { error } = await supabase
          .from("conversation_sessions")
          .update({
            variables: { ...existingVars, autopilot_state: autopilotState },
          })
          .eq("id", existingSession.id);
        
        if (error) throw error;
      } else {
        // We need workspace_id and channel - get from conversation
        const { data: conversation } = await supabase
          .from("conversations")
          .select("workspace_id, channel")
          .eq("id", conversationId)
          .single();
        
        if (!conversation) throw new Error("Conversation not found");

        // Create new session
        const { error } = await supabase
          .from("conversation_sessions")
          .insert({
            conversation_id: conversationId,
            workspace_id: conversation.workspace_id,
            channel: conversation.channel,
            status: "active" as const,
            variables: { autopilot_state: autopilotState },
            started_at: new Date().toISOString(),
          });
        
        if (error) throw error;
      }


      setConversationState(prev => ({
        ...prev!,
        is_paused: newPausedState,
        paused_reason: newPausedState ? "manual_pause" : undefined,
        paused_at: newPausedState ? new Date().toISOString() : undefined,
      }));

      toast.success(newPausedState 
        ? "Autopilot pausado para esta conversa" 
        : "Autopilot ativado para esta conversa"
      );
    } catch (error) {
      console.error("Error toggling autopilot:", error);
      toast.error("Erro ao alterar estado do Autopilot");
    } finally {
      setIsToggling(false);
    }
  };

  const isEffectivelyActive = globalActive && !conversationState?.is_paused;
  const isManuallyPaused = conversationState?.is_paused && conversationState?.paused_reason === "manual_pause";
  const isHumanPaused = conversationState?.is_paused && conversationState?.paused_reason === "human_reply";
  const isLimitPaused = conversationState?.is_paused && conversationState?.paused_reason === "limit_reached";

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-7">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Button>
    );
  }

  // If global autopilot is off, show disabled state
  if (!globalActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 opacity-50">
              <Bot className="w-3 h-3" />
              OFF
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Auto-Pilot global está desativado</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
              className={cn(
                "h-7 px-2 gap-1",
                isEffectivelyActive && "text-green-600",
                conversationState?.is_paused && "text-amber-600"
              )}
            >
              {isToggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isEffectivelyActive ? (
                <Bot className="w-3 h-3" />
              ) : isHumanPaused ? (
                <UserCheck className="w-3 h-3" />
              ) : isLimitPaused ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Pause className="w-3 h-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isEffectivelyActive 
              ? "Autopilot ativo - clique para pausar"
              : isHumanPaused
              ? "Pausado: humano respondeu"
              : isLimitPaused
              ? "Pausado: limite atingido"
              : "Autopilot pausado - clique para reativar"
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 text-xs",
            isEffectivelyActive && "text-green-600 hover:text-green-700",
            conversationState?.is_paused && "text-amber-600 hover:text-amber-700"
          )}
        >
          {isToggling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isEffectivelyActive ? (
            <Bot className="w-3 h-3" />
          ) : (
            <Pause className="w-3 h-3" />
          )}
          {isEffectivelyActive ? "Ativo" : "Pausado"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className={cn(
                "w-4 h-4",
                isEffectivelyActive ? "text-green-600" : "text-muted-foreground"
              )} />
              <Label className="text-sm font-medium">Auto-Pilot</Label>
            </div>
            <Switch
              checked={!conversationState?.is_paused}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>

          {conversationState?.is_paused && (
            <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                {isHumanPaused ? (
                  <UserCheck className="w-4 h-4 text-amber-600 mt-0.5" />
                ) : isLimitPaused ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                ) : (
                  <Pause className="w-4 h-4 text-amber-600 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-medium text-amber-700">
                    {isHumanPaused 
                      ? "Humano respondeu"
                      : isLimitPaused
                      ? "Limite atingido"
                      : "Pausado manualmente"
                    }
                  </p>
                  <p className="text-[10px] text-amber-600/80">
                    {isHumanPaused 
                      ? "Autopilot aguarda para não interferir"
                      : isLimitPaused
                      ? `${conversationState.messages_sent || 0}/${config?.max_messages_per_conversation || 25} mensagens`
                      : "Clique no switch para reativar"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {conversationState?.messages_sent !== undefined && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mensagens automáticas</span>
              <Badge variant="secondary" className="text-[10px]">
                {conversationState.messages_sent}/{config?.max_messages_per_conversation || 25}
              </Badge>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
