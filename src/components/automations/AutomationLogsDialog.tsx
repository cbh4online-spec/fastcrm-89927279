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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAutomationLogs, ExecutionStatus } from "@/hooks/useAutomations";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-[800px]">
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
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const duration =
                    log.started_at && log.completed_at
                      ? new Date(log.completed_at).getTime() -
                        new Date(log.started_at).getTime()
                      : null;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.rule?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[log.status]}>
                          {statusLabels[log.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {duration !== null ? `${duration}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                        {log.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
