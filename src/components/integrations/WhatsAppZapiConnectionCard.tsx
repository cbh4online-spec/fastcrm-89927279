import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, Loader2, QrCode, XCircle, AlertTriangle, Clock, WifiOff } from "lucide-react";
import {
  useWhatsAppZapiConnection,
  useDisconnectWhatsAppZapi,
  type ZapiStatus,
} from "@/hooks/useWhatsAppZapiConnection";
import { useState } from "react";
import { WhatsAppZapiQRDialog } from "@/components/settings/WhatsAppZapiQRDialog";

const STATUS_CONFIG: Record<ZapiStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  icon: React.ReactNode;
}> = {
  not_configured: { label: "Não configurado", variant: "secondary", icon: <WifiOff className="h-3 w-3 mr-1" /> },
  creating_instance: { label: "A criar instância...", variant: "outline", className: "border-blue-300 text-blue-700", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  qr_pending: { label: "QR pendente", variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50", icon: <QrCode className="h-3 w-3 mr-1" /> },
  waiting_for_scan: { label: "A aguardar scan", variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50", icon: <Clock className="h-3 w-3 mr-1" /> },
  authenticating: { label: "A autenticar...", variant: "outline", className: "border-blue-400 text-blue-700 bg-blue-50", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  connected: { label: "Conectado", variant: "default", className: "bg-emerald-500 text-white", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
  disconnected: { label: "Desconectado", variant: "secondary", icon: <WifiOff className="h-3 w-3 mr-1" /> },
  qr_expired: { label: "QR expirado", variant: "outline", className: "border-orange-400 text-orange-700 bg-orange-50", icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  reconnecting: { label: "A reconectar...", variant: "outline", className: "border-blue-400 text-blue-700 bg-blue-50", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
  error: { label: "Erro", variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
};

export function WhatsAppZapiConnectionCard() {
  const { data: conn, isLoading } = useWhatsAppZapiConnection();
  const disconnect = useDisconnectWhatsAppZapi();
  const [showQR, setShowQR] = useState(false);

  const status: ZapiStatus = (conn?.status as ZapiStatus) || "not_configured";
  const isConnected = status === "connected";
  const isTransitional = ["creating_instance", "qr_pending", "waiting_for_scan", "authenticating", "reconnecting"].includes(status);
  const cfg = STATUS_CONFIG[status];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? "bg-emerald-500/10" : "bg-muted"}`}>
              <Phone className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">WhatsApp (Z-API)</CardTitle>
              <CardDescription>
                Receba e envie mensagens via Z-API — suporte a grupos, botões e mídia.
                {conn?.account_mode === "byo" && <span className="ml-1 text-xs">(Credenciais próprias)</span>}
              </CardDescription>
            </div>
            <Badge variant={cfg.variant} className={cfg.className}>
              {cfg.icon}
              {cfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Número:</span>
                <span className="text-sm font-medium">{conn?.phone_number ? `+${conn.phone_number}` : "N/A"}</span>
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
                  <span className="text-sm">{new Date(conn.last_seen_at).toLocaleString("pt-PT")}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modo:</span>
                <Badge variant="outline" className="text-xs">
                  {conn?.account_mode === "byo" ? "BYO (próprias)" : "Master (gerido)"}
                </Badge>
              </div>
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

          {status === "error" && conn?.last_error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {conn.last_error}
            </div>
          )}

          {status === "not_configured" && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ao conectar via Z-API, poderá:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Receber e responder mensagens no inbox unificado</li>
                <li>Gerir conversas em grupos do WhatsApp</li>
                <li>Enviar botões interativos e mídia (imagens, documentos, áudio)</li>
                <li>Usar conta Z-API gerida pela plataforma ou as suas próprias credenciais</li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isConnected && !isTransitional && (
              <Button onClick={() => setShowQR(true)} className="gap-1.5">
                <QrCode className="h-4 w-4" />
                {status === "qr_expired" ? "Gerar novo QR" : "Conectar via QR Code"}
              </Button>
            )}

            {isTransitional && (
              <Button variant="outline" onClick={() => setShowQR(true)} className="gap-1.5">
                <QrCode className="h-4 w-4" />
                Ver QR Code
              </Button>
            )}

            {isConnected && (
              <Button
                variant="outline"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="gap-1.5"
              >
                {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <WhatsAppZapiQRDialog open={showQR} onOpenChange={setShowQR} />
    </>
  );
}
