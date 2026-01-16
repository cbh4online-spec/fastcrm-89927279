import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface TrialMetrics {
  total_trials_started: number;
  trials_at_50_percent: number;
  trials_at_90_percent: number;
  converted_to_paid: number;
  conversion_rate: number;
  avg_trial_usage_percent: number;
  avg_days_to_conversion: number;
  total_value_generated: number;
  time_saved_hours: number;
}

export interface ModuleMetrics {
  module_id: string;
  module_name: string;
  category: string;
  trials_started: number;
  conversions: number;
  conversion_rate: number;
  avg_usage_percent: number;
  revenue: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
}

export function useTrialConversionMetrics() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["trial-conversion-metrics", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      // Get all workspace modules with trial data
      const { data: modules, error: modulesError } = await supabase
        .from("workspace_modules")
        .select(`
          *,
          module:marketplace_modules(id, name, category, pricing)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (modulesError) throw modulesError;

      // Get trial logs
      const { data: logs, error: logsError } = await supabase
        .from("module_trial_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      // Get conversions
      const { data: conversions, error: conversionsError } = await supabase
        .from("module_conversions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (conversionsError) throw conversionsError;

      // Calculate metrics
      const trialsStarted = modules?.filter(m => m.trial_started_at) || [];
      const paid = modules?.filter(m => m.status === "active" && !m.trial_started_at) || [];
      const trialsToPaid = conversions?.length || 0;

      const totalUsagePercent = trialsStarted.reduce((acc, m) => {
        const limit = (m.module as any)?.trial_uses_limit || 1;
        return acc + (((m.trial_uses_consumed || 0) / limit) * 100);
      }, 0);

      const avgUsagePercent = trialsStarted.length > 0 
        ? Math.round(totalUsagePercent / trialsStarted.length) 
        : 0;

      const totalValueGenerated = modules?.reduce((acc, m) => {
        const value = m.value_generated as Record<string, number> | null;
        return acc + (value?.actions_completed || 0) * 0.5; // €0.50 per action estimate
      }, 0) || 0;

      const totalTimeSaved = modules?.reduce((acc, m) => {
        const value = m.value_generated as Record<string, number> | null;
        return acc + (value?.time_saved_hours || 0);
      }, 0) || 0;

      // Group by module
      const moduleMap = new Map<string, ModuleMetrics>();
      
      for (const m of modules || []) {
        const moduleData = m.module as any;
        if (!moduleData) continue;

        const existing = moduleMap.get(moduleData.id) || {
          module_id: moduleData.id,
          module_name: moduleData.name,
          category: moduleData.category,
          trials_started: 0,
          conversions: 0,
          conversion_rate: 0,
          avg_usage_percent: 0,
          revenue: 0,
        };

        if (m.trial_started_at) {
          existing.trials_started++;
        }

        const limit = moduleData.trial_uses_limit || 1;
        existing.avg_usage_percent = ((m.trial_uses_consumed || 0) / limit) * 100;

        moduleMap.set(moduleData.id, existing);
      }

      // Add conversions
      for (const c of conversions || []) {
        const existing = moduleMap.get(c.module_id);
        if (existing) {
          existing.conversions++;
          existing.revenue += c.price_paid || 0;
          existing.conversion_rate = (existing.conversions / Math.max(existing.trials_started, 1)) * 100;
        }
      }

      // Build funnel
      const at50 = trialsStarted.filter(m => {
        const limit = (m.module as any)?.trial_uses_limit || 1;
        return ((m.trial_uses_consumed || 0) / limit) >= 0.5;
      }).length;

      const at90 = trialsStarted.filter(m => {
        const limit = (m.module as any)?.trial_uses_limit || 1;
        return ((m.trial_uses_consumed || 0) / limit) >= 0.9;
      }).length;

      const funnel: ConversionFunnel[] = [
        { stage: "Trial Iniciado", count: trialsStarted.length, percentage: 100 },
        { stage: "50% Usado", count: at50, percentage: trialsStarted.length > 0 ? (at50 / trialsStarted.length) * 100 : 0 },
        { stage: "90% Usado", count: at90, percentage: trialsStarted.length > 0 ? (at90 / trialsStarted.length) * 100 : 0 },
        { stage: "Convertido", count: trialsToPaid, percentage: trialsStarted.length > 0 ? (trialsToPaid / trialsStarted.length) * 100 : 0 },
      ];

      return {
        overview: {
          total_trials_started: trialsStarted.length,
          trials_at_50_percent: at50,
          trials_at_90_percent: at90,
          converted_to_paid: trialsToPaid,
          conversion_rate: trialsStarted.length > 0 ? (trialsToPaid / trialsStarted.length) * 100 : 0,
          avg_trial_usage_percent: avgUsagePercent,
          avg_days_to_conversion: 5, // TODO: calculate from actual data
          total_value_generated: totalValueGenerated,
          time_saved_hours: totalTimeSaved,
        } as TrialMetrics,
        byModule: Array.from(moduleMap.values()),
        funnel,
        recentLogs: logs?.slice(0, 20) || [],
      };
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
