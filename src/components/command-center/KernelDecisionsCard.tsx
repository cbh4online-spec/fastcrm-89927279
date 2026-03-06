import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, X, ChevronRight, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function urgencyBorder(policy: any): string {
  const mode = policy?.mode;
  if (mode === "approve") return "border-l-red-500";
  if (mode === "suggest") return "border-l-amber-500";
  return "border-l-blue-500";
}

export function KernelDecisionsCard({ delay = 0 }: { delay?: number }) {
  const { openDecisions, isLoading, acceptDecision, rejectDecision, executeDecision } = useKernelDecisions();
  const visible = openDecisions.slice(0, 3);

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </motion.div>
    );
  }

  if (visible.length === 0) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Decisões Kernel</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem decisões pendentes ✨</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Decisões Kernel</h3>
          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
            {openDecisions.length}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {visible.map((d) => (
          <div
            key={d.id}
            className={cn(
              "flex items-center justify-between gap-2 p-2 rounded-lg border-l-2 bg-muted/30 hover:bg-muted/50 transition-colors",
              urgencyBorder(d.policy)
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{d.summary}</p>
              <p className="text-[10px] text-muted-foreground truncate">{d.rationale}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => acceptDecision.mutate(d.id)}
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => rejectDecision.mutate(d.id)}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {openDecisions.length > 3 && (
        <button className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
          Ver todas ({openDecisions.length}) <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
