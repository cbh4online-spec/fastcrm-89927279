import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function PipelineRiskCard({ delay = 0 }: { delay?: number }) {
  const { decisions, isLoading } = useKernelDecisions();
  const navigate = useNavigate();

  const riskDecisions = (decisions ?? []).filter((d) => {
    const actions = d.recommended_actions as any;
    return d.status === "open" && d.type === "pipeline_risk";
  }).slice(0, 4);

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

  if (riskDecisions.length === 0) {
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
          {riskDecisions.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {riskDecisions.map((d) => {
          return (
            <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{d.summary}</p>
                <p className="text-[10px] text-muted-foreground truncate">{d.rationale}</p>
              </div>
              <button
                onClick={() => navigate("/dashboard/opportunities")}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
              >
                Agir <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
