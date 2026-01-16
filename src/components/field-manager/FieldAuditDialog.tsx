import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useFieldAuditLogs } from "@/hooks/useManagedFields";
import type { ManagedField } from "@/types/fieldManager";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { FileEdit, Plus, Archive, RotateCcw, Clock } from "lucide-react";

interface FieldAuditDialogProps {
  field: ManagedField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-green-500" />,
  updated: <FileEdit className="h-4 w-4 text-blue-500" />,
  archived: <Archive className="h-4 w-4 text-amber-500" />,
  restored: <RotateCcw className="h-4 w-4 text-purple-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  archived: "Arquivado",
  restored: "Restaurado",
};

export function FieldAuditDialog({ field, open, onOpenChange }: FieldAuditDialogProps) {
  const { data: logs = [], isLoading } = useFieldAuditLogs(field?.id);

  if (!field) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
          <DialogDescription>
            Histórico de modificações do campo "{field.label}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem histórico disponível</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ACTION_ICONS[log.action] || <FileEdit className="h-4 w-4" />}
                      <Badge variant="outline">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                    </span>
                  </div>
                  
                  {log.action === "updated" && log.old_values && log.new_values && (
                    <div className="text-sm space-y-1 mt-2 pt-2 border-t">
                      {Object.keys(log.new_values).map(key => {
                        const oldVal = (log.old_values as Record<string, unknown>)?.[key];
                        const newVal = (log.new_values as Record<string, unknown>)?.[key];
                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                          return (
                            <div key={key} className="flex items-start gap-2">
                              <span className="font-medium text-muted-foreground min-w-[100px]">
                                {key}:
                              </span>
                              <span className="line-through text-muted-foreground">
                                {JSON.stringify(oldVal)}
                              </span>
                              <span className="text-primary">→</span>
                              <span>{JSON.stringify(newVal)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
