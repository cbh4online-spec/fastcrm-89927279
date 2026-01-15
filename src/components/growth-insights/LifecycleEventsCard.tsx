import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar,
  CheckCircle2,
  XCircle,
  Play,
  User,
  Package,
  Mail,
  MessageCircle,
  ListTodo,
  Zap
} from 'lucide-react';
import { LifecycleEvent, LifecycleTrigger, LIFECYCLE_ACTION_LABELS } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface LifecycleEventsCardProps {
  events: LifecycleEvent[];
  triggers: LifecycleTrigger[];
  isLoading?: boolean;
  onExecuteEvent?: (event: LifecycleEvent) => void;
  onDismissEvent?: (eventId: string) => void;
  onViewCustomer?: (customerId: string) => void;
}

export function LifecycleEventsCard({ 
  events, 
  triggers,
  isLoading,
  onExecuteEvent,
  onDismissEvent,
  onViewCustomer
}: LifecycleEventsCardProps) {
  const pendingEvents = events.filter(e => e.status === 'pending');
  const pastDueEvents = pendingEvents.filter(e => new Date(e.eventDate) < new Date());
  const upcomingEvents = pendingEvents.filter(e => new Date(e.eventDate) >= new Date());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Ciclo de Vida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 w-48 bg-muted rounded mb-2" />
                <div className="h-3 w-64 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Ciclo de Vida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sem eventos pendentes.</p>
            <p className="text-sm">O sistema monitoriza automaticamente os clientes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_task': return <ListTodo className="h-4 w-4" />;
      case 'send_email': return <Mail className="h-4 w-4" />;
      case 'send_whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'create_opportunity': return <Zap className="h-4 w-4" />;
      case 'trigger_automation': return <Play className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Há ${Math.abs(diffDays)} dias`;
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 7) return `Em ${diffDays} dias`;
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  const renderEvent = (event: LifecycleEvent, isPastDue: boolean) => {
    const trigger = triggers.find(t => t.id === event.triggerId);

    return (
      <div 
        key={event.id}
        className={cn(
          "p-4 rounded-lg border transition-all",
          isPastDue 
            ? "border-orange-200 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-900/10"
            : "border-border hover:shadow-sm"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getActionIcon(event.actionType)}
            <span className="font-medium">
              {LIFECYCLE_ACTION_LABELS[event.actionType] || event.actionType}
            </span>
            {isPastDue && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Em atraso
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(event.eventDate)}
          </div>
        </div>

        {/* Customer & Product */}
        <div className="flex items-center gap-4 mb-2 text-sm">
          <span 
            className="flex items-center gap-1.5 text-primary cursor-pointer hover:underline"
            onClick={() => onViewCustomer?.(event.customerId)}
          >
            <User className="h-3.5 w-3.5" />
            {event.customerName}
          </span>
          {event.productName && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              {event.productName}
            </span>
          )}
        </div>

        {/* Suggestion */}
        <p className="text-sm text-muted-foreground mb-3">
          {event.suggestion}
        </p>

        {/* Trigger Info */}
        {trigger && (
          <p className="text-xs text-muted-foreground italic mb-3">
            Regra: {trigger.name}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={() => onExecuteEvent?.(event)}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Executar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDismissEvent?.(event.id)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Ciclo de Vida
        </CardTitle>
        <div className="flex items-center gap-2">
          {pastDueEvents.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {pastDueEvents.length} em atraso
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {pendingEvents.length} eventos
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Past Due Events */}
        {pastDueEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-orange-600">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Em Atraso
            </h4>
            <div className="space-y-3">
              {pastDueEvents.slice(0, 5).map(event => renderEvent(event, true))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Próximos Eventos
            </h4>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map(event => renderEvent(event, false))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <Clock className="h-3 w-3 inline mr-1" />
          Este é um bom momento para voltar a contactar.
        </div>
      </CardContent>
    </Card>
  );
}
