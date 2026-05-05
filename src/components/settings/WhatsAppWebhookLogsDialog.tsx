import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useWhatsAppWebhookLogs } from "@/hooks/useWhatsAppOps";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function WhatsAppWebhookLogsDialog({ open, onOpenChange }: Props) {
  const { data: logs, isLoading } = useWhatsAppWebhookLogs(50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atividade do canal WhatsApp</DialogTitle>
          <DialogDescription>
            Últimos 50 eventos recebidos. Útil para confirmar que tudo está a chegar em tempo real.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[450px] pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Ainda não foram recebidos eventos. Envia uma mensagem para o número conectado para validar.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {log.processed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Badge variant="outline" className="text-xs">{log.event_type || "evento"}</Badge>
                      {log.processing_ms != null && (
                        <span className="text-xs text-muted-foreground">{log.processing_ms}ms</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  {log.error_message && (
                    <div className="text-xs text-destructive mb-1">{log.error_message}</div>
                  )}
                  <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto max-h-32">
                    {JSON.stringify(log.payload, null, 2).slice(0, 600)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
