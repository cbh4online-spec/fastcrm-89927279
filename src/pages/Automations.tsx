import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Zap, History, Sparkles } from "lucide-react";
import { AutomationRulesList } from "@/components/automations/AutomationRulesList";
import { VisualAutomationBuilder } from "@/components/automations/VisualAutomationBuilder";
import { AutomationLogsDialog } from "@/components/automations/AutomationLogsDialog";
import { AutomationLogsPanel } from "@/components/automations/AutomationLogsPanel";
import { AutomationSuggestionsPanel } from "@/components/automations/AutomationSuggestionsPanel";
import { AutomationRule, useAutomationRules, useAutomationLogs } from "@/hooks/useAutomations";
import { toast } from "sonner";

export default function Automations() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsRuleId, setLogsRuleId] = useState<string | null>(null);
  const [logsRuleName, setLogsRuleName] = useState<string>("");

  const { data: rules } = useAutomationRules();
  const { data: allLogs } = useAutomationLogs();

  const handleEdit = (rule: AutomationRule) => {
    setEditRule(rule);
    setBuilderOpen(true);
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
      id: "", // Clear ID to create new
      name: `${rule.name} (Copy)`,
      is_active: false,
    } as AutomationRule);
    setBuilderOpen(true);
    toast.info("Duplicating automation - save to create a copy");
  };

  const activeRules = rules?.filter((r) => r.is_active).length ?? 0;
  const totalExecutions = allLogs?.length ?? 0;
  const failedExecutions = allLogs?.filter((l) => l.status === "failed").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Automações</h1>
            <p className="text-muted-foreground">
              Configure regras para automatizar tarefas repetitivas
            </p>
          </div>
          <Button onClick={() => setBuilderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRules}</div>
              <p className="text-xs text-muted-foreground">
                de {rules?.length ?? 0} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Execuções (últimas 200)</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExecutions}</div>
              <p className="text-xs text-muted-foreground">
                {failedExecutions} falharam
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalExecutions > 0
                  ? `${Math.round(((totalExecutions - failedExecutions) / totalExecutions) * 100)}%`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                baseado nos últimos logs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="suggestions">
          <TabsList>
            <TabsTrigger value="suggestions">
              <Sparkles className="h-4 w-4 mr-1" />
              Sugestões IA
            </TabsTrigger>
            <TabsTrigger value="rules">Regras</TabsTrigger>
            <TabsTrigger value="logs">Logs de Execução</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-4">
            <AutomationSuggestionsPanel />
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
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
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <AutomationLogsPanel />
          </TabsContent>
        </Tabs>
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
