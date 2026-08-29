/**
 * Ligação Z-API do módulo "Contacto 1:1 validado".
 *
 * Reutiliza a instância Z-API já existente do workspace (whatsapp_zapi_connections):
 * não cria integração duplicada e nunca lê/escreve segredos no frontend.
 * O envio é sempre decidido no servidor (`outreach-zapi-send`), bloqueado por defeito.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { OutreachEntityType } from "../types";

const db = () => supabase as any;

export type OutreachLinkMode = "disabled" | "simulation" | "live";

export interface OutreachChannelLink {
  id: string;
  workspace_id: string;
  provider: "zapi";
  mode: OutreachLinkMode;
  enabled: boolean;
  instance_ref: string | null;
  last_diagnostic_at: string | null;
  last_diagnostic: Record<string, unknown>;
}

export interface OutreachZapiDiagnostic {
  providerConfigured: boolean;
  providerStatus: string;
  providerPhoneMasked: string | null;
  instanceRefMasked: string | null;
  webhookConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookLastReceivedAt: string | null;
  lastProviderError: string | null;
  linkEnabled: boolean;
  linkMode: OutreachLinkMode;
  liveDispatchEnabled: boolean;
  checkedAt: string;
}

/** Configuração da ligação (sem segredos). */
export function useOutreachChannelLink() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-channel-link", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_channel_links")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("provider", "zapi")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as OutreachChannelLink | null;
    },
  });
}

export function useSaveOutreachChannelLink() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { enabled: boolean; mode: OutreachLinkMode; instance_ref?: string | null }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace activo");
      const { error } = await db().from("outreach_channel_links").upsert(
        {
          workspace_id: currentWorkspace.id,
          provider: "zapi",
          enabled: input.enabled,
          mode: input.mode,
          instance_ref: input.instance_ref ?? null,
          created_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,provider" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-channel-link"] });
      qc.invalidateQueries({ queryKey: ["outreach-zapi-diagnostic"] });
      toast.success("Ligação Z-API actualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao guardar ligação"),
  });
}

/** Diagnóstico server-side (nunca devolve tokens). */
export function useOutreachZapiDiagnostic(enabled = true) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-zapi-diagnostic", currentWorkspace?.id],
    enabled: enabled && !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("outreach-zapi-status", {
        body: { workspaceId: currentWorkspace!.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      return data.diagnostic as OutreachZapiDiagnostic;
    },
  });
}

export interface PrepareSendResult {
  success: boolean;
  outcome: "blocked" | "simulated" | "sent";
  simulated?: boolean;
  message?: string;
  reason?: string;
  failures?: Array<{ id: string; reason: string }>;
  attemptId?: string | null;
  instanceRef?: string | null;
}

/** "Preparar envio via Z-API" — validação server-side + simulação segura. Nunca envia. */
export function usePrepareZapiSend(entityType: OutreachEntityType, entityId?: string) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (): Promise<PrepareSendResult> => {
      if (!currentWorkspace?.id || !entityId) throw new Error("Sem contexto de entidade");
      const { data, error } = await supabase.functions.invoke("outreach-zapi-send", {
        body: { workspaceId: currentWorkspace.id, entityType, entityId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      return data as PrepareSendResult;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["outreach-send-attempts"] });
      if (res.outcome === "blocked") {
        toast.error(
          res.failures?.length
            ? `Bloqueado: ${res.failures.map((f) => f.reason).join(" ")}`
            : `Bloqueado (${res.reason ?? "condições não cumpridas"})`,
        );
      } else {
        toast.success(res.message ?? "Envio preparado — simulação segura, nada foi enviado.");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao preparar envio"),
  });
}

export interface OutreachSendAttempt {
  id: string;
  outcome: "blocked" | "simulated" | "sent" | "error";
  mode: string;
  blocked_reason: string | null;
  provider_message_id: string | null;
  instance_ref: string | null;
  created_at: string;
}

export function useOutreachSendAttempts(entityType: OutreachEntityType, entityId?: string, limit = 20) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-send-attempts", currentWorkspace?.id, entityType, entityId],
    enabled: !!currentWorkspace?.id && !!entityId,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_send_attempts")
        .select("id, outcome, mode, blocked_reason, provider_message_id, instance_ref, created_at")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as OutreachSendAttempt[];
    },
  });
}
