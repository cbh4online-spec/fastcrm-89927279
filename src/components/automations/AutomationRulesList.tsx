import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Pencil, Trash2, History, Loader2, MessageSquareText, Play, Pause, FileEdit } from "lucide-react";
import { AIAutomationExplainer } from "./AIAutomationExplainer";
import { AutomationTestRunner } from "./AutomationTestRunner";
import { AutomationStateManager } from "./AutomationStateManager";
import {
  useAutomationRules,
  useDeleteAutomationRule,
  AutomationRule,
  AutomationTrigger,
} from "@/hooks/useAutomations";
import { useAutomationGlobalPause } from "@/hooks/useAutomationSafety";
import { AutomationState, AUTOMATION_STATE_CONFIG } from "@/lib/automationSafety";
import { format } from "date-fns";
import { generatePlainLanguageSummary } from "@/lib/automationPlainLanguage";

const triggerLabels: Record<AutomationTrigger, string> = {
  lead_created: "Lead Criado",
  lead_updated: "Lead Atualizado",
  lead_status_changed: "Estado Lead",
  lead_no_response: "Sem Resposta",
  opportunity_created: "Oport. Criada",
  opportunity_updated: "Oport. Atualizada",
  opportunity_stage_changed: "Etapa Alterada",
  opportunity_value_changed: "Valor Alterado",
  contact_created: "Contacto Criado",
  contact_updated: "Contacto Atualizado",
  company_created: "Empresa Criada",
  company_updated: "Empresa Atualizada",
  custom_field_updated: "Campo Custom",
  payment_confirmed: "Pagamento",
  message_received: "Mensagem Recebida",
  first_message_from_lead: "1ª Mensagem Lead",
  conversation_no_reply: "Sem Resposta",
  conversation_resolved: "Conversa Resolvida",
  conversation_priority_changed: "Prioridade Alterada",
  proposal_created: "Proposta Criada",
  proposal_viewed: "Proposta Vista",
  proposal_paid: "Proposta Paga",
  scheduled_time: "Agendado",
};

const triggerColors: Record<AutomationTrigger, string> = {
  lead_created: "bg-blue-500",
  lead_updated: "bg-blue-400",
  lead_status_changed: "bg-blue-600",
  lead_no_response: "bg-orange-500",
  opportunity_created: "bg-purple-500",
  opportunity_updated: "bg-purple-400",
  opportunity_stage_changed: "bg-purple-500",
  opportunity_value_changed: "bg-purple-600",
  contact_created: "bg-emerald-500",
  contact_updated: "bg-emerald-400",
  company_created: "bg-amber-500",
  company_updated: "bg-amber-400",
  custom_field_updated: "bg-cyan-500",
  payment_confirmed: "bg-green-500",
  message_received: "bg-indigo-500",
  first_message_from_lead: "bg-indigo-600",
  conversation_no_reply: "bg-orange-400",
  conversation_resolved: "bg-green-400",
  conversation_priority_changed: "bg-amber-500",
  proposal_created: "bg-rose-400",
  proposal_viewed: "bg-rose-500",
  proposal_paid: "bg-teal-500",
  scheduled_time: "bg-slate-500",
};

interface Props {
  onEdit: (rule: AutomationRule) => void;
  onViewLogs: (ruleId: string) => void;
}

export function AutomationRulesList({ onEdit, onViewLogs }: Props) {
  const { data: rules, isLoading } = useAutomationRules();
  const { data: isGloballyPaused } = useAutomationGlobalPause();
  const deleteRule = useDeleteAutomationRule();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testRule, setTestRule] = useState<AutomationRule | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteRule.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg text-muted-foreground">
        Nenhuma regra de automação criada. Clique em "Nova Regra" para começar.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Gatilho</TableHead>
            <TableHead>Resumo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const conditions = (rule.conditions || []).map((c) => ({
              field_name: c.field_name,
              operator: c.operator,
              value: c.value,
            }));
            const actions = (rule.actions || []).map((a) => ({
              action_type: a.action_type,
              config: a.config as Record<string, unknown>,
            }));
            const summary = generatePlainLanguageSummary(rule.trigger, conditions, actions);

            return (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  {rule.name}
                  {rule.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {rule.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={triggerColors[rule.trigger]}>
                    {triggerLabels[rule.trigger]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {summary.conditions.length > 0 
                            ? `Se ${summary.conditions[0]}${summary.conditions.length > 1 ? ` (+${summary.conditions.length - 1})` : ""}`
                            : "Sem condições"
                          }
                          {" → "}
                          {summary.actions.length > 0
                            ? `${summary.actions[0]}${summary.actions.length > 1 ? ` (+${summary.actions.length - 1})` : ""}`
                            : "Sem ações"
                          }
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[400px]">
                      <p className="font-medium">{summary.fullSummary}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <AutomationStateManager
                      ruleId={rule.id}
                      currentState={((rule as any).state as AutomationState) || (rule.is_active ? "active" : "draft")}
                    />
                    {isGloballyPaused && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <Pause className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Todas as automações estão pausadas globalmente
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(rule.created_at), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(rule)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewLogs(rule.id)}>
                        <History className="mr-2 h-4 w-4" />
                        Ver Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTestRule(rule)}>
                        <Play className="mr-2 h-4 w-4" />
                        Test Mode
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(rule.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AIAutomationExplainer rule={rule} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A regra e todo o histórico de execução serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Runner Dialog */}
      {testRule && (
        <AutomationTestRunner
          open={!!testRule}
          onOpenChange={(open) => !open && setTestRule(null)}
          rule={testRule}
        />
      )}
    </TooltipProvider>
  );
}
