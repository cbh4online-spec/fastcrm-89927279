/**
 * Student Journey Automation Templates Component
 * Shows native automation templates with their triggers, conditions, and actions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  DEFAULT_SJ_AUTOMATIONS,
  SJ_TRIGGER_LABELS,
  SJ_ACTION_LABELS,
  SJAutomation,
} from "@/types/sjAutomation";
import { useSJAutomations, useToggleSJAutomation, useInitializeSJAutomations } from "@/hooks/useSJAutomations";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CATEGORY_CONFIG = {
  completion: {
    label: "Pós-Conclusão",
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "Automações executadas quando um aluno conclui uma formação",
  },
  inactive: {
    label: "Base Instalada Inativa",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Verificações diárias para reativar alumni inativos",
  },
  progression: {
    label: "Elegibilidade para Progressão",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Identificação de alunos prontos para novas formações",
  },
  engagement: {
    label: "Engajamento e Qualificação",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Automações de qualificação de leads e follow-ups",
  },
};

function categorizeAutomation(automation: typeof DEFAULT_SJ_AUTOMATIONS[0]): keyof typeof CATEGORY_CONFIG {
  const name = automation.name.toLowerCase();
  
  if (name.includes("conclusão") || name.includes("concluída") || name.includes("alumni estratégico")) {
    return "completion";
  }
  if (name.includes("inativ") || name.includes("base inativa")) {
    return "inactive";
  }
  if (name.includes("progressão") || name.includes("elegível")) {
    return "progression";
  }
  return "engagement";
}

interface AutomationCardProps {
  automation: typeof DEFAULT_SJ_AUTOMATIONS[0] & { id?: string; isActive?: boolean };
  isInstalled?: boolean;
  onToggle?: (id: string, isActive: boolean) => void;
  isToggling?: boolean;
}

function AutomationCard({ automation, isInstalled, onToggle, isToggling }: AutomationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const triggerLabel = SJ_TRIGGER_LABELS[automation.triggerType] || automation.triggerType;

  return (
    <Card className={`transition-all ${isInstalled ? "border-primary/30" : "border-muted"}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{automation.name}</CardTitle>
                {automation.isSystem && (
                  <Badge variant="secondary" className="text-xs">Sistema</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{automation.description}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {isInstalled && automation.id && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {automation.isActive ? "Ativa" : "Inativa"}
                  </span>
                  <Switch
                    checked={automation.isActive}
                    onCheckedChange={(checked) => onToggle?.(automation.id!, checked)}
                    disabled={isToggling}
                  />
                </div>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {triggerLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {automation.actions.length} {automation.actions.length === 1 ? "ação" : "ações"}
            </Badge>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            {/* Conditions */}
            {automation.conditions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Condições
                </h4>
                <div className="space-y-1">
                  {automation.conditions.map((condition, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded">
                      {condition.field} {condition.operator} {String(condition.value)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Zap className="h-4 w-4 text-primary" />
                Ações
              </h4>
              <div className="space-y-2">
                {automation.actions.map((action, idx) => {
                  const actionLabel = SJ_ACTION_LABELS[action.type] || action.type;
                  return (
                    <div key={idx} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                      <span className="font-medium">{actionLabel}</span>
                      {action.config.title && (
                        <p className="text-muted-foreground mt-0.5">
                          {String(action.config.title)}
                        </p>
                      )}
                      {action.config.newStage && (
                        <p className="text-muted-foreground mt-0.5">
                          → {String(action.config.newStage)}
                        </p>
                      )}
                      {action.config.daysFromNow && (
                        <p className="text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Em {String(action.config.daysFromNow)} dias
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function SJAutomationTemplates() {
  const { data: installedAutomations, isLoading } = useSJAutomations();
  const toggleMutation = useToggleSJAutomation();
  const installMutation = useInitializeSJAutomations();
  
  const hasInstalledAutomations = installedAutomations && installedAutomations.length > 0;
  
  // Merge templates with installed status
  const automationsWithStatus = DEFAULT_SJ_AUTOMATIONS.map((template) => {
    const installed = installedAutomations?.find(
      (a) => a.name === template.name && a.isSystem
    );
    return {
      ...template,
      id: installed?.id,
      isActive: installed?.isActive ?? template.isActive,
      isInstalled: !!installed,
    };
  });
  
  // Group by category
  const groupedAutomations = automationsWithStatus.reduce((acc, automation) => {
    const category = categorizeAutomation(automation);
    if (!acc[category]) acc[category] = [];
    acc[category].push(automation);
    return acc;
  }, {} as Record<keyof typeof CATEGORY_CONFIG, typeof automationsWithStatus>);

  const handleToggle = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  const handleInstallAll = () => {
    installMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Automações Nativas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Templates pré-configurados para o ciclo de vida dos alunos
          </p>
        </div>
        
        {!hasInstalledAutomations && (
          <Button onClick={handleInstallAll} disabled={installMutation.isPending}>
            {installMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A instalar...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Instalar Todas
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(
          ([key, config]) => {
            const count = groupedAutomations[key]?.length || 0;
            const activeCount = groupedAutomations[key]?.filter(a => a.isActive && a.isInstalled).length || 0;
            const Icon = config.icon;
            
            return (
              <Card key={key} className={config.bgColor}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeCount}/{count} ativas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Tabs by category */}
      <Tabs defaultValue="completion" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(
            ([key, config]) => (
              <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
                {config.label}
              </TabsTrigger>
            )
          )}
        </TabsList>
        
        {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(
          ([key, config]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
              <div className="space-y-3">
                {(groupedAutomations[key] || []).map((automation, idx) => (
                  <AutomationCard
                    key={automation.name + idx}
                    automation={automation}
                    isInstalled={automation.isInstalled}
                    onToggle={handleToggle}
                    isToggling={toggleMutation.isPending}
                  />
                ))}
                {(!groupedAutomations[key] || groupedAutomations[key].length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma automação nesta categoria
                  </p>
                )}
              </div>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}
