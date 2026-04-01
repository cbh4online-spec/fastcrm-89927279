import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, Loader2, QrCode, RefreshCw } from "lucide-react";
import { useWhatsAppQRConnection, useSyncWhatsAppQR } from "@/hooks/useWhatsAppQRConnection";
import { useState } from "react";
import { WhatsAppQRDialog } from "@/components/settings/WhatsAppQRDialog";

export function WhatsAppConnectionCard() {
  const { data: qrConnection, isLoading } = useWhatsAppQRConnection();
  const syncMutation = useSyncWhatsAppQR();
  const [showQRDialog, setShowQRDialog] = useState(false);

  const status = qrConnection?.status || "not_configured";
  const isConnected = status === "connected";

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
          {isConnected && (
            <Badge variant="default" className="bg-emerald-500 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          )}
          {status === "disconnected" && <Badge variant="secondary">Desconectado</Badge>}
          {status === "error" && <Badge variant="destructive">Erro</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ao conectar via QR Code, poderá:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Receber mensagens do WhatsApp no inbox</li>
                <li>Responder a clientes diretamente</li>
                <li>Ver histórico de conversas</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowQRDialog(true)} className="gap-1.5">
                <QrCode className="h-4 w-4" />
                Conectar via QR Code
              </Button>
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
          </div>
        )}
      </CardContent>

      <WhatsAppQRDialog open={showQRDialog} onOpenChange={setShowQRDialog} />
    </Card>
  );
}
