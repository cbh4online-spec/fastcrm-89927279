import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface VerticalTemplateRow {
  id: string;
  workspace_id: string;
  slug: string;
  nome: string;
  dor_principal: string;
  resultado_prometido: string;
  dores: string[];
  modulos_ativos: { nome: string; desc: string; icon: string }[];
  antes_depois: { antes: string[]; depois: string[] };
  roi_exemplo: { clientes_extra: number; valor_medio: number; periodo: string };
  cores: { primaria: string; accent: string };
  cta_principal: string;
  cta_secundario: string;
  ai_persona_nome: string;
  seo: { title: string; description: string; canonical: string };
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type VerticalTemplateInsert = Omit<VerticalTemplateRow, "id" | "created_at" | "updated_at">;

const TABLE = "vertical_templates";

export function useVerticalTemplates() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: [TABLE, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VerticalTemplateRow[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useVerticalTemplate(id: string | null) {
  return useQuery({
    queryKey: [TABLE, "detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as VerticalTemplateRow;
    },
    enabled: !!id,
  });
}

export function useCreateVerticalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VerticalTemplateInsert) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as VerticalTemplateRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
      toast.success("Template criado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVerticalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VerticalTemplateRow> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as VerticalTemplateRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
      toast.success("Template actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVerticalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
      toast.success("Template eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Auto-provision: find or create a vertical_template row for a static slug
export function useEnsureVerticalTemplate(slug: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useQuery({
    queryKey: [TABLE, "ensure", slug, currentWorkspace?.id],
    queryFn: async () => {
      if (!slug || !currentWorkspace?.id) return null;

      // 1. Check if already exists
      const { data: existing, error: findErr } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("slug", slug)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing) return existing as VerticalTemplateRow;

      // 2. Get static config
      const { getVerticalBySlug } = await import("@/config/verticalConfigs");
      const cfg = getVerticalBySlug(slug);
      if (!cfg) return null;

      // 3. Insert
      const row: VerticalTemplateInsert = {
        workspace_id: currentWorkspace.id,
        slug: cfg.slug,
        nome: cfg.nome,
        dor_principal: cfg.dor_principal,
        resultado_prometido: cfg.resultado_prometido,
        dores: cfg.dores,
        modulos_ativos: cfg.modulos_ativos,
        antes_depois: cfg.antes_depois,
        roi_exemplo: cfg.roi_exemplo,
        cores: cfg.cores,
        cta_principal: cfg.cta_principal,
        cta_secundario: cfg.cta_secundario,
        ai_persona_nome: cfg.ai_persona_nome,
        seo: cfg.seo,
        is_published: true,
        created_by: null,
      };
      const { data: created, error: insErr } = await (supabase as any)
        .from(TABLE)
        .insert(row)
        .select()
        .single();
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: [TABLE] });
      return created as VerticalTemplateRow;
    },
    enabled: !!slug && !!currentWorkspace?.id,
    staleTime: Infinity,
  });
}

// Fetch a published template by slug (public, no auth needed)
export async function fetchPublishedTemplateBySlug(slug: string): Promise<VerticalTemplateRow | null> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) return null;
  return data as VerticalTemplateRow | null;
}
