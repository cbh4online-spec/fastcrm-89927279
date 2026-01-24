/**
 * Success Metrics Component
 * Validates Phase 6 success criteria in real-time
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  TrendingUp,
  Target,
  Users,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useJourneyTransitions } from "@/hooks/useJourneyTransitions";
import { useSJAutomations } from "@/hooks/useSJAutomations";

interface SuccessMetric {
  id: string;
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  value: number;
  target: number;
  unit: string;
  status: "success" | "warning" | "alert";
}

export function SuccessMetrics() {
  const { 
    journeyProfiles, 
    funnelStats, 
    activationCandidates,
    readyForContact,
  } = useJourneyTransitions();
  const { data: automations } = useSJAutomations();

  const metrics = useMemo((): SuccessMetric[] => {
    const totalProfiles = journeyProfiles.length || 1;
    
    // 1. Base instalada ativa (não parada)
    const activeBase = journeyProfiles.filter(
      jp => jp.daysSinceLastActivity <= 90 || jp.currentState === "active_student"
    ).length;
    const activeBasePercent = Math.round((activeBase / totalProfiles) * 100);

    // 2. Conclusões a gerar ações
    const completedWithAction = journeyProfiles.filter(
      jp => jp.currentState === "completed_active" && jp.suggestedTransitions.length > 0
    ).length;
    const totalCompleted = funnelStats.completed_active || 1;
    const completedActionPercent = Math.round((completedWithAction / totalCompleted) * 100);

    // 3. Acompanhamento personalizado
    const withNextAction = journeyProfiles.filter(jp => jp.suggestedTransitions.length > 0).length;
    const personalizedPercent = Math.round((withNextAction / totalProfiles) * 100);

    // 4. Saber quem abordar
    const actionable = activationCandidates.length + readyForContact.length;
    const actionablePercent = Math.min(Math.round((actionable / totalProfiles) * 100), 100);

    // 5. Automações ativas
    const activeAutomations = automations?.filter(a => a.isActive).length || 0;
    const totalAutomations = automations?.length || 1;
    const automationPercent = Math.round((activeAutomations / totalAutomations) * 100);

    // 6. Elegíveis para progressão (conversão potencial)
    const eligibleProgression = funnelStats.eligible_progression || 0;
    const progressionPercent = Math.round((eligibleProgression / totalProfiles) * 100);

    return [
      {
        id: "active-base",
        title: "Base Ativa",
        description: "Alunos com atividade nos últimos 90 dias",
        icon: Users,
        value: activeBasePercent,
        target: 70,
        unit: "%",
        status: activeBasePercent >= 70 ? "success" : activeBasePercent >= 50 ? "warning" : "alert",
      },
      {
        id: "completion-actions",
        title: "Conclusões → Ações",
        description: "Concluídos com próxima ação definida",
        icon: Target,
        value: completedActionPercent,
        target: 80,
        unit: "%",
        status: completedActionPercent >= 80 ? "success" : completedActionPercent >= 50 ? "warning" : "alert",
      },
      {
        id: "personalized",
        title: "Acompanhamento Personalizado",
        description: "Perfis com sugestão de ação específica",
        icon: Zap,
        value: personalizedPercent,
        target: 75,
        unit: "%",
        status: personalizedPercent >= 75 ? "success" : personalizedPercent >= 50 ? "warning" : "alert",
      },
      {
        id: "actionable",
        title: "Para Contactar Agora",
        description: "Perfis prontos para abordagem imediata",
        icon: Clock,
        value: actionable,
        target: 10,
        unit: "perfis",
        status: actionable >= 5 ? "success" : actionable >= 2 ? "warning" : "alert",
      },
      {
        id: "automations",
        title: "Automações Ativas",
        description: "Regras do sistema a funcionar",
        icon: Zap,
        value: activeAutomations,
        target: 5,
        unit: "regras",
        status: activeAutomations >= 5 ? "success" : activeAutomations >= 2 ? "warning" : "alert",
      },
      {
        id: "progression",
        title: "Elegíveis Progressão",
        description: "Alumni prontos para nova formação",
        icon: TrendingUp,
        value: eligibleProgression,
        target: 5,
        unit: "perfis",
        status: eligibleProgression >= 3 ? "success" : eligibleProgression >= 1 ? "warning" : "alert",
      },
    ];
  }, [journeyProfiles, funnelStats, activationCandidates, readyForContact, automations]);

  const successCount = metrics.filter(m => m.status === "success").length;
  const overallHealth = Math.round((successCount / metrics.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Critérios de Sucesso</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Validação em tempo real do módulo
            </p>
          </div>
          <Badge 
            variant={overallHealth >= 80 ? "default" : overallHealth >= 50 ? "secondary" : "destructive"}
            className="text-sm px-3 py-1"
          >
            {overallHealth}% saudável
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const progressValue = metric.unit === "%" 
              ? metric.value 
              : Math.min((metric.value / metric.target) * 100, 100);
            
            return (
              <div
                key={metric.id}
                className="p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${
                    metric.status === "success" 
                      ? "bg-emerald-100 dark:bg-emerald-900/30" 
                      : metric.status === "warning"
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      metric.status === "success" 
                        ? "text-emerald-600" 
                        : metric.status === "warning"
                        ? "text-amber-600"
                        : "text-red-600"
                    }`} />
                  </div>
                  {metric.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                
                <h4 className="text-sm font-medium mb-1">{metric.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{metric.description}</p>
                
                <div className="space-y-2">
                  <Progress 
                    value={progressValue} 
                    className="h-1.5"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {metric.value}{metric.unit === "%" ? "%" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      Meta: {metric.target} {metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
