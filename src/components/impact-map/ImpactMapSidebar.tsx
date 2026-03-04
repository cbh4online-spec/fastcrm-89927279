import { X, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextDriftBadge } from '@/components/context-os/ContextDriftBadge';
import { cn } from '@/lib/utils';
import type { ImpactMapBlock, DriftEntry, ImpactResult } from '@/hooks/useImpactMapData';

interface Props {
  block: ImpactMapBlock;
  drift: DriftEntry | undefined;
  impactResults: ImpactResult[];
  isSimulating: boolean;
  onSimulate: () => void;
  onClose: () => void;
  onNavigate: () => void;
}

export function ImpactMapSidebar({ block, drift, impactResults, isSimulating, onSimulate, onClose, onNavigate }: Props) {
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tipo</span>
            <span className="text-foreground capitalize">{block.block_type.replace('_', ' ')}</span>
          </div>
          {block.context_score != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Context Score</span>
              <span className="text-foreground">{block.context_score}%</span>
            </div>
          )}
          {drift && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Drift</span>
              <ContextDriftBadge severity={drift.severity} score={drift.drift_score} staleDays={drift.stale_days} compact />
            </div>
          )}
        </div>

        {/* Simulate Button */}
        <Button
          onClick={onSimulate}
          disabled={isSimulating}
          className="w-full gap-2"
          variant="outline"
          size="sm"
        >
          <Zap className={cn('h-3.5 w-3.5', isSimulating && 'animate-spin')} />
          {isSimulating ? 'A simular...' : 'Simular Impacto'}
        </Button>

        {/* Impact Results */}
        {impactResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Blocos afetados ({impactResults.length})
            </h4>
            <div className="space-y-1.5">
              {impactResults.map((r) => (
                <div key={r.block_id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.title || r.block_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">Profundidade: {r.depth}</p>
                  </div>
                  <span className="text-xs font-bold text-red-400 shrink-0 ml-2">{r.impact_score}%</span>
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
