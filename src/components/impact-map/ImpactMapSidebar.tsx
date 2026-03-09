import { X, Zap, ArrowRight, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextDriftBadge } from '@/components/context-os/ContextDriftBadge';
import { cn } from '@/lib/utils';
import type { ImpactMapBlock, ImpactMapDep, DriftEntry, ImpactResult } from '@/hooks/useImpactMapData';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const HEALTH_LABELS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  filled: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completo' },
  aging: { icon: AlertTriangle, color: 'text-amber-400', label: 'Envelhecendo' },
  stale: { icon: XCircle, color: 'text-red-400', label: 'Desatualizado' },
  empty: { icon: Circle, color: 'text-muted-foreground', label: 'Vazio' },
};

interface Props {
  block: ImpactMapBlock;
  drift: DriftEntry | undefined;
  healthState?: 'filled' | 'aging' | 'stale' | 'empty';
  fillPercent?: number;
  impactResults: ImpactResult[];
  dependencies: ImpactMapDep[];
  blocks: ImpactMapBlock[];
  isSimulating: boolean;
  onSimulate: () => void;
  onClose: () => void;
  onNavigate: () => void;
}

export function ImpactMapSidebar({ block, drift, healthState, fillPercent, impactResults, dependencies, blocks, isSimulating, onSimulate, onClose, onNavigate }: Props) {
  const healthCfg = healthState ? HEALTH_LABELS[healthState] : null;
  const HealthIcon = healthCfg?.icon;

  // Find dependencies for this block (as source and target)
  const outgoing = dependencies.filter(d => d.source_block_id === block.id);
  const incoming = dependencies.filter(d => d.target_block_id === block.id);

  const getBlockTitle = (id: string) => blocks.find(b => b.id === id)?.title ?? id.slice(0, 8) + '…';

  const lastUpdate = block.last_changed_at || block.updated_at;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur-sm border-l border-border/50 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground truncate">{block.title}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Health Status */}
        <div className="rounded-lg border border-border/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            {healthCfg && HealthIcon && (
              <div className="flex items-center gap-1.5">
                <HealthIcon className={cn('h-3.5 w-3.5', healthCfg.color)} />
                <span className={cn('text-xs font-semibold', healthCfg.color)}>{healthCfg.label}</span>
              </div>
            )}
          </div>
          {fillPercent != null && (
            <>
              <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    fillPercent >= 70 ? 'bg-emerald-500' : fillPercent >= 30 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${Math.min(fillPercent, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{fillPercent}% preenchido</p>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tipo</span>
            <span className="text-foreground capitalize">{block.block_type.replace('_', ' ')}</span>
          </div>
          {block.status && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="text-foreground capitalize">{block.status}</span>
            </div>
          )}
          {lastUpdate && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Última alteração</span>
              <span className="text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: pt })}
              </span>
            </div>
          )}
          {drift && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Drift</span>
              <ContextDriftBadge severity={drift.severity} score={drift.drift_score} staleDays={drift.stale_days} compact />
            </div>
          )}
        </div>

        {/* Dependencies */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dependências ({outgoing.length + incoming.length})
            </h4>
            {outgoing.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Influencia
                </p>
                {outgoing.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 text-xs">
                    <span className="text-foreground truncate">{getBlockTitle(dep.target_block_id)}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{dep.strength}%</span>
                  </div>
                ))}
              </div>
            )}
            {incoming.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Depende de
                </p>
                {incoming.map(dep => (
                  <div key={dep.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 text-xs">
                    <span className="text-foreground truncate">{getBlockTitle(dep.source_block_id)}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{dep.strength}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Simulate Button */}
        <Button
          onClick={onSimulate}
          disabled={isSimulating}
          className="w-full gap-2"
          variant="outline"
          size="sm"
        >
          <Zap className={cn('h-3.5 w-3.5', isSimulating && 'animate-spin')} />
          {isSimulating ? 'A simular...' : 'Simular Impacto (Bidirecional)'}
        </Button>

        {/* Impact Results */}
        {impactResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Blocos afetados ({impactResults.length})
            </h4>
            <div className="space-y-1.5">
              {impactResults.map((r) => (
                <div key={r.block_id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.title || r.block_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      Profundidade: {r.depth}
                      {r.direction && (
                        <span className="text-muted-foreground">· {r.direction === 'upstream' ? '↑' : '↓'}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-destructive shrink-0 ml-2">{r.impact_score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigate */}
        <Button onClick={onNavigate} variant="ghost" size="sm" className="w-full gap-2 text-xs">
          Abrir no Context OS <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
