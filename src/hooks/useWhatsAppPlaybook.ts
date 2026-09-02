/**
 * Playbook comercial de templates WhatsApp (Conversion Engine).
 *
 * - Lê o playbook do workspace atual.
 * - Faz seeding idempotente da biblioteca inicial (LEAD_NEW_* e QUALIFY_*).
 * - Dispara o cálculo de Next Best Action (`whatsapp-engine-recommend`).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { PLAYBOOK_SEEDS, type PlaybookTemplateSeed } from "@/lib/whatsapp/engine/seeds";
import type { ExecutionMode, TemplateFamily } from "@/lib/whatsapp/engine/families";

const sb = supabase as any;

export interface PlaybookTemplate {
  id: string;
  workspace_id: string;
  code: string;
  name: string;
  family: TemplateFamily;
  subfamily: string | null;
  pipeline_stage: string | null;
  objective: string | null;
  description: string | null;
  message_body: string;
  timing_min_minutes: number | null;
  timing_max_minutes: number | null;
  use_conditions: Record<string, unknown>;
  exclusion_conditions: Record<string, unknown>;
  required_variables: string[];
  variable_fallbacks: Record<string, string>;
  cta: string | null;
  behavioral_principle: string | null;
  primary_kpi: string | null;
  priority: number;
  execution_mode: ExecutionMode;
  is_active: boolean;
}

function seedToRow(seed: PlaybookTemplateSeed, workspaceId: string) {
  return {
    workspace_id: workspaceId,
    code: seed.code,
    name: seed.name,
    family: seed.family,
    subfamily: seed.subfamily,
    channel: "whatsapp",
    pipeline_stage: seed.pipelineStage,
    objective: seed.objective,
    description: seed.description,
    message_body: seed.messageBody,
    timing_min_minutes: seed.timingMinMinutes,
    timing_max_minutes: seed.timingMaxMinutes,
    use_conditions: seed.useConditions,
    exclusion_conditions: seed.exclusionConditions,
    required_variables: seed.requiredVariables,
    variable_fallbacks: seed.variableFallbacks,
    cta: seed.cta,
    behavioral_principle: seed.behavioralPrinciple,
    primary_kpi: seed.primaryKpi,
    priority: seed.priority,
    execution_mode: seed.executionMode,
  };
}

export function useWhatsAppPlaybook(family?: TemplateFamily) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["whatsapp-playbook", wid, family ?? "all"],
    queryFn: async (): Promise<PlaybookTemplate[]> => {
      if (!wid) return [];
      let q = sb
        .from("whatsapp_template_playbook")
        .select("*")
        .eq("workspace_id", wid)
        .order("family", { ascending: true })
        .order("priority", { ascending: false });
      if (family) q = q.eq("family", family);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PlaybookTemplate[];
    },
    enabled: !!wid,
  });
}

/** Devolve o template do playbook correspondente a um código (ex.: LEAD_NEW_02). */
export function usePlaybookTemplate(code: string | null | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["whatsapp-playbook-template", wid, code],
    queryFn: async (): Promise<PlaybookTemplate | null> => {
      if (!wid || !code) return null;
      const { data, error } = await sb
        .from("whatsapp_template_playbook")
        .select("*")
        .eq("workspace_id", wid)
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PlaybookTemplate | null;
    },
    enabled: !!wid && !!code,
  });
}

/** Instala/atualiza a biblioteca inicial no workspace (idempotente por código). */
export function useSeedWhatsAppPlaybook() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (opts?: { overwrite?: boolean }) => {
      const wid = currentWorkspace?.id;
      if (!wid) throw new Error("Sem workspace ativo");

      const { data: existing, error: readErr } = await sb
        .from("whatsapp_template_playbook")
        .select("code")
        .eq("workspace_id", wid);
      if (readErr) throw readErr;

      const known = new Set<string>((existing ?? []).map((r: any) => r.code));
      const toWrite = opts?.overwrite
        ? PLAYBOOK_SEEDS
        : PLAYBOOK_SEEDS.filter((s) => !known.has(s.code));

      if (!toWrite.length) return { inserted: 0, updated: 0 };

      const rows = toWrite.map((s) => seedToRow(s, wid));
      const { error } = await sb
        .from("whatsapp_template_playbook")
        .upsert(rows, { onConflict: "workspace_id,code" });
      if (error) throw error;

      return opts?.overwrite
        ? { inserted: toWrite.filter((s) => !known.has(s.code)).length, updated: toWrite.length }
        : { inserted: toWrite.length, updated: 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-playbook"] });
      if (!res.inserted && !res.updated) toast.info("Biblioteca já está instalada e atualizada.");
      else toast.success(`Biblioteca atualizada (${res.inserted} novos, ${res.updated} atualizados).`);
    },
    onError: (e: Error) => toast.error("Não foi possível instalar a biblioteca: " + e.message),
  });
}

/** Recalcula a Next Best Action das leads do workspace. */
export function useRecommendNextBestActions() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (vars?: { leadIds?: string[]; limit?: number }) => {
      const wid = currentWorkspace?.id;
      if (!wid) throw new Error("Sem workspace ativo");
      const { data, error } = await supabase.functions.invoke("whatsapp-engine-recommend", {
        body: { workspace_id: wid, lead_ids: vars?.leadIds ?? [], limit: vars?.limit ?? 50 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { processed: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-next-best-action"] });
      qc.invalidateQueries({ queryKey: ["next-best-actions"] });
    },
    onError: (e: Error) => toast.error("Não foi possível calcular a próxima ação: " + e.message),
  });
}
