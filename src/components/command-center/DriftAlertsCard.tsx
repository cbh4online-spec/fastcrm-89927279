import { useCommandData } from "@/hooks/useCommandData";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function DriftAlertsCard({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const { data, isLoading } = useCommandData("drift overview", { staleTime: 120_000 });

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

  const items = data?.items || [];
  const workspaceScore = data?.metric?.value ? parseInt(data.metric.value) : 100;

  if (items.length === 0) return null;

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
        {items.slice(0, 4).map((s: any, i: number) => (
          <div key={s.id || i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="truncate max-w-[140px]">{s.title || s.subtitle || "Bloco"}</span>
            </div>
            <span className="text-foreground font-medium">{s.value ?? 0}%</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/dashboard/command-center?tab=context")}
        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        Ver Context OS <ChevronRight className="h-3 w-3" />
      </button>
    </motion.div>
  );
}
