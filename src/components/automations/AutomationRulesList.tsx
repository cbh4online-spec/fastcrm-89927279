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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { MoreHorizontal, Pencil, Trash2, History, Loader2, MessageSquareText } from "lucide-react";
import {
  useAutomationRules,
  useDeleteAutomationRule,
  useToggleAutomationRule,
  AutomationRule,
  AutomationTrigger,
} from "@/hooks/useAutomations";
import { format } from "date-fns";
import { generatePlainLanguageSummary } from "@/lib/automationPlainLanguage";

const triggerLabels: Record<AutomationTrigger, string> = {
  lead_created: "Lead Criado",
  lead_updated: "Lead Atualizado",
  opportunity_created: "Oport. Criada",
  opportunity_updated: "Oport. Atualizada",
  opportunity_stage_changed: "Etapa Alterada",
  contact_created: "Contacto Criado",
  contact_updated: "Contacto Atualizado",
  company_created: "Empresa Criada",
  company_updated: "Empresa Atualizada",
  custom_field_updated: "Campo Custom",
  payment_confirmed: "Pagamento",
  proposal_paid: "Proposta Paga",
};

const triggerColors: Record<AutomationTrigger, string> = {
  lead_created: "bg-blue-500",
  lead_updated: "bg-blue-400",
  opportunity_created: "bg-purple-500",
  opportunity_updated: "bg-purple-400",
  opportunity_stage_changed: "bg-purple-500",
  contact_created: "bg-emerald-500",
  contact_updated: "bg-emerald-400",
  company_created: "bg-amber-500",
  company_updated: "bg-amber-400",
  custom_field_updated: "bg-cyan-500",
  payment_confirmed: "bg-green-500",
  proposal_paid: "bg-teal-500",
};

interface Props {
  onEdit: (rule: AutomationRule) => void;
  onViewLogs: (ruleId: string) => void;
}

export function AutomationRulesList({ onEdit, onViewLogs }: Props) {
  const { data: rules, isLoading } = useAutomationRules();
  const deleteRule = useDeleteAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggle = (rule: AutomationRule) => {
    toggleRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

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
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggle(rule)}
                  />
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
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(rule.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    </TooltipProvider>
  );
}
