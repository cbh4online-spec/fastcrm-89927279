import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useExecuteAction, type ExecuteActionParams } from '@/hooks/useActionExecution';
import { cn } from '@/lib/utils';

interface QuickActionButtonProps {
  actionType: string;
  title: string;
  label: string;
  description?: string;
  payload?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  sourceType?: string;
  sourceId?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onCompleted?: (result: any) => void;
  disabled?: boolean;
}

export function QuickActionButton({
  actionType,
  title,
  label,
  description,
  payload,
  entityType,
  entityId,
  sourceType = 'manual',
  sourceId,
  icon,
  variant = 'outline',
  size = 'sm',
  className,
  onCompleted,
  disabled,
}: QuickActionButtonProps) {
  const executeMutation = useExecuteAction();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    setStatus('loading');
    try {
      const params: ExecuteActionParams = {
        action_type: actionType,
        title,
        description,
        payload,
        source_type: sourceType,
        source_id: sourceId,
        entity_type: entityType,
        entity_id: entityId,
        execution_mode: 'manual',
        correlation_id: `${actionType}-${entityId || 'none'}-${Date.now()}`,
      };

      const result = await executeMutation.mutateAsync(params);
      setStatus('success');
      onCompleted?.(result);

      // Reset after 2s
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || status === 'loading'}
      className={cn(
        'gap-2 text-xs transition-all',
        status === 'success' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
        status === 'error' && 'bg-destructive/10 border-destructive/30 text-destructive',
        className,
      )}
    >
      {status === 'loading' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : status === 'error' ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        icon
      )}
      {status === 'success' ? `${label} ✓` : label}
    </Button>
  );
}
