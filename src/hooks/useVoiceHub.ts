/**
 * FastCRM VoiceHub — React Query hooks (Fase 1P.3)
 * UI nunca menciona o fornecedor: tudo é "FastCRM VoiceHub".
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type VoiceProviderInstance = {
  id: string;
  workspace_id: string;
  provider_name: string;
  display_name: string | null;
  environment: "demo" | "sandbox" | "production" | string;
  status: string;
  base_url: string | null;
  account_id: string | null;
  auth_type: string | null;
  api_key_secret_name: string | null;
  api_token_secret_name: string | null;
  webhook_token: string | null;
  webhook_url: string | null;
  default_country: string;
  default_country_code: string;
  default_currency: string;
  capabilities: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  last_test_status: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type VoiceNumber = {
  id: string;
  workspace_id: string;
  provider_instance_id: string | null;
  number: string;
  normalized_number: string;
  display_name: string | null;
  country: string;
  country_code: string;
  number_type: string | null;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  is_primary: boolean;
  status: string;
  default_use: string | null;
  assigned_user_id: string | null;
  business_hours: Record<string, unknown> | null;
  created_at: string;
};

export type VoiceCallLog = {
  id: string;
  workspace_id: string;
  provider_instance_id: string | null;
  voice_number_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  appointment_id: string | null;
  call_direction: string;
  call_type: string;
  status: string;
  outcome: string | null;
  subject: string | null;
  notes: string | null;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  cost_amount: number | null;
  currency: string;
  recording_url: string | null;
  recording_status: string;
  transcription_status: string;
  transcription_text: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type VoiceProviderRate = {
  id: string;
  workspace_id: string | null;
  provider_name: string;
  country: string;
  destination_type: string;
  direction: string;
  cost_per_minute: number | null;
  connection_fee: number | null;
  billing_increment_seconds: number;
  currency: string;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
};

export type VoiceCallOutcome = {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  category: string | null;
  requires_followup: boolean;
  suggested_next_action: string | null;
  active: boolean;
  sort_order: number;
};

export type VoiceComplianceSettings = {
  workspace_id: string;
  recording_default: boolean;
  recording_consent_required: boolean;
  recording_consent_text: string | null;
  retention_days: number | null;
  allow_outbound_after_hours: boolean;
  default_country: string;
  default_currency: string;
};

// ─────────────── Provider Instances ───────────────

export function useVoiceProviders() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-providers", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_provider_instances")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VoiceProviderInstance[];
    },
  });
}

export function useUpsertVoiceProvider() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VoiceProviderInstance> & { provider_name: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id } as never;
      if (input.id) {
        const { data, error } = await supabase
          .from("voice_provider_instances")
          .update(payload)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("voice_provider_instances")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-providers", currentWorkspace?.id] });
      toast.success("Provider VoiceHub guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVoiceProvider() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_provider_instances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-providers", currentWorkspace?.id] });
      toast.success("Provider removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTestVoiceProvider() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (providerInstanceId: string) => {
      const { data, error } = await supabase.functions.invoke("voice-test-provider", {
        body: { providerInstanceId },
      });
      if (error) throw error;
      return data as { ok: boolean; message: string; latencyMs?: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["voice-providers", currentWorkspace?.id] });
      if (res.ok) toast.success(`Ligação OK${res.latencyMs ? ` (${res.latencyMs}ms)` : ""}`);
      else toast.error(res.message || "Falha no teste");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─────────────── Numbers ───────────────

export function useVoiceNumbers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-numbers", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_numbers")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VoiceNumber[];
    },
  });
}

export function useUpsertVoiceNumber() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VoiceNumber> & { number: string; normalized_number: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id } as never;
      if (input.id) {
        const { error } = await supabase.from("voice_numbers").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voice_numbers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-numbers", currentWorkspace?.id] });
      toast.success("Número guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVoiceNumber() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-numbers", currentWorkspace?.id] });
      toast.success("Número removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─────────────── Call Logs ───────────────

export interface CallLogFilters {
  direction?: string;
  status?: string;
  outcome?: string;
  contactId?: string;
  q?: string;
  limit?: number;
}

export function useVoiceCallLogs(filters: CallLogFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-call-logs", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = supabase
        .from("voice_call_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 100);
      if (filters.direction) q = q.eq("call_direction", filters.direction);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.outcome) q = q.eq("outcome", filters.outcome);
      if (filters.contactId) q = q.eq("contact_id", filters.contactId);
      if (filters.q) q = q.or(`subject.ilike.%${filters.q}%,notes.ilike.%${filters.q}%,to_number.ilike.%${filters.q}%,from_number.ilike.%${filters.q}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VoiceCallLog[];
    },
  });
}

export function useLogVoiceCall() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      direction: "inbound" | "outbound" | "missed";
      from_number?: string;
      to_number?: string;
      contact_id?: string;
      deal_id?: string;
      ticket_id?: string;
      duration_seconds?: number;
      outcome?: string;
      notes?: string;
      subject?: string;
      provider_instance_id?: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("voice-log-call", {
        body: {
          workspace_id: currentWorkspace.id,
          call_direction: input.direction,
          phone: input.to_number,
          from_number: input.from_number,
          contact_id: input.contact_id,
          deal_id: input.deal_id,
          ticket_id: input.ticket_id,
          duration_seconds: input.duration_seconds,
          outcome: input.outcome,
          notes: input.notes,
          subject: input.subject,
          provider_instance_id: input.provider_instance_id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-call-logs", currentWorkspace?.id] });
      toast.success("Chamada registada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClickToCall() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      to_number: string;
      from_number?: string;
      contact_id?: string;
      provider_instance_id?: string;
      record?: boolean;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("voice-click-to-call", {
        body: {
          workspace_id: currentWorkspace.id,
          to_number: input.to_number,
          from_number: input.from_number,
          contact_id: input.contact_id,
          provider_instance_id: input.provider_instance_id,
          record: input.record,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-call-logs", currentWorkspace?.id] });
      toast.success("Chamada iniciada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─────────────── Outcomes ───────────────

export function useVoiceOutcomes() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-outcomes", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_call_outcomes")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VoiceCallOutcome[];
    },
  });
}

// ─────────────── Rates ───────────────

export function useVoiceRates() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-rates", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_provider_rates")
        .select("*")
        .or(`workspace_id.eq.${currentWorkspace!.id},workspace_id.is.null`)
        .order("country", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VoiceProviderRate[];
    },
  });
}

export function useUpsertVoiceRate() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VoiceProviderRate> & { provider_name: string; country: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id } as never;
      if (input.id) {
        const { error } = await supabase.from("voice_provider_rates").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("voice_provider_rates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-rates", currentWorkspace?.id] });
      toast.success("Tarifa guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVoiceRate() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_provider_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-rates", currentWorkspace?.id] });
      toast.success("Tarifa removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─────────────── Compliance ───────────────

export function useVoiceCompliance() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["voice-compliance", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_compliance_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as VoiceComplianceSettings | null;
    },
  });
}

export function useUpsertVoiceCompliance() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VoiceComplianceSettings>) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id } as never;
      const { error } = await supabase
        .from("voice_compliance_settings")
        .upsert(payload, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-compliance", currentWorkspace?.id] });
      toast.success("Conformidade actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
