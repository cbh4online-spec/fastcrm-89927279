import { useKernelActions } from "@/hooks/useKernelActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2, Zap, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  success: { icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />, label: "Sucesso" },
  failed: { icon: <XCircle className="h-3.5 w-3.5 text-destructive" />, label: "Falhou" },
  running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />, label: "A correr" },
  queued: { icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" />, label: "Na fila" },
};

export function KernelActionsCard({ delay = 0 }: { delay?: number }) {
  const { todayRuns, isLoading } = useKernelActions();

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </motion.div>
    );
  }

  if (!todayRuns.length) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Ações do Dia</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem ações executadas hoje ⚡</p>
      </motion.div>
    );
  }

  const successCount = todayRuns.filter(r => r.status === "success").length;
  const failedCount = todayRuns.filter(r => r.status === "failed").length;

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Ações do Dia</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {todayRuns.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {successCount > 0 && <span className="text-emerald-500">✓ {successCount}</span>}
          {failedCount > 0 && <span className="text-destructive">✗ {failedCount}</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        {todayRuns.slice(0, 5).map((run) => {
          const config = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.queued;
          return (
            <div
              key={run.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
                run.status === "failed" && "border-l-2 border-l-destructive"
              )}
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{run.action_key}</p>
                {run.error && (
                  <p className="text-[10px] text-destructive truncate">{run.error}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: pt })}
              </span>
              {run.status === "failed" && (
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" title="Retry">
                  <RotateCcw className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {todayRuns.length > 5 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          +{todayRuns.length - 5} mais ações hoje
        </p>
      )}
    </motion.div>
  );
}
