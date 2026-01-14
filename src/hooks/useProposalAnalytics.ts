import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ProposalAnalyticsSummary {
  totalViews: number;
  totalCheckouts: number;
  totalPayments: number;
  conversionRate: number;
  revenueTotal: number;
  byTemplate: {
    templateId: string | null;
    templateName: string;
    views: number;
    payments: number;
    conversionRate: number;
    revenue: number;
  }[];
}

export function useProposalAnalytics(dateRange?: { start: Date; end: Date }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["proposal-analytics", currentWorkspace?.id, dateRange],
    queryFn: async (): Promise<ProposalAnalyticsSummary> => {
      if (!currentWorkspace?.id) {
        return {
          totalViews: 0,
          totalCheckouts: 0,
          totalPayments: 0,
          conversionRate: 0,
          revenueTotal: 0,
          byTemplate: [],
        };
      }

      // Get all analytics events
      let query = supabase
        .from("proposal_analytics")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data: analytics } = await query;

      // Get templates for names
      const { data: templates } = await supabase
        .from("proposal_templates")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id);

      const templateMap = new Map(templates?.map(t => [t.id, t.name]) || []);

      // Calculate totals
      const views = analytics?.filter(a => a.event_type === "view").length || 0;
      const checkouts = analytics?.filter(a => a.event_type === "checkout_started").length || 0;
      const payments = analytics?.filter(a => a.event_type === "payment_completed") || [];
      
      const revenueTotal = payments.reduce((sum, p) => {
        const amount = (p.metadata as { amount?: number })?.amount || 0;
        return sum + amount / 100; // Convert from cents
      }, 0);

      // Group by template
      const templateStats = new Map<string | null, {
        views: number;
        payments: number;
        revenue: number;
      }>();

      analytics?.forEach(a => {
        const key = a.template_id;
        if (!templateStats.has(key)) {
          templateStats.set(key, { views: 0, payments: 0, revenue: 0 });
        }
        const stats = templateStats.get(key)!;
        
        if (a.event_type === "view") {
          stats.views++;
        } else if (a.event_type === "payment_completed") {
          stats.payments++;
          const amount = (a.metadata as { amount?: number })?.amount || 0;
          stats.revenue += amount / 100;
        }
      });

      const byTemplate = Array.from(templateStats.entries()).map(([templateId, stats]) => ({
        templateId,
        templateName: templateId ? templateMap.get(templateId) || "Modelo Desconhecido" : "Sem Modelo",
        views: stats.views,
        payments: stats.payments,
        conversionRate: stats.views > 0 ? (stats.payments / stats.views) * 100 : 0,
        revenue: stats.revenue,
      }));

      return {
        totalViews: views,
        totalCheckouts: checkouts,
        totalPayments: payments.length,
        conversionRate: views > 0 ? (payments.length / views) * 100 : 0,
        revenueTotal,
        byTemplate,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}
