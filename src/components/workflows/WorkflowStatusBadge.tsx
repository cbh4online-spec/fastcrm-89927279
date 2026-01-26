/**
 * Workflow Execution Status Badge Component
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Ban,
} from 'lucide-react';

type WorkflowStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'partial' | 'cancelled' | 'skipped';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<WorkflowStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ElementType;
  className: string;
}> = {
  pending: {
    label: 'Pendente',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  queued: {
    label: 'Na Fila',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  running: {
    label: 'A Executar',
    variant: 'default',
    icon: Loader2,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  completed: {
    label: 'Concluído',
    variant: 'default',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  failed: {
    label: 'Falhou',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  partial: {
    label: 'Parcial',
    variant: 'outline',
    icon: AlertCircle,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'secondary',
    icon: Ban,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  skipped: {
    label: 'Ignorado',
    variant: 'outline',
    icon: Ban,
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500',
  },
};

export function WorkflowStatusBadge({ status, className, showIcon = true }: WorkflowStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const isAnimated = status === 'running';

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1.5 font-medium',
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn('h-3 w-3', isAnimated && 'animate-spin')} />
      )}
      {config.label}
    </Badge>
  );
}

export function WorkflowStepStatusIcon({ status, className }: { status: WorkflowStatus; className?: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const isAnimated = status === 'running';

  const colorClass = {
    pending: 'text-muted-foreground',
    queued: 'text-blue-500',
    running: 'text-amber-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    partial: 'text-orange-500',
    cancelled: 'text-gray-500',
    skipped: 'text-gray-400',
  }[status];

  return (
    <Icon className={cn('h-4 w-4', colorClass, isAnimated && 'animate-spin', className)} />
  );
}
