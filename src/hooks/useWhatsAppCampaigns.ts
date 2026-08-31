import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WhatsAppCampaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  message_type: string;
  message_text: string | null;
  media_url: string | null;
  cta_url: string | null;
  cta_label: string | null;
  throttle_per_minute: number;
  send_window_start: string;
  send_window_end: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed";
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  skipped_count: number;
  append_optout_footer: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipientInput {
  phone: string;
  contact_name?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  company_id?: string | null;
}

export function useWhatsAppCampaigns() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["whatsapp-campaigns", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("whatsapp_campaigns" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppCampaign[];
    },
    enabled: !!currentWorkspace,
    refetchInterval: 15000,
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      message_text: string;
      message_type?: string;
      media_url?: string | null;
      cta_url?: string | null;
      cta_label?: string | null;
      throttle_per_minute?: number;
      send_window_start?: string;
      send_window_end?: string;
      scheduled_at?: string | null;
      append_optout_footer?: boolean;
      recipients: CampaignRecipientInput[];
    }) => {
      if (!currentWorkspace) throw new Error("Sem workspace");
      const { data: { user } } = await supabase.auth.getUser();

      const { data: campaign, error: cErr } = await supabase
        .from("whatsapp_campaigns" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user?.id ?? null,
          name: input.name,
          message_text: input.message_text,
          message_type: input.message_type ?? "text",
          media_url: input.media_url ?? null,
          cta_url: input.cta_url ?? null,
          cta_label: input.cta_label ?? null,
          throttle_per_minute: input.throttle_per_minute ?? 20,
          send_window_start: input.send_window_start ?? "09:00",
          send_window_end: input.send_window_end ?? "20:00",
          scheduled_at: input.scheduled_at ?? null,
          append_optout_footer: input.append_optout_footer ?? true,
          status: "draft",
          total_recipients: input.recipients.length,
        } as never)
        .select()
        .single();
      if (cErr || !campaign) throw cErr || new Error("Falha ao criar campanha");

      const c = campaign as unknown as WhatsAppCampaign;

      // Bulk insert recipients (dedupe by phone)
      const seen = new Set<string>();
      const rows = input.recipients
        .map((r) => ({ ...r, phone: (r.phone || "").replace(/\D/g, "") }))
        .filter((r) => r.phone && !seen.has(r.phone) && (seen.add(r.phone), true))
        .map((r) => ({
          campaign_id: c.id,
          workspace_id: currentWorkspace.id,
          phone: r.phone,
          contact_name: r.contact_name ?? null,
          contact_id: r.contact_id ?? null,
          lead_id: r.lead_id ?? null,
          company_id: r.company_id ?? null,
          status: "pending",
        }));

      if (rows.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const { error: rErr } = await supabase
            .from("whatsapp_campaign_recipients" as never)
            .insert(rows.slice(i, i + chunkSize) as never);
          if (rErr) throw rErr;
        }
        await supabase
          .from("whatsapp_campaigns" as never)
          .update({ total_recipients: rows.length } as never)
          .eq("id", c.id);
      }

      return c;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha criada");
    },
    onError: (e: Error) => toast.error("Falha ao criar campanha: " + e.message),
  });

  const launch = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns" as never)
        .update({ status: "sending", started_at: new Date().toISOString() } as never)
        .eq("id", campaignId);
      if (error) throw error;
      // Trigger immediately
      await supabase.functions.invoke("whatsapp-pro-campaign-dispatch", {
        body: { trigger: "manual", campaignId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha iniciada");
    },
    onError: (e: Error) => toast.error("Falha: " + e.message),
  });

  const pause = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns" as never)
        .update({ status: "paused" } as never)
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha pausada");
    },
  });

  const resume = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns" as never)
        .update({ status: "sending" } as never)
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha retomada");
    },
  });

  const remove = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("whatsapp_campaigns" as never)
        .delete()
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      toast.success("Campanha removida");
    },
  });

  return {
    campaigns: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    create,
    launch,
    pause,
    resume,
    remove,
  };
}

export function useWhatsAppOptouts() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["whatsapp-optouts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("whatsapp_optouts" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentWorkspace,
  });

  const add = useMutation({
    mutationFn: async (phone: string) => {
      if (!currentWorkspace) throw new Error("Sem workspace");
      const cleaned = phone.replace(/\D/g, "");
      const { error } = await supabase
        .from("whatsapp_optouts" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          phone: cleaned,
          source: "manual",
          reason: "Adicionado manualmente",
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-optouts"] });
      toast.success("Número adicionado à lista de opt-out");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_optouts" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-optouts"] });
      toast.success("Removido");
    },
  });

  return { optouts: listQuery.data ?? [], isLoading: listQuery.isLoading, add, remove };
}
