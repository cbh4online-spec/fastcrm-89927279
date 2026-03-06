import { useChangeEvents } from "@/hooks/useChangeEvents";
import { useKernelEntities } from "@/hooks/useKernelEntities";
import { useImpactMapData } from "@/hooks/useImpactMapData";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, GitCommit, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function KernelLiveFeedCard({ delay = 0 }: { delay?: number }) {
  const { changeEvents, isLoading: eventsLoading } = useChangeEvents(5);
  const { entities, isLoading: entitiesLoading } = useKernelEntities();
  const { impactResults, isLoading: impactLoading } = useImpactMapData();

  const isLoading = eventsLoading || entitiesLoading;

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </motion.div>
    );
  }

  const recentEvents = changeEvents?.slice(0, 5) ?? [];
  const topEntities = entities?.slice(0, 3) ?? [];
  const topImpact = impactResults?.slice(0, 2) ?? [];

  const hasContent = recentEvents.length > 0 || topEntities.length > 0 || topImpact.length > 0;

  if (!hasContent) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Kernel Live Feed</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem atividade recente 📡</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Kernel Live Feed</h3>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>

      {/* Change Events */}
      {recentEvents.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <GitCommit className="h-3 w-3" /> Eventos Recentes
          </p>
          {recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
              <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground truncate">
                  <span className="font-medium">{ev.change_type}</span>
                  {ev.entity_kind && <span className="text-muted-foreground"> · {ev.entity_kind}</span>}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: pt })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top Entities */}
      {topEntities.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Target className="h-3 w-3" /> Entidades Ativas
          </p>
          {topEntities.map((ent) => (
            <div key={ent.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
              <span className="text-[11px] text-foreground truncate">{ent.title ?? ent.kind}</span>
              <span className="text-[10px] text-muted-foreground">{ent.kind}</span>
            </div>
          ))}
        </div>
      )}

      {/* Impact Scores */}
      {topImpact.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Impacto
          </p>
          {topImpact.map((imp) => (
            <div key={imp.block_id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
              <span className="text-[11px] text-foreground truncate">{imp.title ?? imp.block_id}</span>
              <span className="text-[10px] font-medium text-primary">{imp.impact_score}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
