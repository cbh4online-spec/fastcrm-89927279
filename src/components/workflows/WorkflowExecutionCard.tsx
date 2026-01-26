/**
 * Workflow Execution Card Component
 */

import { formatDistanceToNow, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { 
  ChevronRight, 
  Clock, 
  RefreshCw, 
  XCircle,
  User,
  Target,
} from 'lucide-react';
import type { WorkflowExecutionSummary } from '@/hooks/useWorkflowExecutions';

interface WorkflowExecutionCardProps {
  execution: WorkflowExecutionSummary;
  onViewDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

// Map workflow codes to display names
const workflowDisplayNames: Record<string, string> = {
  lead_qualification: 'Qualificação de Lead',
  lead_followup: 'Follow-up de Lead',
  opportunity_nurture: 'Nutrição de Oportunidade',
  client_onboarding: 'Onboarding de Cliente',
  deal_closing: 'Fecho de Negócio',
  renewal_reminder: 'Lembrete de Renovação',
};

export function WorkflowExecutionCard({
  execution,
  onViewDetails,
  onCancel,
  onRetry,
}: WorkflowExecutionCardProps) {
  const displayName = workflowDisplayNames[execution.workflow_code] || execution.workflow_code;
  const isActive = ['pending', 'queued', 'running'].includes(execution.status);
  const canRetry = ['failed', 'partial'].includes(execution.status);

  const formattedDate = execution.created_at
    ? formatDistanceToNow(new Date(execution.created_at), { addSuffix: true, locale: pt })
    : '';

  const duration = execution.total_duration_ms
    ? `${(execution.total_duration_ms / 1000).toFixed(1)}s`
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{displayName}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formattedDate}</span>
              {duration && (
                <>
                  <span>•</span>
                  <span>{duration}</span>
                </>
              )}
            </div>
          </div>
          <WorkflowStatusBadge status={execution.status} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="flex flex-col gap-3">
          {/* Entity info */}
          {execution.entity_type && execution.entity_id && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span className="capitalize">{execution.entity_type}</span>
              <span className="font-mono text-xs">{execution.entity_id.slice(0, 8)}</span>
            </div>
          )}

          {/* Trigger info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>
              {execution.trigger_type === 'manual' ? 'Manual' : 
               execution.trigger_type === 'recommendation_accepted' ? 'Recomendação aceite' :
               execution.trigger_type === 'scheduled' ? 'Agendado' :
               execution.trigger_type}
            </span>
          </div>

          {/* Error message */}
          {execution.error_message && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {execution.error_message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              {isActive && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(execution.id)}
                  className="h-7 text-xs"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              )}
              {canRetry && onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(execution.id)}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Repetir
                </Button>
              )}
            </div>
            
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(execution.id)}
                className="h-7 text-xs"
              >
                Ver Detalhes
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
