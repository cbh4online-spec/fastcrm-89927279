import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Pause,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { useUpdateEnrollment, useRemoveEnrollment, type SequenceEnrollment } from '@/hooks/useEmailSequences';
import { EnrollmentTimeline } from './EnrollmentTimeline';

interface EnrollmentCardProps {
  enrollment: SequenceEnrollment & { contactName?: string; contactEmail?: string };
  totalSteps: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  active: { label: 'Ativo', variant: 'default', color: 'text-emerald-500' },
  paused: { label: 'Pausado', variant: 'outline', color: 'text-amber-500' },
  completed: { label: 'Concluído', variant: 'secondary', color: 'text-blue-500' },
  exited: { label: 'Saiu', variant: 'outline', color: 'text-muted-foreground' },
};

export function EnrollmentCard({ enrollment, totalSteps }: EnrollmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const updateEnrollment = useUpdateEnrollment();
  const removeEnrollment = useRemoveEnrollment();

  const config = statusConfig[enrollment.status] || statusConfig.active;
  const progress = totalSteps > 0 ? (enrollment.currentStep / totalSteps) * 100 : 0;

  const handlePause = () => {
    updateEnrollment.mutate({
      id: enrollment.id,
      sequenceId: enrollment.sequenceId,
      status: 'paused',
    });
  };

  const handleResume = () => {
    updateEnrollment.mutate({
      id: enrollment.id,
      sequenceId: enrollment.sequenceId,
      status: 'active',
    });
  };

  const handleRemove = () => {
    removeEnrollment.mutate({
      id: enrollment.id,
      sequenceId: enrollment.sequenceId,
    });
  };

  return (
    <Card className="border transition-all">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {enrollment.contactName || enrollment.contactId.slice(0, 8) + '...'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {enrollment.contactEmail || `Inscrito ${new Date(enrollment.enrolledAt).toLocaleDateString('pt-PT')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant={config.variant} className="text-[10px]">
              {config.label}
            </Badge>

            {enrollment.status === 'active' && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePause} title="Pausar">
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}
            {enrollment.status === 'paused' && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResume} title="Retomar">
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleRemove} title="Remover">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {enrollment.currentStep}/{totalSteps} etapas
          </span>
        </div>

        {enrollment.nextSendAt && enrollment.status === 'active' && (
          <p className="text-[10px] text-muted-foreground">
            📬 Próximo envio: {new Date(enrollment.nextSendAt).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {expanded && (
          <div className="pt-2 border-t">
            <EnrollmentTimeline enrollmentId={enrollment.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
