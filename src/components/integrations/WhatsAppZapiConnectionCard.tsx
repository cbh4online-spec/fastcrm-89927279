import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, CheckCircle, Loader2, QrCode, XCircle, AlertTriangle, Clock, WifiOff,
  RefreshCw, Send, Activity, Webhook,
} from "lucide-react";
import {
  useWhatsAppZapiConnection,
  useDisconnectWhatsAppZapi,
  useStatusWhatsAppZapi,
  type ZapiStatus,
} from "@/hooks/useWhatsAppZapiConnection";
import { useWhatsAppConfigureWebhook } from "@/hooks/useWhatsAppOps";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState } from "react";
import { WhatsAppZapiQRDialog } from "@/components/settings/WhatsAppZapiQRDialog";
import { WhatsAppTestSendDialog } from "@/components/settings/WhatsAppTestSendDialog";
import { WhatsAppWebhookLogsDialog } from "@/components/settings/WhatsAppWebhookLogsDialog";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_CONFIG: Record<ZapiStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  icon: React.ReactNode;
}> = {
  not_configured: { label: "Não configurado", variant: "secondary", icon: <WifiOff className="h-3 w-3 mr-1" /> },
  creating_instance: { label: "A criar instância...", variant: "outline", className: "border-blue-300 text-blue-700", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  qr_pending: { label: "À espera de QR", variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50", icon: <QrCode className="h-3 w-3 mr-1" /> },
  waiting_for_scan: { label: "A aguardar leitura do QR", variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50", icon: <Clock className="h-3 w-3 mr-1" /> },
  authenticating: { label: "A autenticar...", variant: "outline", className: "border-blue-400 text-blue-700 bg-blue-50", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  connected: { label: "Conectado", variant: "default", className: "bg-emerald-500 text-white", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
  disconnected: { label: "Desconectado", variant: "secondary", icon: <WifiOff className="h-3 w-3 mr-1" /> },
  qr_expired: { label: "QR expirado", variant: "outline", className: "border-orange-400 text-orange-700 bg-orange-50", icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  reconnecting: { label: "A reconectar...", variant: "outline", className: "border-blue-400 text-blue-700 bg-blue-50", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  error: { label: "Erro de ligação", variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
};

export function WhatsAppZapiConnectionCard() {
  const { data: conn, isLoading } = useWhatsAppZapiConnection();
  const disconnect = useDisconnectWhatsAppZapi();
  const refreshStatus = useStatusWhatsAppZapi();
  const configureWebhook = useWhatsAppConfigureWebhook();
  const { isSuperAdmin } = useWorkspace();
  const [showQR, setShowQR] = useState(false);
  const [showTestSend, setShowTestSend] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const status: ZapiStatus = (conn?.status as ZapiStatus) || "not_configured";
  const isConnected = status === "connected";
  const isTransitional = ["creating_instance", "qr_pending", "waiting_for_scan", "authenticating", "reconnecting"].includes(status);
  const cfg = STATUS_CONFIG[status];

  const webhookConfigured = !!conn?.webhook_configured;
  const webhookLastReceived = conn?.webhook_last_received_at ?? null;
  const webhookLastError = conn?.webhook_last_error ?? null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const phoneDisplay = conn?.phone_number
    ? `+${conn.phone_number}`
    : isConnected
      ? "Número não identificado"
      : "—";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? "bg-emerald-500/10" : "bg-muted"}`}>
              <Phone className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">WhatsApp</CardTitle>
              <CardDescription>
                Cada conversa pode virar uma venda — responda com contexto, IA e velocidade.
              </CardDescription>
            </div>
            <Badge variant={cfg.variant} className={cfg.className}>
              {cfg.icon}
              {cfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isConnected || status === "disconnected" || status === "error") && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Número:</span>
                <span className="text-sm font-medium">{phoneDisplay}</span>
              </div>
              {conn?.connected_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conectado desde:</span>
                  <span className="text-sm">{new Date(conn.connected_at).toLocaleDateString("pt-PT")}</span>
                </div>
              )}
              {conn?.last_seen_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última atividade:</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(conn.last_seen_at), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Webhook:</span>
                {webhookConfigured ? (
                  <Badge className="bg-emerald-500 text-white text-xs">Ativo</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-orange-400 text-orange-700 text-xs">
                      Não configurado
                    </Badge>
                    {isSuperAdmin && isConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => configureWebhook.mutate()}
                        disabled={configureWebhook.isPending}
                      >
                        {configureWebhook.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Webhook className="h-3 w-3" />
                        )}
                        Configurar
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {webhookLastReceived && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última receção:</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(webhookLastReceived), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              )}
              {webhookLastError && (
                <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                  Último erro: {webhookLastError}
                </div>
              )}
              {conn?.last_error && status === "error" && (
                <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                  {conn.last_error}
                </div>
              )}
            </div>
          )}

          {isTransitional && (
            <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-xs text-muted-foreground mt-1">O estado actualiza automaticamente</p>
              </div>
            </div>
          )}

          {status === "not_configured" && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Transforme mensagens em oportunidades.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Receba e responda mensagens no inbox unificado</li>
                <li>IA classifica intenção, urgência e temperatura do lead</li>
                <li>Crie contactos e oportunidades automaticamente</li>
                <li>Nunca perca um lead quente</li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isConnected && !isTransitional && (
              <Button onClick={() => setShowQR(true)} className="gap-1.5">
                <QrCode className="h-4 w-4" />
                {status === "qr_expired" ? "Gerar novo QR" : "Conectar WhatsApp"}
              </Button>
            )}

            {isTransitional && (
              <Button variant="outline" onClick={() => setShowQR(true)} className="gap-1.5">
                <QrCode className="h-4 w-4" />
                Ver QR Code
              </Button>
            )}

            {(isConnected || status === "disconnected" || status === "error") && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshStatus.mutate()}
                  disabled={refreshStatus.isPending}
                  className="gap-1.5"
                >
                  {refreshStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Atualizar estado
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTestSend(true)}
                  disabled={!isConnected}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Enviar teste
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogs(true)}
                  className="gap-1.5"
                >
                  <Activity className="h-4 w-4" />
                  Ver atividade
                </Button>
              </>
            )}

            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <WhatsAppZapiQRDialog open={showQR} onOpenChange={setShowQR} />
      <WhatsAppTestSendDialog open={showTestSend} onOpenChange={setShowTestSend} />
      <WhatsAppWebhookLogsDialog open={showLogs} onOpenChange={setShowLogs} />
    </>
  );
}
