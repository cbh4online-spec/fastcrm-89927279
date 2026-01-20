import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  Bell, 
  Tag, 
  UserPlus, 
  RefreshCw,
  Gift,
  TrendingUp,
  Calendar,
  Heart,
  ShoppingBag,
  Sparkles,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickAutomationAction, useInstallAutomationTemplate } from '@/hooks/useEntityAutomations';
import { 
  getTemplatesByEntityType, 
  AutomationTemplate,
  TEMPLATE_CATEGORIES 
} from '@/data/entityAutomationTemplates';

interface EntityAutomationQuickActionsProps {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
  entityName: string;
  onActionCreated?: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actionType: 'follow_up' | 'reminder' | 'notify' | 'tag' | 'assign';
  defaultConfig: Record<string, unknown>;
}

// Entity-specific quick actions
const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  lead: [
    {
      id: 'follow-up-24h',
      label: 'Follow-up 24h',
      description: 'Criar tarefa de follow-up para amanhã',
      icon: <Clock className="w-4 h-4" />,
      color: 'amber',
      actionType: 'follow_up',
      defaultConfig: { hours: 24, title: 'Follow-up com lead' }
    },
    {
      id: 'hot-lead-notify',
      label: 'Notificar Lead Quente',
      description: 'Receber alerta quando houver atividade',
      icon: <Bell className="w-4 h-4" />,
      color: 'red',
      actionType: 'notify',
      defaultConfig: { message: 'Lead teve nova atividade!' }
    },
    {
      id: 'auto-tag',
      label: 'Tagger Automático',
      description: 'Adicionar tag baseada em comportamento',
      icon: <Tag className="w-4 h-4" />,
      color: 'violet',
      actionType: 'tag',
      defaultConfig: { tag: 'engaged' }
    }
  ],
  contact: [
    {
      id: 'birthday-reminder',
      label: 'Lembrete Aniversário',
      description: 'Receber alerta no aniversário',
      icon: <Gift className="w-4 h-4" />,
      color: 'pink',
      actionType: 'reminder',
      defaultConfig: { type: 'birthday' }
    },
    {
      id: 'reactivation',
      label: 'Campanha Reativação',
      description: 'Alertar quando inativo há 90 dias',
      icon: <RefreshCw className="w-4 h-4" />,
      color: 'emerald',
      actionType: 'notify',
      defaultConfig: { trigger: 'inactive_90_days' }
    },
    {
      id: 'cross-sell',
      label: 'Sugerir Cross-sell',
      description: 'Notificar oportunidades de venda cruzada',
      icon: <ShoppingBag className="w-4 h-4" />,
      color: 'blue',
      actionType: 'notify',
      defaultConfig: { type: 'cross_sell' }
    }
  ],
  company: [
    {
      id: 'renewal-alert',
      label: 'Alerta Renovação',
      description: 'Lembrar 30 dias antes do contrato expirar',
      icon: <Calendar className="w-4 h-4" />,
      color: 'amber',
      actionType: 'reminder',
      defaultConfig: { days_before: 30 }
    },
    {
      id: 'health-monitor',
      label: 'Monitor de Saúde',
      description: 'Alertar quando score de saúde baixar',
      icon: <Heart className="w-4 h-4" />,
      color: 'red',
      actionType: 'notify',
      defaultConfig: { threshold: 50 }
    },
    {
      id: 'upsell-trigger',
      label: 'Trigger de Upsell',
      description: 'Notificar quando atingir limite do plano',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'blue',
      actionType: 'notify',
      defaultConfig: { type: 'usage_threshold' }
    }
  ],
  opportunity: [
    {
      id: 'stale-alert',
      label: 'Alerta Estagnação',
      description: 'Alertar quando parada há mais de 14 dias',
      icon: <Clock className="w-4 h-4" />,
      color: 'amber',
      actionType: 'notify',
      defaultConfig: { stale_days: 14 }
    },
    {
      id: 'stage-tasks',
      label: 'Tarefas por Estágio',
      description: 'Criar tarefas automaticamente ao mudar estágio',
      icon: <Zap className="w-4 h-4" />,
      color: 'blue',
      actionType: 'follow_up',
      defaultConfig: { trigger: 'stage_change' }
    },
    {
      id: 'high-value-notify',
      label: 'Notificar Alto Valor',
      description: 'Alertar gestor para oportunidades grandes',
      icon: <Bell className="w-4 h-4" />,
      color: 'violet',
      actionType: 'notify',
      defaultConfig: { threshold: 10000 }
    }
  ]
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' }
};

export function EntityAutomationQuickActions({
  entityType,
  entityId,
  entityName,
  onActionCreated
}: EntityAutomationQuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const quickAction = useQuickAutomationAction();
  const installTemplate = useInstallAutomationTemplate();

  const actions = QUICK_ACTIONS[entityType] || [];
  const templates = getTemplatesByEntityType(entityType).slice(0, 4);

  const handleQuickAction = async (action: QuickAction) => {
    setLoadingAction(action.id);
    try {
      await quickAction.mutateAsync({
        actionType: action.actionType,
        entityType,
        entityId,
        config: action.defaultConfig
      });
      onActionCreated?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInstallTemplate = async (template: AutomationTemplate) => {
    setLoadingAction(template.id);
    try {
      await installTemplate.mutateAsync({
        templateId: template.id,
        entityType,
        entityId
      });
      onActionCreated?.();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>
                Automatiza em 1 clique para {entityName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.map((action) => {
            const colors = colorClasses[action.color];
            const isLoading = loadingAction === action.id;

            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  "hover:shadow-sm hover:border-primary/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  colors.border
                )}
              >
                <div className={cn("p-2 rounded-lg", colors.bg, colors.text)}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommended Templates */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Templates Recomendados</CardTitle>
              <CardDescription>
                Automações pré-configuradas para {entityType === 'lead' ? 'leads' : 
                  entityType === 'contact' ? 'contactos' : 
                  entityType === 'company' ? 'empresas' : 'oportunidades'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.map((template) => {
            const colors = colorClasses[template.color];
            const isLoading = loadingAction === template.id;
            const category = TEMPLATE_CATEGORIES[template.category];

            return (
              <div
                key={template.id}
                className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", colors.bg, colors.text)}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{template.name}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {category.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Poupa ~{Math.round(template.estimatedTimeSaved / 60)}h/semana
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {template.successRate}% sucesso
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInstallTemplate(template)}
                    disabled={isLoading}
                    className="shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Instalar'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
