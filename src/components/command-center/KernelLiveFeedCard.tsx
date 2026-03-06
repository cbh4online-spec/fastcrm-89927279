import { useChangeEvents } from "@/hooks/useChangeEvents";
import { useKernelEntities } from "@/hooks/useKernelEntities";
import { useImpactMapData } from "@/hooks/useImpactMapData";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, GitCommit, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo } from "react";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLegibleName(value: string | null | undefined): boolean {
  if (!value) return false;
  return !UUID_REGEX.test(value.trim());
}

const THROTTLE_MS = 5000;

export function KernelLiveFeedCard({ delay = 0 }: { delay?: number }) {
  const { changeEvents, isLoading: eventsLoading } = useChangeEvents(5);
  const { entities, isLoading: entitiesLoading } = useKernelEntities();
  const { impactResults, isLoading: impactLoading } = useImpactMapData();
  const [timedOut, setTimedOut] = useState(false);

  // Throttle: buffer data and only update displayed data every 5s
  const [displayedEvents, setDisplayedEvents] = useState(changeEvents);
  const [displayedEntities, setDisplayedEntities] = useState(entities);
  const [displayedImpact, setDisplayedImpact] = useState(impactResults);
  const lastUpdateRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setDisplayedEvents(changeEvents);
      setDisplayedEntities(entities);
      setDisplayedImpact(impactResults);
    } else if (!pendingRef.current) {
      pendingRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setDisplayedEvents(changeEvents);
        setDisplayedEntities(entities);
        setDisplayedImpact(impactResults);
        pendingRef.current = null;
      }, THROTTLE_MS - elapsed);
    }

    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, [changeEvents, entities, impactResults]);

  const isLoading = eventsLoading || entitiesLoading;

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && !timedOut) {
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

  const recentEvents = (displayedEvents?.slice(0, 5) ?? []).filter(
    (ev) => isLegibleName(ev.change_type) || isLegibleName(ev.entity_kind)
  );
  const topEntities = (displayedEntities?.slice(0, 3) ?? []).filter(
    (ent) => isLegibleName(ent.title)
  );
  const topImpact = (displayedImpact?.slice(0, 2) ?? []).filter(
    (imp) => isLegibleName(imp.title)
  );

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
                  {ev.entity_kind && isLegibleName(ev.entity_kind) && (
                    <span className="text-muted-foreground"> · {ev.entity_kind}</span>
                  )}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: pt })}
              </span>
            </div>
          ))}
        </div>
      )}

      {topEntities.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Target className="h-3 w-3" /> Entidades Ativas
          </p>
          {topEntities.map((ent) => (
            <div key={ent.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
              <span className="text-[11px] text-foreground truncate">{ent.title}</span>
              <span className="text-[10px] text-muted-foreground">{ent.kind}</span>
            </div>
          ))}
        </div>
      )}

      {topImpact.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Impacto
          </p>
          {topImpact.map((imp) => (
            <div key={imp.block_id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20">
              <span className="text-[11px] text-foreground truncate">{imp.title}</span>
              <span className="text-[10px] font-medium text-primary">{imp.impact_score}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
