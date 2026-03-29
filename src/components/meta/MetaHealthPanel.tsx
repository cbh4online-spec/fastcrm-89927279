import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMetaConnections } from "@/hooks/useMetaConnections";
import { useMetaWebhookEvents } from "@/hooks/useMetaLeads";
import { CheckCircle2, XCircle, AlertTriangle, Activity, RefreshCw, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function MetaHealthPanel() {
  const { currentWorkspace } = useWorkspace();
  const { data: connections = [], isLoading: loadingConns, refetch: refetchConns } = useMetaConnections();
  const { data: webhookEvents = [], isLoading: loadingEvents } = useMetaWebhookEvents();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const handleRunHealthCheck = async () => {
    if (!currentWorkspace?.id) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-health-check", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      toast.success(`Health check concluído: ${data?.checked || 0} ligações verificadas`);
      refetchConns();
    } catch (err) {
      toast.error("Falha no health check");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Health & Logs</h2>
          <p className="text-sm text-muted-foreground">Estado das ligações e log de webhooks</p>
        </div>
        <Button onClick={handleRunHealthCheck} disabled={checking} variant="outline">
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Verificar Saúde
        </Button>
      </div>

      {/* Connection Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado das Ligações</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConns && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          {!loadingConns && connections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ligação configurada</p>
          )}
          <div className="space-y-3">
            {connections.map((conn: any) => {
              const health = conn.health_details_json || {};
              return (
                <div key={conn.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {conn.health_status === "healthy" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : conn.health_status === "degraded" ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{conn.connection_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Último check: {conn.last_healthcheck_at ? new Date(conn.last_healthcheck_at).toLocaleString("pt-PT") : "Nunca"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={conn.status === "active" ? "default" : "destructive"}>{conn.status}</Badge>
                  </div>

                  {health && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">Token</span>
                        <p className={health.token_valid ? "text-green-600" : "text-red-600"}>
                          {health.token_valid ? "Válido" : "Inválido"}
                        </p>
                      </div>
                      {health.token_expires_in_days != null && (
                        <div className="p-2 rounded bg-muted/30">
                          <span className="text-muted-foreground">Expira em</span>
                          <p className={health.token_expires_in_days < 7 ? "text-yellow-600" : ""}>
                            {health.token_expires_in_days} dias
                          </p>
                        </div>
                      )}
                      <div className="p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">Permissões</span>
                        <p className={health.permissions_ok ? "text-green-600" : "text-yellow-600"}>
                          {health.permissions_ok ? "OK" : "Incompletas"}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">API</span>
                        <p className={health.api_reachable ? "text-green-600" : "text-red-600"}>
                          {health.api_reachable ? "Acessível" : "Inacessível"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Webhook Events ({webhookEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Data</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Evento</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Assinatura</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Estado</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingEvents && (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                )}
                {!loadingEvents && webhookEvents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhum evento registado</td></tr>
                )}
                {webhookEvents.map((event: any) => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-xs">
                      {new Date(event.created_at).toLocaleString("pt-PT")}
                    </td>
                    <td className="p-3 text-xs">{event.object_type || "—"}</td>
                    <td className="p-3 text-xs">{event.event_type || "—"}</td>
                    <td className="p-3">
                      {event.signature_valid ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={event.processing_status === "processed" ? "default" : event.processing_status === "failed" ? "destructive" : "secondary"} className="text-xs">
                        {event.processing_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(event)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span>{selectedEvent.object_type}</span></div>
                <div><span className="text-muted-foreground">Evento:</span> <span>{selectedEvent.event_type}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant="outline">{selectedEvent.processing_status}</Badge></div>
                <div><span className="text-muted-foreground">Assinatura:</span> <span>{selectedEvent.signature_valid ? "✅ Válida" : "❌ Inválida"}</span></div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Payload</h4>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                  {JSON.stringify(selectedEvent.payload_json, null, 2)}
                </pre>
              </div>
              {selectedEvent.error_message && (
                <div>
                  <h4 className="text-sm font-medium text-destructive mb-1">Erro</h4>
                  <p className="text-sm text-destructive">{selectedEvent.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
