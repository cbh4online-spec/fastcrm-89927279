import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Info, ChevronDown, ChevronUp, MousePointer2, MousePointerClick,
  Move, CheckCircle2, AlertTriangle, XCircle, Circle,
} from 'lucide-react';

const RELATION_TYPES = [
  { label: 'Depende de', color: 'bg-primary', dash: false },
  { label: 'Influencia', color: 'bg-chart-2', dash: true },
  { label: 'Bloqueia', color: 'bg-destructive', dash: false },
  { label: 'Alimenta', color: 'bg-chart-3', dash: false },
  { label: 'Utiliza', color: 'bg-chart-4', dash: false },
  { label: 'Publica para', color: 'bg-chart-5', dash: false },
];

const HEALTH_STATES = [
  { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completo', desc: 'Preenchido e actualizado' },
  { icon: AlertTriangle, color: 'text-amber-400', label: 'Envelhecendo', desc: 'Sem alterações há >14 dias' },
  { icon: XCircle, color: 'text-red-400', label: 'Desatualizado', desc: 'Sem alterações há >30 dias' },
  { icon: Circle, color: 'text-muted-foreground', label: 'Vazio', desc: 'Sem dados preenchidos' },
];

const INTERACTIONS = [
  { icon: MousePointer2, label: 'Clique', desc: 'Ver detalhes do bloco' },
  { icon: MousePointerClick, label: 'Duplo clique', desc: 'Simular propagação de impacto' },
  { icon: Move, label: 'Arrastar', desc: 'Reposicionar nós no mapa' },
];

export function ImpactMapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors',
        )}
      >
        <Info className="h-3.5 w-3.5" />
        Legenda
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-64 rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl p-4 space-y-4 animate-fade-in">
          {/* Relations */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tipos de Relação</p>
            <div className="space-y-1.5">
              {RELATION_TYPES.map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className="flex items-center w-6">
                    <div className={cn('h-0.5 w-full rounded', r.color, r.dash && 'border-t border-dashed border-current bg-transparent')} />
                  </div>
                  <span className="text-[11px] text-foreground">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Health */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estado de Saúde</p>
            <div className="space-y-1.5">
              {HEALTH_STATES.map(h => (
                <div key={h.label} className="flex items-center gap-2">
                  <h.icon className={cn('h-3 w-3 shrink-0', h.color)} />
                  <span className="text-[11px] text-foreground">{h.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactions */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interacções</p>
            <div className="space-y-1.5">
              {INTERACTIONS.map(i => (
                <div key={i.label} className="flex items-center gap-2">
                  <i.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-[11px] text-foreground font-medium">{i.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{i.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
