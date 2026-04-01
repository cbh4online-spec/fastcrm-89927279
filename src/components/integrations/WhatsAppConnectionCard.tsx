import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, Loader2, QrCode, RefreshCw, XCircle, AlertTriangle, Clock, Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import {
  useWhatsAppQRConnection,
  useSyncWhatsAppQR,
  useDisconnectWhatsAppQR,
  type WhatsAppQRStatus,
  type WhatsAppSyncHealth,
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

const SYNC_HEALTH_CONFIG: Record<WhatsAppSyncHealth, {
  label: string;
  className: string;
  icon: React.ReactNode;
}> = {
  active: {
    label: "Sync Ativo",
    className: "bg-emerald-500 text-white",
    icon: <Activity className="h-3 w-3 mr-1" />,
  },
  delayed: {
    label: "Sync Atrasado",
    className: "bg-amber-500 text-white",
    icon: <Clock className="h-3 w-3 mr-1" />,
  },
  suspended: {
    label: "Sync Suspenso",
    className: "bg-orange-500 text-white",
    icon: <AlertTriangle className="h-3 w-3 mr-1" />,
  },
  degraded: {
    label: "Sync Degradado",
    className: "bg-amber-600 text-white",
    icon: <AlertCircle className="h-3 w-3 mr-1" />,
  },
  failed: {
    label: "Sync Falhou",
    className: "bg-destructive text-destructive-foreground",
    icon: <XCircle className="h-3 w-3 mr-1" />,
  },
  unknown: {
    label: "Sync Desconhecido",
    className: "bg-muted text-muted-foreground",
    icon: <AlertCircle className="h-3 w-3 mr-1" />,
  },
};

export function WhatsAppConnectionCard() {
  const { data: qrConnection, isLoading } = useWhatsAppQRConnection();
  const syncMutation = useSyncWhatsAppQR();
  const disconnectMutation = useDisconnectWhatsAppQR();
  const [showQRDialog, setShowQRDialog] = useState(false);

  const status: WhatsAppQRStatus = (qrConnection?.status as WhatsAppQRStatus) || "not_configured";
  const syncHealth: WhatsAppSyncHealth = (qrConnection?.sync_health as WhatsAppSyncHealth) || "unknown";
  const isConnected = status === "connected";
  const isTransitional = ["creating_instance", "qr_pending", "waiting_for_scan", "authenticating", "reconnecting"].includes(status);
  const statusCfg = STATUS_CONFIG[status];
  const syncCfg = SYNC_HEALTH_CONFIG[syncHealth];

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
          <div className={`p-2 rounded-lg ${isConnected && syncHealth === "active" ? "bg-green-500/10" : isConnected ? "bg-amber-500/10" : "bg-muted"}`}>
            <Phone className={`h-6 w-6 ${isConnected && syncHealth === "active" ? "text-green-600" : isConnected ? "text-amber-600" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">WhatsApp (QR Code)</CardTitle>
            <CardDescription>
              Receba e envie mensagens do WhatsApp via Evolution API
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant={statusCfg.variant} className={statusCfg.className}>
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
            {isConnected && (
              <Badge variant="outline" className={syncCfg.className}>
                {syncCfg.icon}
                {syncCfg.label}
              </Badge>
            )}
          </div>
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
            {qrConnection?.last_health_check_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última verificação:</span>
                <span className="text-sm">
                  {new Date(qrConnection.last_health_check_at).toLocaleString("pt-PT")}
                </span>
              </div>
            )}
            {qrConnection?.last_successful_sync_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último sync bem-sucedido:</span>
                <span className="text-sm">
                  {new Date(qrConnection.last_successful_sync_at).toLocaleString("pt-PT")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sync health warning */}
        {isConnected && syncHealth !== "active" && (
          <div className={`p-3 rounded-lg border text-sm ${
            syncHealth === "suspended" || syncHealth === "failed"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : syncHealth === "delayed" || syncHealth === "degraded"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {syncHealth === "suspended" && "Sincronização suspensa"}
                  {syncHealth === "delayed" && "Sincronização atrasada"}
                  {syncHealth === "degraded" && "Sincronização degradada"}
                  {syncHealth === "failed" && "Sincronização falhou"}
                  {syncHealth === "unknown" && "Estado de sincronização desconhecido"}
                </p>
                {qrConnection?.sync_issue_reason && (
                  <p className="mt-1 text-xs opacity-80">{qrConnection.sync_issue_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transitional states */}
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

          {/* Sync / Health Check */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Verificar saúde da conexão"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>

      <WhatsAppQRDialog open={showQRDialog} onOpenChange={setShowQRDialog} />
    </Card>
  );
}
