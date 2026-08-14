/**
 * Chamadas via WhatsApp — registo automático + confirmação
 *
 * Nota técnica: nenhuma API de WhatsApp permite iniciar chamadas de voz por servidor.
 * A chamada parte sempre da app WhatsApp do utilizador (Desktop/Web ou telemóvel).
 * O CRM abre o WhatsApp no número certo, cria o registo e recolhe o resultado.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type WhatsAppCallEntityType = "contact" | "lead" | "company";

export interface WhatsAppCallSettings {
  id: string;
  workspace_id: string;
  user_id: string;
  from_number: string | null;
  preferred_device: "auto" | "desktop" | "mobile";
}

export interface WhatsAppCallLog {
  id: string;
  workspace_id: string;
  from_number: string | null;
  to_number: string | null;
  status: string;
  started_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

export const WHATSAPP_CALL_OUTCOMES = [
  { value: "answered", label: "Atendeu" },
  { value: "no_answer", label: "Não atendeu" },
  { value: "callback", label: "Remarcar / voltar a ligar" },
  { value: "wrong_number", label: "Número errado" },
  { value: "not_interested", label: "Sem interesse" },
  { value: "interested", label: "Interessado" },
] as const;

/** Normaliza para E.164 sem "+" (formato exigido pelos deep links do WhatsApp). */
export function normalizeWhatsAppNumber(raw?: string | null, defaultDial = "351"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    digits = digits.slice(1).replace(/\D/g, "");
  } else {
    digits = digits.replace(/\D/g, "");
    if (digits.length <= 9) digits = `${defaultDial}${digits}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function formatWhatsAppNumber(raw?: string | null): string {
  const n = normalizeWhatsAppNumber(raw);
  return n ? `+${n}` : (raw ?? "");
}

export function buildWhatsAppLinks(number: string) {
  return {
    app: `whatsapp://send?phone=${number}`,
    web: `https://web.whatsapp.com/send?phone=${number}`,
    universal: `https://wa.me/${number}`,
  };
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Definições WhatsApp do próprio utilizador no workspace atual. */
export function useMyWhatsAppCallSettings() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-call-settings", currentWorkspace?.id, user?.id],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_whatsapp_call_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as WhatsAppCallSettings | null;
    },
  });
}

export function useSaveMyWhatsAppCallSettings() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { from_number: string | null; preferred_device?: "auto" | "desktop" | "mobile" }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sem sessão ou workspace");
      const normalized = input.from_number ? normalizeWhatsAppNumber(input.from_number) : null;
      if (input.from_number && !normalized) throw new Error("Número inválido. Use o formato +351 9xx xxx xxx");
      const { error } = await supabase.from("user_whatsapp_call_settings").upsert(
        {
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          from_number: normalized ? `+${normalized}` : null,
          preferred_device: input.preferred_device ?? "auto",
        },
        { onConflict: "workspace_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-call-settings"] });
      toast.success("Número WhatsApp guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

interface StartCallInput {
  toNumber: string;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string;
  fromNumber?: string | null;
}

/** Cria o registo no momento do clique (estado "ringing"). */
export function useStartWhatsAppCall() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StartCallInput) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const normalized = normalizeWhatsAppNumber(input.toNumber);
      if (!normalized) throw new Error("Número de telefone inválido");

      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        call_direction: "outbound",
        call_type: "whatsapp_call",
        status: "ringing",
        from_number: input.fromNumber ?? null,
        to_number: `+${normalized}`,
        normalized_to_number: normalized,
        started_at: new Date().toISOString(),
        created_by: user?.id ?? null,
        assigned_to: user?.id ?? null,
        subject: input.entityName ? `Chamada WhatsApp — ${input.entityName}` : "Chamada WhatsApp",
        metadata: {
          channel: "whatsapp",
          entity_type: input.entityType,
          entity_id: input.entityId,
          entity_name: input.entityName ?? null,
        },
      };
      if (input.entityType === "contact") payload.contact_id = input.entityId;
      if (input.entityType === "lead") payload.lead_id = input.entityId;
      if (input.entityType === "company") payload.customer_id = input.entityId;

      const { data, error } = await supabase
        .from("voice_call_logs")
        .insert(payload as never)
        .select("id, started_at")
        .single();
      if (error) throw error;
      return data as { id: string; started_at: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-pending-calls"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível registar a chamada: ${e.message}`),
  });
}

