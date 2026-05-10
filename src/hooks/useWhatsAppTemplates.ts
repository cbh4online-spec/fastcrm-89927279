import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const sb = supabase as any;

export interface WhatsAppTemplate {
  id: string;
  workspace_id: string;
  name: string;
  language: string;
  body: string;
  is_active: boolean | null;
  status: string | null;
  usage_count: number | null;
  dynamic_schema: any;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  category?: string | null;
  country?: string | null;
}

export interface WhatsAppTemplateMeta {
  template_id: string;
  category: string | null;
  country: string | null;
  suggested_variables: string[] | null;
  preview_image_url: string | null;
}

export type TemplateStatus = "draft" | "pending_review" | "approved" | "rejected";

export function detectVariables(body: string): string[] {
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) seen.add(m[1]);
  return Array.from(seen);
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function useWhatsAppTemplates() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["wa-templates", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("communication_templates")
        .select("id, workspace_id, name, language, body, is_active, status, usage_count, dynamic_schema, tags, created_at, updated_at")
        .eq("workspace_id", wid)
        .eq("channel", "whatsapp")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ids = (data || []).map((t: any) => t.id);
      let metaMap = new Map<string, WhatsAppTemplateMeta>();
      if (ids.length) {
        const { data: metas } = await sb
          .from("whatsapp_templates_meta")
          .select("template_id, category, country, suggested_variables, preview_image_url")
          .in("template_id", ids);
        for (const m of metas || []) metaMap.set(m.template_id, m);
      }

      return (data || []).map((t: any) => {
        const meta = metaMap.get(t.id);
        return {
          ...t,
          category: meta?.category ?? "general",
          country: meta?.country ?? "PT",
        } as WhatsAppTemplate;
      });
    },
  });
}

export interface UpsertTemplateInput {
  id?: string;
  name: string;
  language: string;
  body: string;
  category: string;
  country: string;
  status?: TemplateStatus;
  is_active?: boolean;
  tags?: string[];
}

export function useUpsertWhatsAppTemplate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpsertTemplateInput) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sem workspace");
      const variables = detectVariables(input.body);
      const dynamic_schema = { variables };

      let templateId = input.id;
      if (templateId) {
        const { error } = await sb
          .from("communication_templates")
          .update({
            name: input.name,
            language: input.language,
            body: input.body,
            status: input.status ?? "draft",
            is_active: input.is_active ?? true,
            tags: input.tags ?? [],
            dynamic_schema,
            updated_at: new Date().toISOString(),
          })
          .eq("id", templateId)
          .eq("workspace_id", currentWorkspace.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb
          .from("communication_templates")
          .insert({
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            channel: "whatsapp",
            name: input.name,
            language: input.language,
            body: input.body,
            status: input.status ?? "draft",
            is_active: input.is_active ?? true,
            tags: input.tags ?? [],
            dynamic_schema,
          })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Upsert meta
      const { error: mErr } = await sb
        .from("whatsapp_templates_meta")
        .upsert({
          template_id: templateId,
          workspace_id: currentWorkspace.id,
          category: input.category,
          country: input.country,
          suggested_variables: variables,
          updated_at: new Date().toISOString(),
        }, { onConflict: "template_id" });
      if (mErr) throw mErr;

      return templateId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
      toast.success("Template guardado");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao guardar template"),
  });
}

export function useDeleteWhatsAppTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("communication_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
      toast.success("Template eliminado");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao eliminar"),
  });
}

export function useSetTemplateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TemplateStatus }) => {
      const { error } = await sb
        .from("communication_templates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
      toast.success("Estado atualizado");
    },
  });
}
