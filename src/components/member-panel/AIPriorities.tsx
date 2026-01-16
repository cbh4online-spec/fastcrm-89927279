import { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  X, 
  Phone, 
  MessageSquare, 
  Calendar,
  Target,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PriorityAction } from '@/hooks/useMemberPanel';

interface AIPrioritiesProps {
  priorities: PriorityAction[];
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  onIgnore: (id: string) => void;
  isLoading?: boolean;
}

const typeIcons: Record<string, typeof Phone> = {
  follow_up: Phone,
  meeting_prep: Calendar,
  message: MessageSquare,
  call: Phone,
  close_deal: Target,
  task: CheckCircle2,
};

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500 bg-red-500/5',
  medium: 'border-l-amber-500 bg-amber-500/5',
  low: 'border-l-blue-500 bg-blue-500/5',
};

const priorityBadge: Record<string, { variant: 'destructive' | 'secondary' | 'outline'; label: string }> = {
  high: { variant: 'destructive', label: 'Urgente' },
  medium: { variant: 'secondary', label: 'Importante' },
  low: { variant: 'outline', label: 'Normal' },
};

export function AIPriorities({
  priorities,
  onComplete,
  onDefer,
  onIgnore,
  isLoading,
}: AIPrioritiesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingPriorities = priorities.filter(p => p.status === 'pending');

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-24 bg-muted rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20 overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">O que deves fazer agora</CardTitle>
              <p className="text-xs text-muted-foreground">Prioridades geradas por IA</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            IA
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {pendingPriorities.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-600">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground">Não tens ações prioritárias pendentes.</p>
          </div>
        ) : (
          pendingPriorities.map((priority, index) => {
            const Icon = typeIcons[priority.type] || Target;
            const isExpanded = expandedId === priority.id;
            const badge = priorityBadge[priority.priority];

            return (
              <div
                key={priority.id}
                className={cn(
                  "relative rounded-xl border-l-4 transition-all duration-200",
                  priorityColors[priority.priority],
                  isExpanded && "ring-2 ring-primary/20"
                )}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : priority.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border text-lg font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium truncate">{priority.title}</h4>
                        <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{priority.description}</p>
                      
                      {/* AI Reason - always visible */}
                      <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-primary/80">{priority.reason}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 flex gap-2 border-t pt-3 mt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(priority.id);
                      }}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Concluído
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDefer(priority.id);
                      }}
                      className="gap-1.5"
                    >
                      <Clock className="h-4 w-4" />
                      Adiar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIgnore(priority.id);
                      }}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      Ignorar
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
