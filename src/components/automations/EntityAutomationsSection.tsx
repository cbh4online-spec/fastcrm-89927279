import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Zap, 
  FileText, 
  Target, 
  TrendingUp, 
  Settings2,
  RefreshCw,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Activity,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomationRules, AutomationRule } from "@/hooks/useAutomations";
import { useAutomationSuggestions, useGenerateAutomationSuggestions } from "@/hooks/useAutomationSuggestions";
import { AutomationSuggestionsPanel } from "./AutomationSuggestionsPanel";
import { AutomationTemplatesPanel } from "./AutomationTemplatesPanel";
import { AutomationRecipesPanel } from "./AutomationRecipesPanel";
import { AutomationRulesList } from "./AutomationRulesList";

interface EntityAutomationsSectionProps {
  entityType?: 'lead' | 'contact' | 'company' | 'opportunity';
  showHeader?: boolean;
}

export function EntityAutomationsSection({ 
  entityType,
  showHeader = true 
}: EntityAutomationsSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { data: rules = [], isLoading: rulesLoading } = useAutomationRules();
  const { data: suggestions = [] } = useAutomationSuggestions();
  const generateSuggestions = useGenerateAutomationSuggestions();

  // Filter rules by entity type if specified
  const filteredRules = entityType 
    ? rules.filter(r => {
        const trigger = r.trigger?.toLowerCase() || '';
        return trigger.includes(entityType);
      })
    : rules;

  const activeRules = filteredRules.filter(r => r.is_active);
  const inactiveRules = filteredRules.filter(r => !r.is_active);
  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];

  // Calculate stats
  const totalExecutions = 0; // Would come from logs
  const successRate = 95; // Mock
  const timeSaved = 12; // hours saved mock

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Centro de Automações
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeRules.length} automações ativas • {pendingSuggestions.length} sugestões pendentes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSuggestions.mutate()}
              disabled={generateSuggestions.isPending}
              className="gap-2"
            >
              {generateSuggestions.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar Sugestões IA
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Automação
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Sugestões IA
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-2">
            <Target className="w-4 h-4" />
            Receitas
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Play className="w-4 h-4" />
            Minhas Automações
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              title="Automações Ativas"
              value={activeRules.length}
              icon={<Play className="w-5 h-5 text-emerald-600" />}
              trend={`${inactiveRules.length} inativas`}
              trendType="neutral"
            />
            <StatsCard
              title="Sugestões IA"
              value={pendingSuggestions.length}
              icon={<Sparkles className="w-5 h-5 text-amber-600" />}
              trend="Clique para rever"
              trendType="info"
              onClick={() => setActiveTab('suggestions')}
            />
            <StatsCard
              title="Taxa de Sucesso"
              value={`${successRate}%`}
              icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
              trend="Últimos 30 dias"
              trendType="positive"
            />
            <StatsCard
              title="Tempo Poupado"
              value={`${timeSaved}h`}
              icon={<Clock className="w-5 h-5 text-purple-600" />}
              trend="Este mês"
              trendType="positive"
            />
          </div>

          {/* Quick Actions + Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
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
                      Comece a automatizar em segundos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionButton
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Analisar padrões e sugerir automações"
                  onClick={() => generateSuggestions.mutate()}
                  loading={generateSuggestions.isPending}
                />
                <QuickActionButton
                  icon={<FileText className="w-4 h-4" />}
                  label="Instalar template por indústria"
                  onClick={() => setActiveTab('templates')}
                />
                <QuickActionButton
                  icon={<Target className="w-4 h-4" />}
                  label="Ver receitas pré-configuradas"
                  onClick={() => setActiveTab('recipes')}
                />
                <QuickActionButton
                  icon={<Settings2 className="w-4 h-4" />}
                  label="Criar automação personalizada"
                  onClick={() => {}}
                />
              </CardContent>
            </Card>

            {/* Productivity Insights */}
            <Card className="bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Insights de Produtividade</CardTitle>
                    <CardDescription>
                      O que a IA descobriu sobre o teu workflow
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <InsightItem
                  icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  text="Leads de Instagram convertem 40% mais rápido"
                  actionLabel="Criar automação"
                />
                <InsightItem
                  icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                  text="23 leads sem follow-up há +48h"
                  actionLabel="Automatizar"
                />
                <InsightItem
                  icon={<Activity className="w-4 h-4 text-blue-600" />}
                  text="Terça e Quinta são os melhores dias para contactar"
                  actionLabel="Agendar"
                />
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions Preview */}
          {pendingSuggestions.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Sugestões Pendentes
                        <Badge variant="secondary" className="ml-2">
                          {pendingSuggestions.length}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Automações sugeridas pela IA baseadas nos teus padrões
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('suggestions')}>
                    Ver Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingSuggestions.slice(0, 3).map((s, i) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('suggestions')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {s.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(s.confidence * 100)}% confiança
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="mt-6">
          <AutomationSuggestionsPanel />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <AutomationTemplatesPanel />
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="mt-6">
          <AutomationRecipesPanel />
        </TabsContent>

        {/* Active Automations Tab */}
        <TabsContent value="active" className="mt-6">
          <AutomationRulesList 
            onEdit={(rule) => console.log('Edit rule', rule.id)} 
            onViewLogs={(ruleId) => console.log('View logs', ruleId)} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  trendType: 'positive' | 'negative' | 'neutral' | 'info';
  onClick?: () => void;
}

function StatsCard({ title, value, icon, trend, trendType, onClick }: StatsCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className={cn(
              "text-xs mt-1",
              trendType === 'positive' && "text-emerald-600",
              trendType === 'negative' && "text-red-600",
              trendType === 'neutral' && "text-muted-foreground",
              trendType === 'info' && "text-primary"
            )}>
              {trend}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Action Button
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
}

function QuickActionButton({ icon, label, onClick, loading }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <Zap className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

// Insight Item
interface InsightItemProps {
  icon: React.ReactNode;
  text: string;
  actionLabel: string;
}

function InsightItem({ icon, text, actionLabel }: InsightItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
      <div className="p-1.5 rounded bg-muted mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{text}</p>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-xs">
        {actionLabel}
      </Button>
    </div>
  );
}
