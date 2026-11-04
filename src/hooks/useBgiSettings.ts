import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BUSINESS_TEMPLATES, type BusinessTemplateId } from "@/lib/bgi/indicatorCatalog";
import { sanitizeLayout, type DashboardLayout } from "@/lib/bgi/dashboardLayout";
import { sanitizeThresholds, type AlertThresholds } from "@/lib/bgi/alertRules";

export function sanitizeTemplateIds(ids: string[]): BusinessTemplateId[] {
  return [...new Set(ids)].filter((t): t is BusinessTemplateId => t in BUSINESS_TEMPLATES);
}

export function useBgiSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["bgi-settings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_bgi_settings")
        .select("template_ids, indicator_order, hidden_indicators, alert_thresholds, updated_at")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return {
        templateIds: sanitizeTemplateIds(data?.template_ids ?? []),
        layout: sanitizeLayout({ order: data?.indicator_order ?? [], hidden: data?.hidden_indicators ?? [] }),
        thresholds: sanitizeThresholds(data?.alert_thresholds),
        exists: !!data,
        updatedAt: data?.updated_at ?? null,
      };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["bgi-settings", workspaceId] });

  const save = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const template_ids = sanitizeTemplateIds(ids);
      const { error } = await supabase
        .from("workspace_bgi_settings")
        .upsert({ workspace_id: workspaceId, template_ids }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveLayout = useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const clean = sanitizeLayout(layout);
      const { data, error } = await supabase
        .from("workspace_bgi_settings")
        .update({ indicator_order: clean.order, hidden_indicators: clean.hidden })
        .eq("workspace_id", workspaceId)
        .select("workspace_id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Sem permissão para alterar o painel ou modelos ainda não guardados");
    },
    onSuccess: invalidate,
  });

  const saveThresholds = useMutation({
    mutationFn: async (t: AlertThresholds) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase
        .from("workspace_bgi_settings")
        .update({ alert_thresholds: sanitizeThresholds(t) as any })
        .eq("workspace_id", workspaceId)
        .select("workspace_id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Sem permissão para alterar os alertas");
    },
    onSuccess: invalidate,
  });

  return { ...query, save, saveLayout, saveThresholds };
}
