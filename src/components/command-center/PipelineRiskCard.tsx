import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function PipelineRiskCard({ delay = 0 }: { delay?: number }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const workspaceId = currentWorkspace?.id;

  const { data: riskDeals, isLoading } = useQuery({
    queryKey: ['pipeline-risk-deals', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Use deal_intelligence_cache — same source as ask-fastcrm deals_at_risk
      const { data: cache } = await supabase
        .from("deal_intelligence_cache")
        .select("deal_id, payload")
        .eq("workspace_id", workspaceId)
        .is("invalidated_at", null)
        .gt("expires_at", new Date().toISOString());

      const atRisk = (cache || []).filter(
        (c: any) => c.payload?.health_label === "AT_RISK"
      );

      if (atRisk.length === 0) return [];

      const dealIds = atRisk.map((r: any) => r.deal_id).slice(0, 4);
      const { data: deals } = await supabase
        .from("opportunities")
        .select("id, title, value")
        .in("id", dealIds)
        .eq("workspace_id", workspaceId);

      const dealMap = new Map((deals || []).map((d: any) => [d.id, d]));

      return atRisk
        .map((r: any) => {
          const deal = dealMap.get(r.deal_id);
          if (!deal) return null;
          return {
            id: deal.id,
            title: deal.title || "Deal sem nome",
            reason: r.payload?.top_reason || "Em risco",
            value: Number(deal.value) || 0,
            score: r.payload?.health_score ?? 0,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.score - b.score)
        .slice(0, 4);
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
      </motion.div>
    );
  }

  if (!riskDeals || riskDeals.length === 0) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-foreground">Pipeline em Risco</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem deals em risco 🚀</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm text-foreground">Pipeline em Risco</h3>
        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
          {riskDeals.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {riskDeals.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{d.reason} · €{d.value.toLocaleString("pt-PT")}</p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/opportunities?deal=${d.id}`)}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
              Agir <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
