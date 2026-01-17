import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Zap, History, Sparkles, BookOpen, RefreshCw, CheckCircle, XCircle, Percent } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { AutomationRulesList } from "@/components/automations/AutomationRulesList";
import { VisualAutomationBuilder } from "@/components/automations/VisualAutomationBuilder";
import { AutomationLogsDialog } from "@/components/automations/AutomationLogsDialog";
import { AutomationLogsPanel } from "@/components/automations/AutomationLogsPanel";
import { AutomationSuggestionsPanel } from "@/components/automations/AutomationSuggestionsPanel";
import { AutomationRecipesPanel } from "@/components/automations/AutomationRecipesPanel";
import { GlobalPauseToggle } from "@/components/automations/GlobalPauseToggle";
import { ConversationAutomationHelper } from "@/components/automations/ConversationAutomationHelper";
import { AutomationRule, useAutomationRules, useAutomationLogs } from "@/hooks/useAutomations";
import { toast } from "sonner";

type ActiveTab = "recipes" | "suggestions" | "rules" | "logs";

export default function Automations() {
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsRuleId, setLogsRuleId] = useState<string | null>(null);
  const [logsRuleName, setLogsRuleName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("recipes");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: rules, isLoading: rulesLoading } = useAutomationRules();
  const { data: allLogs, isLoading: logsLoading } = useAutomationLogs();

  const isLoading = rulesLoading || logsLoading;

  // Stats
  const stats = useMemo(() => {
    const activeRules = rules?.filter((r) => r.is_active).length ?? 0;
    const totalRules = rules?.length ?? 0;
    const totalExecutions = allLogs?.length ?? 0;
    const failedExecutions = allLogs?.filter((l) => l.status === "failed").length ?? 0;
    const successRate = totalExecutions > 0
      ? Math.round(((totalExecutions - failedExecutions) / totalExecutions) * 100)
      : 0;

    return { activeRules, totalRules, totalExecutions, failedExecutions, successRate };
  }, [rules, allLogs]);

  const handleEdit = (rule: AutomationRule) => {
    setEditRule(rule);
    setBuilderOpen(true);
  };

  const handleEditById = (ruleId: string) => {
    const rule = rules?.find((r) => r.id === ruleId);
    if (rule) {
      setEditRule(rule);
      setBuilderOpen(true);
    }
  };

  const handleViewLogs = (ruleId: string) => {
    const rule = rules?.find((r) => r.id === ruleId);
    setLogsRuleId(ruleId);
    setLogsRuleName(rule?.name || "");
    setLogsOpen(true);
  };

  const handleBuilderClose = (open: boolean) => {
    setBuilderOpen(open);
    if (!open) setEditRule(null);
  };

  const handleDuplicate = (rule: AutomationRule) => {
    setEditRule({
      ...rule,
      id: "",
      name: `${rule.name} (Copy)`,
      is_active: false,
    } as AutomationRule);
    setBuilderOpen(true);
    toast.info("Duplicating automation - save to create a copy");
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["automation-logs"] }),
    ]);
    setIsRefreshing(false);
  }, [queryClient]);

  // Page tabs
  const pageTabs = [
    { id: "recipes", label: "Receitas Inbox", icon: <BookOpen className="h-4 w-4" /> },
    { id: "suggestions", label: "Sugestões IA", icon: <Sparkles className="h-4 w-4" /> },
    { id: "rules", label: "Regras", count: stats.totalRules },
    { id: "logs", label: "Logs", count: stats.totalExecutions },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Page Header */}
        <PageHeader
          title="Automações"
          count={stats.totalRules}
          description="Configure regras para automatizar tarefas repetitivas"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
          actions={[
            {
              label: "Nova Regra",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setBuilderOpen(true),
            },
          ]}
        >
          <div className="flex items-center gap-2">
            <GlobalPauseToggle />
            <ConversationAutomationHelper />
          </div>
        </PageHeader>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Regras Ativas</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeRules}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">de {stats.totalRules} total</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Execuções</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">últimas 200</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Falharam</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.failedExecutions}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar automações..."
          onSearchChange={setSearchValue}
          showFilters={false}
          rightActions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          }
        />

        {/* Tab Content */}
        {activeTab === "recipes" && (
          <AutomationRecipesPanel onEditRule={handleEditById} />
        )}

        {activeTab === "suggestions" && (
          <AutomationSuggestionsPanel />
        )}

        {activeTab === "rules" && (
          <Card>
            <CardHeader>
              <CardTitle>Regras de Automação</CardTitle>
              <CardDescription>
                Gerir regras que executam ações automaticamente com base em gatilhos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomationRulesList onEdit={handleEdit} onViewLogs={handleViewLogs} />
            </CardContent>
          </Card>
        )}

        {activeTab === "logs" && (
          <AutomationLogsPanel />
        )}
      </div>

      <VisualAutomationBuilder
        open={builderOpen}
        onOpenChange={handleBuilderClose}
        editRule={editRule}
        onDuplicate={handleDuplicate}
      />

      <AutomationLogsDialog
        open={logsOpen}
        onOpenChange={setLogsOpen}
        ruleId={logsRuleId}
        ruleName={logsRuleName}
      />
    </DashboardLayout>
  );
}