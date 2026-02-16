import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface VerticalKPI {
  slug: string;
  views: number;
  submissions: number;
  conversionRate: number;
}

export function useAllVerticalKPIs() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["vertical_landing_kpis", currentWorkspace?.id],
    queryFn: async (): Promise<Record<string, VerticalKPI>> => {
      if (!currentWorkspace?.id) return {};

      const { data, error } = await (supabase as any)
        .from("vertical_landing_events")
        .select("template_slug, event_type")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      const kpis: Record<string, VerticalKPI> = {};

      for (const row of data || []) {
        const slug = row.template_slug;
        if (!kpis[slug]) {
          kpis[slug] = { slug, views: 0, submissions: 0, conversionRate: 0 };
        }
        if (row.event_type === "view") kpis[slug].views++;
        else if (row.event_type === "form_submit") kpis[slug].submissions++;
      }

      // Calculate conversion rates
      for (const k of Object.values(kpis)) {
        k.conversionRate = k.views > 0 ? (k.submissions / k.views) * 100 : 0;
      }

      return kpis;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000, // 1 min
  });
}
