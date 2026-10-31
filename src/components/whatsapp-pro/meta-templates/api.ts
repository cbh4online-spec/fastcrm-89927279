import { supabase } from "@/integrations/supabase/client";
import type { MetaTemplateDraft, FieldErrors } from "../../../../supabase/functions/_shared/metaTemplateRules";

export type MetaTemplateRow = {
  id: string; workspace_id: string; internal_name: string; meta_name: string; meta_template_id: string | null;
  category: string; language: string; description: string | null; tags: string[]; definition: MetaTemplateDraft;
  automations: Record<string, unknown>; status: string; rejected_reason: string | null; quality_score: string | null;
  version: number; parent_template_id: string | null; submitted_at: string | null; last_synced_at: string | null;
  created_at: string; updated_at: string;
};
export type TemplateVar = { template_id: string; var_index: number; crm_field: string | null; example_value: string | null; fallback_value: string | null };
export type ButtonAction = { template_id: string; button_key: string; action_type: string; config: Record<string, unknown> };
export type TemplateVersion = { id: string; template_id: string; version: number; change_type: string; status: string | null; created_at: string };
export type ListResult = { templates: MetaTemplateRow[]; variables: TemplateVar[]; buttonActions: ButtonAction[]; versions: TemplateVersion[]; phone: string | null };

export class MetaTplError extends Error {
  constructor(message: string, public code?: string, public fieldErrors?: FieldErrors) { super(message); }
}

export async function callMetaTemplates<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", { body });
  if (error) {
    let msg = error.message;
    try { const t = await (error as any).context?.text?.(); const j = t ? JSON.parse(t) : null; if (j?.error) msg = j.error; } catch { /* */ }
    throw new MetaTplError(msg);
  }
  if (data?.error) throw new MetaTplError(data.error, data.code, data.fieldErrors);
  return data as T;
}

export const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Rascunho local", variant: "outline" },
  PENDING: { label: "Submetido / Pendente", variant: "secondary" },
  IN_APPEAL: { label: "Em recurso", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  PAUSED: { label: "Em pausa", variant: "outline" },
  DISABLED: { label: "Desativado", variant: "outline" },
};
export const CATEGORY_LABEL: Record<string, string> = { UTILITY: "Utilidade", MARKETING: "Marketing", AUTHENTICATION: "Autenticação" };
export const LOCKED_STATUSES = new Set(["APPROVED", "PENDING", "IN_APPEAL", "PAUSED", "DISABLED"]);
