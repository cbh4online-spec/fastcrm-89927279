import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertOctagon, Shield } from 'lucide-react';

interface Props {
  severity: string;
  score?: number;
  staleDays?: number;
  compact?: boolean;
  className?: string;
}

const config = {
  ok: { label: 'OK', icon: CheckCircle, bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  warn: { label: 'WARN', icon: AlertTriangle, bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  risk: { label: 'RISK', icon: AlertOctagon, bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  critical: { label: 'CRITICAL', icon: Shield, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
};

export function ContextDriftBadge({ severity, score, staleDays, compact, className }: Props) {
  const c = config[severity as keyof typeof config] ?? config.ok;
  const Icon = c.icon;

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border', c.bg, c.text, c.border, className)}>
        <Icon className="h-3 w-3" />
        {c.label}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium', c.bg, c.text, c.border, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{c.label}</span>
      {score != null && <span className="opacity-70">({score})</span>}
      {staleDays != null && staleDays > 0 && (
        <span className="opacity-60">· {staleDays}d</span>
      )}
    </div>
  );
}
