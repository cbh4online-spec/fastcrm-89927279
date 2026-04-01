import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, Loader2, QrCode, RefreshCw, XCircle, AlertTriangle, Clock, Wifi, WifiOff } from "lucide-react";
import {
  useWhatsAppQRConnection,
  useSyncWhatsAppQR,
  useDisconnectWhatsAppQR,
  type WhatsAppQRStatus,
} from "@/hooks/useWhatsAppQRConnection";
import { useState } from "react";
import { WhatsAppQRDialog } from "@/components/settings/WhatsAppQRDialog";

const STATUS_CONFIG: Record<WhatsAppQRStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  icon: React.ReactNode;
}> = {
  not_configured: {
    label: "Não configurado",
    variant: "secondary",
    icon: <WifiOff className="h-3 w-3 mr-1" />,
  },
  creating_instance: {
    label: "A criar instância...",
    variant: "outline",
    className: "border-blue-300 text-blue-700",
    icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
  },
  qr_pending: {
    label: "QR pendente",
    variant: "outline",
    className: "border-yellow-400 text-yellow-700 bg-yellow-50",
    icon: <QrCode className="h-3 w-3 mr-1" />,
  },
  waiting_for_scan: {
    label: "A aguardar scan",
    variant: "outline",
    className: "border-yellow-400 text-yellow-700 bg-yellow-50",
    icon: <Clock className="h-3 w-3 mr-1" />,
  },
  authenticating: {
    label: "A autenticar...",
    variant: "outline",
    className: "border-blue-400 text-blue-700 bg-blue-50",
    icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
  },
  connected: {
    label: "Conectado",
    variant: "default",
    className: "bg-emerald-500 text-white",
    icon: <CheckCircle className="h-3 w-3 mr-1" />,
  },
  disconnected: {
    label: "Desconectado",
    variant: "secondary",
    icon: <WifiOff className="h-3 w-3 mr-1" />,
  },
  qr_expired: {
    label: "QR expirado",
    variant: "outline",
    className: "border-orange-400 text-orange-700 bg-orange-50",
    icon: <AlertTriangle className="h-3 w-3 mr-1" />,
  },
  reconnecting: {
    label: "A reconectar...",
    variant: "outline",
    className: "border-blue-400 text-blue-700 bg-blue-50",
    icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
  },
  error: {
    label: "Erro",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3 mr-1" />,
  },
};

export function WhatsAppConnectionCard() {
  const { data: qrConnection, isLoading } = useWhatsAppQRConnection();
  const syncMutation = useSyncWhatsAppQR();
  const disconnectMutation = useDisconnectWhatsAppQR();
  const [showQRDialog, setShowQRDialog] = useState(false);

  const status: WhatsAppQRStatus = (qrConnection?.status as WhatsAppQRStatus) || "not_configured";
  const isConnected = status === "connected";
  const isTransitional = ["creating_instance", "qr_pending", "waiting_for_scan", "authenticating", "reconnecting"].includes(status);
  const statusCfg = STATUS_CONFIG[status];

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? "bg-green-500/10" : "bg-muted"}`}>
            <Phone className={`h-6 w-6 ${isConnected ? "text-green-600" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">WhatsApp (QR Code)</CardTitle>
            <CardDescription>
              Receba e envie mensagens do WhatsApp via Evolution API
            </CardDescription>
          </div>
          <Badge variant={statusCfg.variant} className={statusCfg.className}>
            {statusCfg.icon}
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected state — show info */}
        {isConnected && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Número conectado:</span>
              <span className="text-sm font-medium">
                {qrConnection?.phone_number ? `+${qrConnection.phone_number}` : "N/A"}
              </span>
            </div>
            {qrConnection?.connected_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conectado desde:</span>
                <span className="text-sm">
                  {new Date(qrConnection.connected_at).toLocaleDateString("pt-PT")}
                </span>
              </div>
            )}
            {qrConnection?.last_seen_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última sincronização:</span>
                <span className="text-sm">
                  {new Date(qrConnection.last_seen_at).toLocaleString("pt-PT")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Transitional states — show progress message */}
        {isTransitional && (
          <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {status === "waiting_for_scan" || status === "qr_pending"
                  ? "Abra o QR Code e leia com o WhatsApp no telemóvel"
                  : status === "creating_instance"
                  ? "A preparar a instância WhatsApp..."
                  : status === "authenticating"
                  ? "QR lido, a autenticar sessão..."
                  : "A tentar reconectar..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">O estado actualiza automaticamente</p>
            </div>
          </div>
        )}

        {/* QR expired */}
        {status === "qr_expired" && (
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
            O QR Code expirou. Gere um novo para conectar.
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {qrConnection?.last_error || "Ocorreu um erro na conexão WhatsApp."}
          </div>
        )}

        {/* Disconnected info */}
        {status === "disconnected" && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>A sessão WhatsApp foi desconectada. Pode reconectar ou gerar um novo QR.</p>
          </div>
        )}

        {/* Not configured info */}
        {status === "not_configured" && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Ao conectar via QR Code, poderá:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Receber mensagens do WhatsApp no inbox</li>
              <li>Responder a clientes diretamente</li>
              <li>Ver histórico de conversas</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Connect / Open QR — show when not connected and not in creating state */}
          {!isConnected && status !== "creating_instance" && status !== "authenticating" && status !== "reconnecting" && (
            <Button onClick={() => setShowQRDialog(true)} className="gap-1.5">
              <QrCode className="h-4 w-4" />
              {status === "waiting_for_scan" || status === "qr_pending"
                ? "Abrir QR Code"
                : status === "qr_expired"
                ? "Gerar novo QR"
                : "Conectar via QR Code"}
            </Button>
          )}

          {/* Disconnect — only when connected */}
          {isConnected && (
            <Button
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="gap-1.5"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              Desconectar
            </Button>
          )}

          {/* Sync — always available */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Sincronizar estado"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>

      <WhatsAppQRDialog open={showQRDialog} onOpenChange={setShowQRDialog} />
    </Card>
  );
}
