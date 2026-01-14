import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAutomationLogs, ExecutionStatus } from "@/hooks/useAutomations";
import { format } from "date-fns";
import { Loader2, ChevronDown, ChevronRight, FileText, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";

const statusLabels: Record<ExecutionStatus, string> = {
  pending: "Pendente",
  running: "A executar",
  completed: "Concluído",
  failed: "Falhou",
};

const statusColors: Record<ExecutionStatus, string> = {
  pending: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

interface TemplateActionDetails {
  template_id?: string;
  template_name?: string;
  channel?: string;
  rendered_content?: string;
  rendered_subject?: string;
  missing_variables?: string[];
  on_missing_fields?: string;
  skipped?: boolean;
  task_created?: boolean;
}

function LogDetailsRow({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const actionsExecuted = log.actions_executed as any[] || [];
  const templateActions = actionsExecuted.filter(
    (a: any) => a.action_type === "send_template_message"
  );

  const duration =
    log.started_at && log.completed_at
      ? new Date(log.completed_at).getTime() -
        new Date(log.started_at).getTime()
      : null;

  const hasTemplateDetails = templateActions.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group">
        <TableCell className="text-sm">
          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
        </TableCell>
        <TableCell className="font-medium">
          {log.rule?.name ?? "—"}
        </TableCell>
        <TableCell>
          <Badge className={statusColors[log.status as ExecutionStatus]}>
            {statusLabels[log.status as ExecutionStatus]}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {duration !== null ? `${duration}ms` : "—"}
        </TableCell>
        <TableCell className="text-sm">
          {hasTemplateDetails ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <FileText className="h-3 w-3 mr-1" />
                Ver detalhes
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronRight className="h-3 w-3 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : log.error_message ? (
            <span className="text-destructive truncate max-w-[150px] block">
              {log.error_message}
            </span>
          ) : (
            "—"
          )}
        </TableCell>
      </TableRow>
      {hasTemplateDetails && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={5} className="p-4">
              <div className="space-y-3">
                {templateActions.map((action: any, idx: number) => {
                  const details = action.details as TemplateActionDetails;
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-background rounded-lg border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            Template: {details?.template_name || "—"}
                          </span>
                          {details?.channel && (
                            <Badge variant="outline" className="text-xs">
                              {details.channel}
                            </Badge>
                          )}
                        </div>
                        {details?.skipped ? (
                          <Badge variant="secondary" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Saltado
                          </Badge>
                        ) : details?.task_created ? (
                          <Badge variant="secondary" className="text-xs">
                            Tarefa criada
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                      </div>

                      {details?.missing_variables && details.missing_variables.length > 0 && (
                        <div className="text-xs text-amber-600">
                          <span className="font-medium">Variáveis em falta:</span>{" "}
                          {details.missing_variables.join(", ")}
                        </div>
                      )}

                      {details?.rendered_subject && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Assunto:</span>{" "}
                          {details.rendered_subject}
                        </div>
                      )}

                      {details?.rendered_content && (
                        <div className="p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                          {details.rendered_content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId: string | null;
  ruleName?: string;
}

export function AutomationLogsDialog({ open, onOpenChange, ruleId, ruleName }: Props) {
  const { data: logs, isLoading } = useAutomationLogs(ruleId ?? undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            Logs de Execução {ruleName && `- ${ruleName}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            Nenhum log de execução encontrado.
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <LogDetailsRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
