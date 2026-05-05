import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OutgoingMessagePayload } from "@/integrations/whatsapp/providers/types";

/**
 * Provider Instance — leitura abstracta (sem expor tokens).
 */
export function useWhatsAppProviderInstance() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-provider-instance", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const { data, error } = await supabase
        .from("whatsapp_provider_instances" as never)
        .select(
          "id, workspace_id, provider_name, display_name, default_country, default_country_code, active, metadata, created_at, updated_at",
        )
        .eq("workspace_id", currentWorkspace.id)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error && (error as { code?: string }).code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });
}

/**
 * Garante que existe pelo menos uma provider_instance para o workspace
 * (cria a partir da Z-API connection se necessário).
 */
export function useEnsureWhatsAppProviderInstance() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace ativo");
      const { data, error } = await supabase.rpc("ensure_whatsapp_provider_instance" as never, {
        p_workspace_id: currentWorkspace.id,
      } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-provider-instance", currentWorkspace?.id] });
    },
  });
}

/**
 * Envio unificado — usa edge function abstrata.
 */
export function useWhatsAppProSend() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: Omit<OutgoingMessagePayload, "workspaceId">) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-pro-send", {
        body: { workspaceId: currentWorkspace.id, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; providerMessageId: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-product-shares", currentWorkspace?.id] });
    },
    onError: (err: Error) => {
      toast.error("Não foi possível enviar: " + err.message);
    },
  });
}

/**
 * Histórico de produtos partilhados por WhatsApp.
 */
export function useWhatsAppProductShares(opts?: { contactId?: string; limit?: number }) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-product-shares", currentWorkspace?.id, opts?.contactId, opts?.limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("whatsapp_product_shares" as never)
        .select("id, product_id, contact_id, conversation_id, status, sent_at, clicked_at, agent_id, metadata")
        .eq("workspace_id", currentWorkspace.id)
        .order("sent_at", { ascending: false })
        .limit(opts?.limit ?? 50);
      if (opts?.contactId) q = q.eq("contact_id", opts.contactId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        product_id: string;
        contact_id: string | null;
        conversation_id: string | null;
        status: string;
        sent_at: string;
        clicked_at: string | null;
        agent_id: string | null;
        metadata: Record<string, unknown>;
      }>;
    },
    enabled: !!currentWorkspace,
  });
}

/**
 * Templates WhatsApp (vista combinada).
 */
export function useWhatsAppProTemplates() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-pro-templates", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("whatsapp_templates_view" as never)
        .select("id, name, category, language, country, content, active, suggested_variables, usage_count, updated_at")
        .eq("workspace_id", currentWorkspace.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        category: string;
        language: string;
        country: string;
        content: string;
        active: boolean;
        suggested_variables: unknown;
        usage_count: number;
        updated_at: string;
      }>;
    },
    enabled: !!currentWorkspace,
  });
}

/**
 * Eventos WhatsApp Pro recentes (timeline operacional).
 */
export function useWhatsAppProEvents(limit = 50) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-pro-events", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("whatsapp_communication_events" as never)
        .select("id, event_type, entity_type, entity_id, conversation_id, contact_id, payload, created_at, created_by")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentWorkspace,
  });
}

/**
 * Registar uma partilha de produto (frontend) — backup ao registo automático no envio.
 */
export function useRegisterWhatsAppProductShare() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      productId: string;
      contactId?: string | null;
      conversationId?: string | null;
      messageId?: string | null;
      providerMessageId?: string | null;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("whatsapp_product_shares" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          product_id: input.productId,
          contact_id: input.contactId ?? null,
          conversation_id: input.conversationId ?? null,
          message_id: input.messageId ?? null,
          provider_message_id: input.providerMessageId ?? null,
          agent_id: userRes?.user?.id ?? null,
          status: "sent",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-product-shares", currentWorkspace?.id] });
    },
  });
}
