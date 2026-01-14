import { useState, useMemo } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationLogs, useAutomationRules, ExecutionStatus } from "@/hooks/useAutomations";
import { useLeads } from "@/hooks/useLeads";
import { useOpportunities } from "@/hooks/useOpportunities";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Filter,
  Search,
  AlertTriangle,
  Zap,
  ListChecks,
  Target,
} from "lucide-react";
import { getTriggerLabel } from "@/lib/automationPlainLanguage";

const statusConfig: Record<ExecutionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
  running: { label: "A executar", color: "bg-blue-500", icon: <Play className="h-3 w-3" /> },
  completed: { label: "Sucesso", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Falhou", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
};

interface ActionExecutedDetails {
  action_type: string;
  success: boolean;
  skipped?: boolean;
  blocked?: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    create_task: "Criar tarefa",
    move_opportunity_stage: "Mover etapa",
    send_message: "Enviar mensagem",
    notify_user: "Notificar utilizador",
    assign_owner: "Atribuir responsável",
    add_tag: "Adicionar tag",
    create_opportunity: "Criar oportunidade",
    update_field: "Atualizar campo",
    send_template_message: "Enviar template",
    create_proposal: "Criar proposta",
    send_proposal_link: "Enviar link da proposta",
    wait_time: "Aguardar",
    stop_automation: "Parar automação",
    change_lead_status: "Alterar estado do lead",
  };
  return labels[actionType] || actionType;
}