interface FinishCallInput {
  callId: string;
  durationSeconds: number;
  outcome: string;
  notes?: string;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string;
  toNumber?: string | null;
  fromNumber?: string | null;
}

/** Fecha o registo e espelha na timeline de atividade da ficha. */
export function useFinishWhatsAppCall() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FinishCallInput) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const answered = input.outcome === "answered" || input.durationSeconds > 0;
      const { error } = await supabase
        .from("voice_call_logs")
        .update({
          status: answered ? "completed" : "no_answer",
          duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
          outcome: input.outcome || null,
          notes: input.notes?.trim() || null,
          ended_at: new Date().toISOString(),
          answered_at: answered ? new Date().toISOString() : null,
        })
        .eq("id", input.callId)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;

      const outcomeLabel =
        WHATSAPP_CALL_OUTCOMES.find((o) => o.value === input.outcome)?.label ?? "Registada";
      const mins = Math.floor(input.durationSeconds / 60);
      const secs = Math.round(input.durationSeconds % 60);
      const durationLabel = `${mins}m ${String(secs).padStart(2, "0")}s`;

      const { error: actError } = await supabase.from("entity_activities").insert({
        workspace_id: currentWorkspace.id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        activity_type: "call_made",
        title: `Chamada WhatsApp — ${outcomeLabel}`,
        description: [
          input.toNumber ? `Para ${input.toNumber}` : null,
          input.fromNumber ? `de ${input.fromNumber}` : null,
          `duração ${durationLabel}`,
          input.notes?.trim() || null,
        ]
          .filter(Boolean)
          .join(" · "),
        metadata: {
          channel: "whatsapp",
          call_id: input.callId,
          outcome: input.outcome,
          duration_seconds: Math.round(input.durationSeconds),
          from_number: input.fromNumber ?? null,
          to_number: input.toNumber ?? null,
        },
        related_type: "voice_call_log",
        related_id: input.callId,
        created_by: user?.id ?? null,
      } as never);
      if (actError) throw actError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-pending-calls"] });
      qc.invalidateQueries({ queryKey: ["entity-activities"] });
      qc.invalidateQueries({ queryKey: ["entity-timeline"] });
      qc.invalidateQueries({ queryKey: ["voice-call-logs"] });
      toast.success("Chamada registada na atividade do cliente");
    },
    onError: (e: Error) => toast.error(`Erro ao guardar a chamada: ${e.message}`),
  });
}

/** Cancela um registo iniciado que nunca foi fechado. */
export function useCancelWhatsAppCall() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (callId: string) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { error } = await supabase
        .from("voice_call_logs")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", callId)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-pending-calls"] });
      toast.success("Chamada descartada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Chamadas WhatsApp iniciadas e por fechar nesta ficha (pelo utilizador atual). */
export function usePendingWhatsAppCalls(entityType: WhatsAppCallEntityType, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const column =
    entityType === "contact" ? "contact_id" : entityType === "lead" ? "lead_id" : "customer_id";
  return useQuery({
    queryKey: ["whatsapp-pending-calls", currentWorkspace?.id, entityType, entityId, user?.id],
    enabled: !!currentWorkspace?.id && !!entityId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_call_logs")
        .select("id, workspace_id, from_number, to_number, status, started_at, duration_seconds, outcome, notes, metadata")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("call_type", "whatsapp_call")
        .eq("status", "ringing")
        .eq(column, entityId!)
        .eq("created_by", user!.id)
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppCallLog[];
    },
  });
}
