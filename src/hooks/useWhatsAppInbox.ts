import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WhatsAppInboxConversation {
  id: string;
  workspace_id: string;
  channel: string;
  status: string;
  unread_count: number;
  assigned_to: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  created_at: string;
  contact_id: string | null;
  lead_id: string | null;
  ai_priority: string | null;
  ai_intent: string | null;
  ai_sentiment: string | null;
  contact?: { id: string; name: string | null; phone: string | null } | null;
  lead?: { id: string; name: string | null; phone: string | null } | null;
  assignee?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface WhatsAppSlaSettings {
  whatsapp_pro_sla_first_response_minutes: number;
  whatsapp_pro_sla_resolution_hours: number;
  whatsapp_pro_auto_assign_enabled: boolean;
}

export function useWhatsAppSlaSettings() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-sla-settings", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<WhatsAppSlaSettings> => {
      const { data, error } = await (supabase as any)
        .from("workspace_settings")
        .select(
          "whatsapp_pro_sla_first_response_minutes, whatsapp_pro_sla_resolution_hours, whatsapp_pro_auto_assign_enabled"
        )
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          whatsapp_pro_sla_first_response_minutes: 15,
          whatsapp_pro_sla_resolution_hours: 24,
          whatsapp_pro_auto_assign_enabled: false,
        }
      );
    },
  });
}

export function useUpdateWhatsAppSlaSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (patch: Partial<WhatsAppSlaSettings>) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("workspace_settings")
        .upsert(
          { workspace_id: currentWorkspace.id, ...patch },
          { onConflict: "workspace_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-sla-settings"] });
      toast.success("Configurações de SLA guardadas");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao guardar"),
  });
}

export interface WhatsAppInboxFilters {
  status?: "open" | "closed" | "pending" | "archived" | "all";
  assigned?: "me" | "unassigned" | "any";
  slaState?: "all" | "ok" | "warning" | "breached";
  search?: string;
}

export function useWhatsAppInbox(filters: WhatsAppInboxFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-inbox", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    staleTime: 15_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversations")
        .select(
          `id, workspace_id, channel, status, unread_count, assigned_to,
           last_message_at, last_message_preview, last_message_direction,
           created_at, contact_id, lead_id,
           ai_priority, ai_intent, ai_sentiment,
           contact:contacts(id, name, phone),
           lead:leads(id, name, phone)`
        )
        .eq("workspace_id", currentWorkspace!.id)
        .eq("channel", "whatsapp")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      else q = q.in("status", ["open", "pending"]);

      if (filters.assigned === "unassigned") q = q.is("assigned_to", null);

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as WhatsAppInboxConversation[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter(
          (c) =>
            (c.contact?.name || "").toLowerCase().includes(s) ||
            (c.contact?.phone || "").includes(s) ||
            (c.lead?.name || "").toLowerCase().includes(s) ||
            (c.last_message_preview || "").toLowerCase().includes(s)
        );
      }

      // Resolve assignees
      const assigneeIds = Array.from(
        new Set(rows.map((r) => r.assigned_to).filter(Boolean))
      ) as string[];
      if (assigneeIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", assigneeIds);
        const map = new Map<string, any>();
        for (const p of profiles || []) map.set(p.user_id, p);
        rows = rows.map((r) => ({
          ...r,
          assignee: r.assigned_to ? map.get(r.assigned_to) ?? null : null,
        }));
      }

      return rows;
    },
  });
}

export function classifySla(
  conv: WhatsAppInboxConversation,
  settings: WhatsAppSlaSettings | undefined
): { state: "ok" | "warning" | "breached" | "na"; minutesWaiting: number } {
  if (!settings || !conv.last_message_at || conv.last_message_direction !== "inbound") {
    return { state: "na", minutesWaiting: 0 };
  }
  const minutes = Math.floor(
    (Date.now() - new Date(conv.last_message_at).getTime()) / 60000
  );
  const target = settings.whatsapp_pro_sla_first_response_minutes;
  if (minutes >= target) return { state: "breached", minutesWaiting: minutes };
  if (minutes >= target * 0.66) return { state: "warning", minutesWaiting: minutes };
  return { state: "ok", minutesWaiting: minutes };
}

export function useWhatsAppInboxKpis() {
  const { data: convs } = useWhatsAppInbox({ status: "open" });
  const { data: settings } = useWhatsAppSlaSettings();
  const list = convs || [];
  let unassigned = 0;
  let breached = 0;
  let warning = 0;
  let unread = 0;
  for (const c of list) {
    if (!c.assigned_to) unassigned++;
    if (c.unread_count > 0) unread++;
    const sla = classifySla(c, settings);
    if (sla.state === "breached") breached++;
    if (sla.state === "warning") warning++;
  }
  return {
    total: list.length,
    unassigned,
    breached,
    warning,
    unread,
  };
}