function LogRow({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const actionsExecuted = (log.actions_executed as ActionExecutedDetails[]) || [];
  const triggerData = log.trigger_data as Record<string, unknown>;
  
  const duration =
    log.started_at && log.completed_at
      ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
      : null;

  const entityInfo = useMemo(() => {
    if (triggerData?.lead_id) {
      return { type: "Lead", id: triggerData.lead_id as string, name: triggerData.lead_name as string };
    }
    if (triggerData?.opportunity_id) {
      return { type: "Oportunidade", id: triggerData.opportunity_id as string, name: triggerData.opportunity_title as string };
    }
    if (triggerData?.contact_id) {
      return { type: "Contacto", id: triggerData.contact_id as string, name: triggerData.contact_name as string };
    }
    return null;
  }, [triggerData]);

  const actionsSummary = useMemo(() => {
    const completed = actionsExecuted.filter((a) => a.success && !a.skipped && !a.blocked).length;
    const skipped = actionsExecuted.filter((a) => a.skipped).length;
    const blocked = actionsExecuted.filter((a) => a.blocked).length;
    const failed = actionsExecuted.filter((a) => !a.success && !a.skipped && !a.blocked).length;
    return { completed, skipped, blocked, failed, total: actionsExecuted.length };
  }, [actionsExecuted]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group hover:bg-muted/50">
        <TableCell className="text-sm">
          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
        </TableCell>
        <TableCell className="font-medium">
          {log.rule?.name ?? "—"}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {getTriggerLabel(log.rule?.trigger || "lead_created")}
        </TableCell>
        <TableCell>
          {entityInfo ? (
            <div className="text-sm">
              <span className="text-muted-foreground">{entityInfo.type}:</span>{" "}
              <span className="font-medium">{entityInfo.name || entityInfo.id.slice(0, 8)}</span>
            </div>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>
          <Badge className={`${statusConfig[log.status as ExecutionStatus].color} gap-1`}>
            {statusConfig[log.status as ExecutionStatus].icon}
            {statusConfig[log.status as ExecutionStatus].label}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {duration !== null ? `${duration}ms` : "—"}
        </TableCell>
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <span className="text-xs mr-1">
                {actionsSummary.completed}/{actionsSummary.total}
              </span>
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
      </TableRow>
      
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={7} className="p-4">
            <div className="space-y-4">
              {/* Trigger Info */}
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Trigger disparado</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getTriggerLabel(log.rule?.trigger || "lead_created")}
                    {entityInfo && (
                      <span className="ml-2">
                        • {entityInfo.type}: {entityInfo.name || entityInfo.id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Executed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="h-4 w-4" />
                  Ações executadas ({actionsSummary.completed} de {actionsSummary.total})
                </div>
                
                <div className="space-y-2">
                  {actionsExecuted.map((action, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-start gap-3 ${
                        action.blocked
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
                          : action.skipped
                          ? "bg-muted"
                          : action.success
                          ? "bg-green-50 dark:bg-green-900/10"
                          : "bg-red-50 dark:bg-red-900/10"
                      }`}
                    >
                      {action.blocked ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      ) : action.skipped ? (
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      ) : action.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {getActionLabel(action.action_type)}
                          </span>
                          {action.blocked && (
                            <Badge variant="outline" className="text-xs text-orange-600">
                              Bloqueada (Modo Teste)
                            </Badge>
                          )}
                          {action.skipped && (
                            <Badge variant="outline" className="text-xs">
                              Saltada
                            </Badge>
                          )}
                        </div>
                        
                        {action.details && Object.keys(action.details).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {action.details.template_name && (
                              <span>Template: {action.details.template_name as string}</span>
                            )}
                            {action.details.task_title && (
                              <span>Tarefa: {action.details.task_title as string}</span>
                            )}
                            {action.details.new_stage && (
                              <span>Nova etapa: {action.details.new_stage as string}</span>
                            )}
                          </div>
                        )}
                        
                        {action.error && (
                          <div className="text-xs text-red-600 mt-1">
                            Erro: {action.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {actionsExecuted.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                      Nenhuma ação registada
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {log.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">Erro</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AutomationLogsPanel() {
  const { data: logs, isLoading } = useAutomationLogs();
  const { data: rules } = useAutomationRules();
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter((log) => {
      // Status filter
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      
      // Rule filter
      if (ruleFilter !== "all" && log.rule_id !== ruleFilter) return false;
      
      // Entity type filter
      const triggerData = log.trigger_data as Record<string, unknown>;
      if (entityTypeFilter !== "all") {
        if (entityTypeFilter === "lead" && !triggerData?.lead_id) return false;
        if (entityTypeFilter === "opportunity" && !triggerData?.opportunity_id) return false;
      }
      
      // Specific entity filter
      if (entityFilter !== "all") {
        const leadId = triggerData?.lead_id as string;
        const opportunityId = triggerData?.opportunity_id as string;
        if (leadId !== entityFilter && opportunityId !== entityFilter) return false;
      }
      
      // Search query
      if (searchQuery) {
        const ruleName = log.rule?.name?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        if (!ruleName.includes(query)) return false;
      }
      
      return true;
    });
  }, [logs, statusFilter, ruleFilter, entityFilter, entityTypeFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, success: 0, failed: 0, pending: 0 };
    return {
      total: logs.length,
      success: logs.filter((l) => l.status === "completed").length,
      failed: logs.filter((l) => l.status === "failed").length,
      pending: logs.filter((l) => l.status === "pending" || l.status === "running").length,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Falhou
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome da automação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="completed">Sucesso</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="running">A executar</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={ruleFilter} onValueChange={setRuleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Automação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as automações</SelectItem>
                {rules?.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setEntityFilter("all"); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo de entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="opportunity">Oportunidades</SelectItem>
              </SelectContent>
            </Select>
            
            {entityTypeFilter === "lead" && leads && leads.length > 0 && (
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os leads</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {entityTypeFilter === "opportunity" && opportunities && opportunities.length > 0 && (
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar oportunidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as oportunidades</SelectItem>
                  {opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={opp.id}>
                      {opp.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Logs de Execução
            {filteredLogs.length !== logs?.length && (
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} de {logs?.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {logs?.length === 0
                ? "Nenhum log de execução encontrado."
                : "Nenhum resultado para os filtros selecionados."}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
