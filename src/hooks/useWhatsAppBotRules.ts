import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WhatsAppBotRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  match_type: "exact" | "contains" | "starts_with" | "regex";
  case_sensitive: boolean;
  keywords: string[];
  reply_text: string | null;
  reply_media_url: string | null;
  reply_media_mime_type: string | null;
  attach_product_id: string | null;
  send_once_per_conversation: boolean;
  cooldown_minutes: number;
  handoff_to_human: boolean;
  handoff_assign_to_user_id: string | null;
  respect_working_hours: boolean;
  working_hours_start: string | null;
  working_hours_end: string | null;
  working_days: number[];
  match_count: number;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppBotRuleLog {
  id: string;
  workspace_id: string;
  rule_id: string;
  conversation_id: string | null;
  message_id: string | null;
  matched_keyword: string | null;
  message_excerpt: string | null;
  reply_sent: boolean;
  handoff_triggered: boolean;
  error: string | null;
  created_at: string;
}

export type BotRuleInput = Omit<
  WhatsAppBotRule,
  "id" | "workspace_id" | "match_count" | "last_matched_at" | "created_at" | "updated_at"
>;

export function useWhatsAppBotRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["wa-bot-rules", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_bot_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WhatsAppBotRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useWhatsAppBotRuleLogs(ruleId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["wa-bot-rule-logs", currentWorkspace?.id, ruleId ?? "all"],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = (supabase as any)
        .from("whatsapp_bot_rule_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (ruleId) q = q.eq("rule_id", ruleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WhatsAppBotRuleLog[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertWhatsAppBotRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: BotRuleInput & { id?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id, created_by: user?.id ?? null };
      if (id) {
        const { error } = await (supabase as any)
          .from("whatsapp_bot_rules")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("whatsapp_bot_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-bot-rules", currentWorkspace?.id] });
      toast.success("Regra guardada");
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "desconhecido")),
  });
}

export function useDeleteWhatsAppBotRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_bot_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-bot-rules", currentWorkspace?.id] });
      toast.success("Regra eliminada");
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "desconhecido")),
  });
}

export function useToggleWhatsAppBotRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("whatsapp_bot_rules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-bot-rules", currentWorkspace?.id] }),
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "desconhecido")),
  });
}
