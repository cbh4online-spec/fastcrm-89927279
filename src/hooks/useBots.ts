import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type BotType = "guided" | "prompt" | "flow";
export type BotStatus = "draft" | "active" | "paused";

export interface Bot {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  type: BotType;
  status: BotStatus;
  ai_profile_id: string | null;
  knowledge_base_ids: string[];
  channel: string | null;
  calendar_id: string | null;
  guided_config: Record<string, unknown>;
  system_prompt: string | null;
  settings: {
    handover_enabled: boolean;
    handover_role: string | null;
    handover_user_id: string | null;
    trigger_keywords: string[];
    max_messages_per_conversation: number;
    response_delay_ms: number;
    typing_indicator: boolean;
    respect_working_hours: boolean;
    working_hours_start: string;
    working_hours_end: string;
    working_days: number[];
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBotData {
  name: string;
  description?: string;
  type: BotType;
  channel?: string;
  ai_profile_id?: string;
  knowledge_base_ids?: string[];
  system_prompt?: string;
  guided_config?: Record<string, unknown>;
  settings?: Partial<Bot["settings"]>;
}

export function useBots() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["bots", currentWorkspace?.id],
    queryFn: async (): Promise<Bot[]> => {
      if (!currentWorkspace) return [];
      const { data, error } = await (supabase as any)
        .from("bots")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const createBot = useMutation({
    mutationFn: async (input: CreateBotData): Promise<Bot> => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("bots")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: input.name,
          description: input.description || null,
          type: input.type,
          channel: input.channel || null,
          ai_profile_id: input.ai_profile_id || null,
          knowledge_base_ids: input.knowledge_base_ids || [],
          system_prompt: input.system_prompt || null,
          guided_config: input.guided_config || {},
          settings: input.settings || undefined,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots", currentWorkspace?.id] });
      toast.success("AI Employee criado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bot> & { id: string }): Promise<Bot> => {
      const { data, error } = await (supabase as any)
        .from("bots")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots", currentWorkspace?.id] });
      toast.success("AI Employee atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots", currentWorkspace?.id] });
      toast.success("AI Employee eliminado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BotStatus }) => {
      const { error } = await (supabase as any)
        .from("bots")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["bots", currentWorkspace?.id] });
      toast.success(status === "active" ? "Bot ativado!" : "Bot pausado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    bots,
    isLoading,
    createBot,
    updateBot,
    deleteBot,
    toggleStatus,
    activeBots: bots.filter(b => b.status === "active"),
    draftBots: bots.filter(b => b.status === "draft"),
    pausedBots: bots.filter(b => b.status === "paused"),
  };
}

export function useBotDetail(botId: string | undefined) {
  return useQuery({
    queryKey: ["bot", botId],
    queryFn: async (): Promise<Bot | null> => {
      if (!botId) return null;
      const { data, error } = await (supabase as any)
        .from("bots")
        .select("*")
        .eq("id", botId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!botId,
  });
}

export function useBotAnalytics(botId: string | undefined) {
  return useQuery({
    queryKey: ["bot-analytics", botId],
    queryFn: async () => {
      if (!botId) return null;
      const { data } = await (supabase as any)
        .from("bot_analytics")
        .select("*")
        .eq("bot_id", botId)
        .order("period_date", { ascending: false })
        .limit(30);
      const totals = (data || []).reduce(
        (acc: any, row: any) => ({
          total_conversations: acc.total_conversations + (row.total_conversations || 0),
          total_leads: acc.total_leads + (row.total_leads || 0),
          total_bookings: acc.total_bookings + (row.total_bookings || 0),
          handover_count: acc.handover_count + (row.handover_count || 0),
        }),
        { total_conversations: 0, total_leads: 0, total_bookings: 0, handover_count: 0 }
      );
      return { rows: data || [], totals };
    },
    enabled: !!botId,
  });
}
