import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, MessageSquare, Clock, ArrowDown, Zap } from 'lucide-react';
import { type SequenceStep } from '@/hooks/useEmailSequences';

interface SequenceFlowViewProps {
  steps: SequenceStep[];
  exitConditions?: { type: string; label?: string }[];
}

export function SequenceFlowView({ steps, exitConditions = [] }: SequenceFlowViewProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Sem etapas para visualizar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-4">
      {/* Start node */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Início da Sequência</span>
      </div>

      {steps.map((step, idx) => (
        <div key={step.id} className="flex flex-col items-center">
          {/* Delay connector */}
          {idx > 0 && (
            <div className="flex flex-col items-center py-1">
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-dashed">
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] text-muted-foreground">
                  {step.delayDays > 0 ? `${step.delayDays}d` : ''}
                  {step.delayDays > 0 && step.delayHours > 0 ? ' ' : ''}
                  {step.delayHours > 0 ? `${step.delayHours}h` : ''}
                  {step.delayDays === 0 && step.delayHours === 0 ? 'Imediato' : ''}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
            </div>
          )}
          {idx === 0 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-4 bg-border" />
              <ArrowDown className="h-3 w-3 text-muted-foreground" />
            </div>
          )}

          {/* Step node */}
          <Card className={`w-72 border-2 transition-all ${!step.isActive ? 'opacity-40 border-dashed' : 'border-primary/20 hover:border-primary/40'}`}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${step.channel === 'email' ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
                    {step.channel === 'email' ? (
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[10px]">
                      Etapa {step.stepOrder}
                    </Badge>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {step.channel === 'email' ? 'Email' : 'WhatsApp'}
                </Badge>
              </div>

              {step.templateName && (
                <p className="text-xs text-muted-foreground truncate">
                  📄 {step.templateName}
                </p>
              )}
              {step.subject && (
                <p className="text-xs font-medium truncate">
                  ✉️ {step.subject}
                </p>
              )}
              {step.body && !step.templateName && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {step.body}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* End node */}
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-border" />
        <ArrowDown className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border">
        <span className="text-xs font-medium text-muted-foreground">Fim da Sequência</span>
      </div>

      {/* Exit conditions */}
      {exitConditions.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Condições de Saída</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {exitConditions.map((cond, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {cond.label || cond.type}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
