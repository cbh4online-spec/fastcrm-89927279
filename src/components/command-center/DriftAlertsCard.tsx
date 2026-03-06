import { useDriftScores } from "@/hooks/useDriftScores";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DriftAlertsCard({ delay = 0 }: { delay?: number }) {
  const { scores, workspaceScore, isLoading } = useDriftScores();

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </motion.div>
    );
  }

  const outdated = scores?.filter((s) => s.scope_type !== "workspace" && (s.score ?? 0) < 50) ?? [];

  if (outdated.length === 0) return null;

  const scoreColor = workspaceScore >= 70 ? "text-emerald-500" : workspaceScore >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Context Drift</h3>
        </div>
        <span className={cn("text-sm font-bold", scoreColor)}>{workspaceScore}%</span>
      </div>

      <Progress value={workspaceScore} className="h-1.5" />

      <div className="space-y-1">
        {outdated.slice(0, 4).map((s) => (
          <div key={s.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="truncate max-w-[140px]">{s.scope_type}</span>
            </div>
            <span className="text-foreground font-medium">{s.score ?? 0}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
