import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
  Brain, Target, Package, Users, TrendingUp, Banknote,
  ListChecks, Cog, Zap, CheckCircle2, AlertTriangle, XCircle, Circle,
} from 'lucide-react';
import { ContextDriftBadge } from '@/components/context-os/ContextDriftBadge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

const BLOCK_TYPE_CONFIG: Record<string, { icon: typeof Brain; color: string; bg: string; border: string; label: string }> = {
  strategy:      { icon: Brain,       color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30', label: 'Estratégia' },
  business_model:{ icon: TrendingUp,  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',   label: 'Modelo de Negócio' },
  offers:        { icon: Package,     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',  label: 'Ofertas' },
  team:          { icon: Users,       color: 'text-emerald-400', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30', label: 'Equipa' },
  goals:         { icon: Target,      color: 'text-rose-400',    bg: 'bg-rose-500/10',     border: 'border-rose-500/30',   label: 'Metas' },
  financial:     { icon: Banknote,    color: 'text-cyan-400',    bg: 'bg-cyan-500/10',     border: 'border-cyan-500/30',   label: 'Financeiro' },
  priorities:    { icon: ListChecks,  color: 'text-orange-400',  bg: 'bg-orange-500/10',   border: 'border-orange-500/30', label: 'Prioridades' },
  processes:     { icon: Cog,         color: 'text-slate-400',   bg: 'bg-slate-500/10',    border: 'border-slate-500/30',  label: 'Processos' },
};

const DEFAULT_CONFIG = { icon: Zap, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', label: 'Outro' };

const HEALTH_STATE_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  filled: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completo' },
  aging: { icon: AlertTriangle, color: 'text-amber-400', label: 'Envelhecendo' },
  stale: { icon: XCircle, color: 'text-red-400', label: 'Desatualizado' },
  empty: { icon: Circle, color: 'text-muted-foreground', label: 'Vazio' },
};

export interface ImpactMapNodeData {
  label: string;
  blockType: string;
  contextScore?: number;
  fillPercent?: number;
  healthState?: 'filled' | 'aging' | 'stale' | 'empty';
  driftSeverity?: string;
  driftScore?: number;
  staleDays?: number;
  isImpacted?: boolean;
  isSource?: boolean;
  isStale?: boolean;
  impactDirection?: string;
  dependencyCount?: number;
  onSimulate: (id: string) => void;
  onSelect: (id: string) => void;
  [key: string]: unknown;
}

function ImpactMapNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as ImpactMapNodeData;
  const cfg = BLOCK_TYPE_CONFIG[d.blockType] || DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const healthCfg = d.healthState ? HEALTH_STATE_CONFIG[d.healthState] : null;
  const HealthIcon = healthCfg?.icon;

  const tooltipLines = [
    d.fillPercent != null && `Preenchimento: ${d.fillPercent}%`,
    d.staleDays != null && d.staleDays < 999 && `Última alteração: há ${d.staleDays} dias`,
    d.dependencyCount != null && `${d.dependencyCount} dependência${d.dependencyCount !== 1 ? 's' : ''}`,
    d.driftScore != null && `Drift: ${d.driftScore}%`,
  ].filter(Boolean);

  const nodeContent = (
    <div
      className={cn(
        'relative rounded-xl border px-4 py-3 min-w-[220px] max-w-[260px] cursor-pointer transition-all duration-300',
        cfg.bg, cfg.border,
        d.isSource && 'ring-2 ring-primary shadow-lg shadow-primary/20',
        d.isImpacted && !d.isSource && 'ring-2 ring-destructive shadow-lg shadow-destructive/30 animate-pulse',
        d.isStale && !d.isImpacted && 'ring-2 ring-chart-4 shadow-lg shadow-chart-4/20',
        !d.isImpacted && !d.isSource && !d.isStale && 'hover:shadow-md hover:scale-[1.02]',
      )}
      onClick={() => d.onSelect(id)}
      onDoubleClick={() => d.onSimulate(id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/50 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/50 !w-2 !h-2" />

      <div className="flex items-start gap-2.5">
        <div className={cn('mt-0.5 p-1.5 rounded-lg', cfg.bg)}>
          <Icon className={cn('h-4 w-4', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{d.label}</p>
          <p className={cn('text-[11px] mt-0.5', cfg.color)}>{cfg.label}</p>
        </div>
      </div>

      {/* Health badge & fill bar */}
      <div className="mt-2.5 space-y-2">
        {d.fillPercent != null && (
          <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                d.fillPercent >= 70 ? 'bg-emerald-500' : d.fillPercent >= 30 ? 'bg-amber-500' : 'bg-red-500',
              )}
              style={{ width: `${Math.min(d.fillPercent, 100)}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          {healthCfg && HealthIcon && (
            <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md', cfg.bg)}>
              <HealthIcon className={cn('h-3 w-3', healthCfg.color)} />
              <span className={cn('text-[10px] font-semibold', healthCfg.color)}>{healthCfg.label}</span>
            </div>
          )}
          {d.driftSeverity && (
            <ContextDriftBadge severity={d.driftSeverity} score={d.driftScore} compact className="ml-auto" />
          )}
        </div>

        {d.dependencyCount != null && d.dependencyCount > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {d.dependencyCount} dependência{d.dependencyCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );

  if (tooltipLines.length === 0) return nodeContent;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs space-y-0.5 max-w-[200px]">
          {tooltipLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ImpactMapNode = memo(ImpactMapNodeComponent);
