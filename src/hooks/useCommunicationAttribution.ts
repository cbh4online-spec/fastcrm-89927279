import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ── Types ──

export interface AttributionRecord {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  template_id: string | null;
  sequence_id: string | null;
  sequence_step_id: string | null;
  channel: string | null;
  conversion_type: string;
  conversion_id: string;
  conversion_value: number;
  currency: string;
  attribution_model: string;
  attribution_weight: number;
  touch_type: string;
  sent_at: string | null;
  conversion_at: string | null;
  created_at: string;
}

export interface AttributionSettings {
  id: string;
  workspace_id: string;
  default_model: string;
  attribution_window_days: number;
  allow_email_fallback: boolean;
  include_assists: boolean;
}

export interface RevenueAggregation {
  key: string;
  label?: string;
  revenue: number;
  conversions: number;
  avgValue: number;
}

// ── Settings ──

export function useAttributionSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["attribution-settings", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_attribution_settings" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AttributionSettings) || null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertAttributionSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (settings: Partial<AttributionSettings>) => {
      const { error } = await supabase
        .from("communication_attribution_settings" as any)
        .upsert(
          { workspace_id: workspaceId, ...settings },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribution-settings"] });
      toast.success("Configuração de atribuição guardada");
    },
    onError: () => toast.error("Erro ao guardar configuração"),
  });
}

// ── Revenue aggregation helpers ──

function useAttributionAggregation(
  groupByField: string,
  filters?: { conversionType?: string; dateFrom?: string; dateTo?: string }
) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["attribution-revenue", groupByField, workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("communication_attributions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);

      if (filters?.conversionType) {
        query = query.eq("conversion_type", filters.conversionType);
      }
      if (filters?.dateFrom) {
        query = query.gte("conversion_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("conversion_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []) as unknown as AttributionRecord[];

      // Group by field
      const groups = new Map<string, { revenue: number; conversions: Set<string> }>();
      for (const r of records) {
        const key = (r as any)[groupByField] || "unknown";
        if (!groups.has(key)) {
          groups.set(key, { revenue: 0, conversions: new Set() });
        }
        const g = groups.get(key)!;
        g.revenue += Number(r.conversion_value) || 0;
        g.conversions.add(r.conversion_id);
      }

      const result: RevenueAggregation[] = [];
      for (const [key, g] of groups) {
        const convCount = g.conversions.size;
        result.push({
          key,
          revenue: Math.round(g.revenue * 100) / 100,
          conversions: convCount,
          avgValue: convCount > 0 ? Math.round((g.revenue / convCount) * 100) / 100 : 0,
        });
      }

      return result.sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!workspaceId,
  });
}

export function useRevenueByTemplate(filters?: { conversionType?: string; dateFrom?: string; dateTo?: string }) {
  return useAttributionAggregation("template_id", filters);
}

export function useRevenueBySequence(filters?: { conversionType?: string; dateFrom?: string; dateTo?: string }) {
  return useAttributionAggregation("sequence_id", filters);
}

export function useRevenueByChannel(filters?: { conversionType?: string; dateFrom?: string; dateTo?: string }) {
  return useAttributionAggregation("channel", filters);
}

export function useRevenueByStep(sequenceId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["attribution-revenue-step", workspaceId, sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_attributions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("sequence_id", sequenceId!);
      if (error) throw error;

      const records = (data || []) as unknown as AttributionRecord[];
      const groups = new Map<string, { revenue: number; conversions: Set<string> }>();

      for (const r of records) {
        const key = r.sequence_step_id || "unknown";
        if (!groups.has(key)) groups.set(key, { revenue: 0, conversions: new Set() });
        const g = groups.get(key)!;
        g.revenue += Number(r.conversion_value) || 0;
        g.conversions.add(r.conversion_id);
      }

      const result: RevenueAggregation[] = [];
      for (const [key, g] of groups) {
        const c = g.conversions.size;
        result.push({
          key,
          revenue: Math.round(g.revenue * 100) / 100,
          conversions: c,
          avgValue: c > 0 ? Math.round((g.revenue / c) * 100) / 100 : 0,
        });
      }

      return result.sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!workspaceId && !!sequenceId,
  });
}

// ── Total stats ──

export function useAttributionStats(filters?: { conversionType?: string; dateFrom?: string; dateTo?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["attribution-stats", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("communication_attributions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);

      if (filters?.conversionType) {
        query = query.eq("conversion_type", filters.conversionType);
      }
      if (filters?.dateFrom) {
        query = query.gte("conversion_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("conversion_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []) as unknown as AttributionRecord[];

      let totalRevenue = 0;
      let assistedRevenue = 0;
      const conversionIds = new Set<string>();

      for (const r of records) {
        totalRevenue += Number(r.conversion_value) || 0;
        if (r.touch_type === "assist") {
          assistedRevenue += Number(r.conversion_value) || 0;
        }
        conversionIds.add(r.conversion_id);
      }

      const totalConversions = conversionIds.size;

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalConversions,
        avgOrderValue: totalConversions > 0 ? Math.round((totalRevenue / totalConversions) * 100) / 100 : 0,
        assistedRevenue: Math.round(assistedRevenue * 100) / 100,
        directRevenue: Math.round((totalRevenue - assistedRevenue) * 100) / 100,
      };
    },
    enabled: !!workspaceId,
  });
}
