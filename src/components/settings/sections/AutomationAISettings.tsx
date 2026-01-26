import { useNavigate } from "react-router-dom";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Zap,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
  Brain,
  History,
  Lightbulb,
  Bot,
  Target,
  FileText,
  Calendar,
  Database,
} from "lucide-react";
import { AgentSchedulesManager } from "@/components/ai-agents/AgentSchedulesManager";
import { CacheMetricsDashboard } from "@/components/ai-agents/CacheMetricsDashboard";

interface AutomationAISettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function AutomationAISettings({ searchQuery = "", matchedSections }: AutomationAISettingsProps) {
  const navigate = useNavigate();
  const { canUseFeature } = useSubscription();
  const hasAI = canUseFeature("ai_suggestions");
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  return (
    <div className="space-y-6">
      {/* Hero Card for AI */}
      <Card className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-background border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Automação & Inteligência Artificial
                {!hasAI && <Badge variant="secondary">Pro</Badge>}
              </CardTitle>
              <CardDescription>
                Automatize tarefas repetitivas e deixe a IA ajudar a tomar melhores decisões
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Zap className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="font-semibold">Automações Ativas</p>
              <p className="text-2xl font-bold text-primary">12</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Bot className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="font-semibold">Ações Executadas</p>
              <p className="text-2xl font-bold text-primary">1,247</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-semibold">Sugestões IA</p>
              <p className="text-2xl font-bold text-primary">89</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <SettingsSection
        title="Regras de Automação"
        description="Criar fluxos de trabalho automáticos"
        icon={<Zap className="h-5 w-5" />}
      >
        <SettingsItem
          title="Gerir Automações"
          description="Ver, criar e editar regras de automação"
          action={
            <Button onClick={() => navigate("/dashboard/automations")}>
              Abrir Automações
            </Button>
          }
        />
        <SettingsItem
          title="Templates de Automação"
          description="Começar com automações pré-configuradas"
          action={<Button variant="outline">Ver Templates</Button>}
        />
      </SettingsSection>

      {/* Custom Field Automations */}
      <SettingsSection
        title="Automações por Campo"
        description="Ações automáticas quando campos são alterados"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        isPremium={!hasAI}
        isLocked={!hasAI}
        planRequired="Pro"
      >
        <SettingsItem
          title="Triggers por Campo"
          description="Executar ações quando valores de campos mudam"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Validações Automáticas"
          description="Validar dados automaticamente ao preencher"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Lead Scoring */}
      <SettingsSection
        title="Lead Scoring"
        description="Pontuar leads automaticamente"
        icon={<Target className="h-5 w-5" />}
        isPremium={!hasAI}
        isLocked={!hasAI}
        planRequired="Pro"
      >
        <SettingsItem
          title="Regras de Pontuação"
          description="Definir critérios e pesos para scoring"
          action={<Button variant="outline">Configurar Scoring</Button>}
        />
        <SettingsItem
          title="Modelo de ML"
          description="Usar IA para prever qualidade de leads"
          action={<Badge variant="secondary">Em breve</Badge>}
        />
      </SettingsSection>

      {/* AI Suggestions */}
      <SettingsSection
        title="Sugestões de IA"
        description="Configurar como a IA sugere melhorias"
        icon={<Brain className="h-5 w-5" />}
        isPremium={!hasAI}
        isLocked={!hasAI}
        planRequired="Pro"
      >
        <SettingsItem
          title="Sugestões de Campos"
          description="IA preenche campos em falta automaticamente"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Sugestões de Automação"
          description="IA sugere automações com base em padrões"
          action={<Button variant="outline">Ver Sugestões</Button>}
        />
        <SettingsItem
          title="Insights de Negócio"
          description="Análises e recomendações geradas por IA"
          action={
            <Button variant="outline" onClick={() => navigate("/dashboard/ai-suggestions")}>
              Ver Insights
            </Button>
          }
        />
      </SettingsSection>

      {/* AI Agent Schedules */}
      <SettingsSection
        title="Agendamentos de Análise IA"
        description="Configurar análises automáticas periódicas"
        icon={<Calendar className="h-5 w-5" />}
        isPremium={!hasAI}
        isLocked={!hasAI}
        planRequired="Pro"
      >
        <div className="pt-2">
          <AgentSchedulesManager />
        </div>
      </SettingsSection>

      {/* AI Cache Metrics */}
      <SettingsSection
        title="Cache de IA"
        description="Monitorizar performance e economia do sistema de cache"
        icon={<Database className="h-5 w-5" />}
        isPremium={!hasAI}
        isLocked={!hasAI}
        planRequired="Pro"
      >
        <div className="pt-2">
          <CacheMetricsDashboard />
        </div>
      </SettingsSection>

      {/* Automation Logs */}
      <SettingsSection
        title="Logs de Automação"
        description="Histórico de execuções de automações"
        icon={<History className="h-5 w-5" />}
      >
        <SettingsItem
          title="Ver Histórico"
          description="Consultar execuções recentes e erros"
          action={<Button variant="outline">Ver Logs</Button>}
        />
        <SettingsItem
          title="Exportar Logs"
          description="Exportar histórico de automações"
          action={<Button variant="outline">Exportar</Button>}
        />
      </SettingsSection>
    </div>
  );
}
