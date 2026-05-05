import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, QrCode, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Info } from "lucide-react";
import {
  useWhatsAppZapiConnection,
  useConnectWhatsAppZapi,
  useStatusWhatsAppZapi,
  type ZapiStatus,
} from "@/hooks/useWhatsAppZapiConnection";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

// Z-API Instance ID: alphanumeric, geralmente 30+ chars (ex: 3D1A...)
const byoSchema = z.object({
  instanceId: z
    .string()
    .trim()
    .min(1, { message: "Instance ID é obrigatório" })
    .min(20, { message: "Instance ID parece curto demais (mín. 20 caracteres)" })
    .max(64, { message: "Instance ID demasiado longo (máx. 64 caracteres)" })
    .regex(/^[A-Za-z0-9]+$/, { message: "Apenas letras e números, sem espaços" }),
  instanceToken: z
    .string()
    .trim()
    .min(1, { message: "Instance Token é obrigatório" })
    .min(20, { message: "Token parece curto demais (mín. 20 caracteres)" })
    .max(128, { message: "Token demasiado longo (máx. 128 caracteres)" })
    .regex(/^[A-Za-z0-9]+$/, { message: "Apenas letras e números, sem espaços" }),
  clientToken: z
    .string()
    .trim()
    .min(1, { message: "Client-Token é obrigatório" })
    .min(20, { message: "Client-Token parece curto demais (mín. 20 caracteres)" })
    .max(128, { message: "Client-Token demasiado longo (máx. 128 caracteres)" })
    .regex(/^[A-Za-z0-9]+$/, { message: "Apenas letras e números, sem espaços" }),
});

type ByoErrors = Partial<Record<"instanceId" | "instanceToken" | "clientToken", string>>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRANSITIONAL: ZapiStatus[] = ["creating_instance", "qr_pending", "waiting_for_scan", "authenticating", "reconnecting"];

export function WhatsAppZapiQRDialog({ open, onOpenChange }: Props) {
  const { data: conn } = useWhatsAppZapiConnection();
  const connect = useConnectWhatsAppZapi();
  const refreshStatus = useStatusWhatsAppZapi();

  const [byoMode, setByoMode] = useState(false);
  const [byo, setByo] = useState({ instanceId: "", instanceToken: "", clientToken: "" });
  const [requiresByo, setRequiresByo] = useState(false);

  const status = (conn?.status as ZapiStatus) || "not_configured";
  const qr = conn?.qr_code;
  const isConnected = status === "connected";
  const isTransitional = TRANSITIONAL.includes(status);

  // Auto-refresh QR / status while dialog open
  useEffect(() => {
    if (!open) return;
    if (!isTransitional) return;
    const interval = setInterval(() => refreshStatus.mutate(), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isTransitional]);

  // Close on success
  useEffect(() => {
    if (open && isConnected) {
      const t = setTimeout(() => onOpenChange(false), 1500);
      return () => clearTimeout(t);
    }
  }, [open, isConnected, onOpenChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) setRequiresByo(false);
  }, [open]);

  const handleConnectMaster = () => {
    connect.mutate(undefined, {
      onError: (err: Error & { requires_byo?: boolean }) => {
        if (err.requires_byo) {
          setRequiresByo(true);
          setByoMode(true);
        }
      },
    });
  };
  const handleConnectByo = () => {
    if (!byo.instanceId || !byo.instanceToken || !byo.clientToken) return;
    connect.mutate(byo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar WhatsApp via Z-API
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com o WhatsApp do seu telemóvel para autorizar a sessão.
          </DialogDescription>
        </DialogHeader>

        {isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
            <p className="font-semibold">WhatsApp conectado!</p>
            {conn?.phone_number && <p className="text-sm text-muted-foreground">+{conn.phone_number}</p>}
          </div>
        ) : (
          <Tabs value={byoMode ? "byo" : "master"} onValueChange={(v) => setByoMode(v === "byo")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="master">Automático</TabsTrigger>
              <TabsTrigger value="byo">Credenciais próprias</TabsTrigger>
            </TabsList>

            <TabsContent value="master" className="space-y-4 pt-4">
              {requiresByo && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-2 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Modo automático indisponível</p>
                    <p className="text-xs">A conta master não pode criar novas instâncias agora. Use o separador <strong>Credenciais próprias</strong> com uma instância criada no painel Z-API.</p>
                  </div>
                </div>
              )}

              {!conn?.instance_id && !requiresByo && (
                <Button onClick={handleConnectMaster} disabled={connect.isPending} className="w-full">
                  {connect.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Criar instância e gerar QR
                </Button>
              )}

              {conn?.instance_id && conn?.account_mode === "master" && (
                <QrPanel qr={qr} status={status} onRefresh={() => refreshStatus.mutate()} refreshing={refreshStatus.isPending} />
              )}
            </TabsContent>

            <TabsContent value="byo" className="space-y-3 pt-4">
              <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>Crie uma instância em <a href="https://app.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">app.z-api.io <ExternalLink className="h-3 w-3" /></a> e copie estes 3 valores do painel da instância.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">Instance ID</Label>
                <Input id="instanceId" value={byo.instanceId} onChange={(e) => setByo((s) => ({ ...s, instanceId: e.target.value }))} placeholder="3D..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceToken">Instance Token</Label>
                <Input id="instanceToken" type="password" value={byo.instanceToken} onChange={(e) => setByo((s) => ({ ...s, instanceToken: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientToken">Client-Token (Account Security Token)</Label>
                <Input id="clientToken" type="password" value={byo.clientToken} onChange={(e) => setByo((s) => ({ ...s, clientToken: e.target.value }))} />
              </div>
              <Button
                onClick={handleConnectByo}
                disabled={connect.isPending || !byo.instanceId || !byo.instanceToken || !byo.clientToken}
                className="w-full"
              >
                {connect.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                Validar e gerar QR
              </Button>

              {conn?.instance_id && conn?.account_mode === "byo" && (
                <QrPanel qr={qr} status={status} onRefresh={() => refreshStatus.mutate()} refreshing={refreshStatus.isPending} />
              )}
            </TabsContent>
          </Tabs>
        )}

        {conn?.last_error && status === "error" && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{conn.last_error}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QrPanel({
  qr,
  status,
  onRefresh,
  refreshing,
}: {
  qr: string | null | undefined;
  status: ZapiStatus;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center bg-muted/50 rounded-lg p-4 min-h-[280px]">
        {qr ? (
          <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code Z-API" className="w-64 h-64" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs">A gerar QR Code...</p>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {status === "waiting_for_scan" || status === "qr_pending"
          ? "WhatsApp → Aparelhos conectados → Conectar um aparelho"
          : status === "authenticating"
          ? "QR lido — a autenticar..."
          : status === "qr_expired"
          ? "QR expirado — gere novo"
          : "Aguarde..."}
      </p>

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="w-full">
        {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
        Atualizar QR
      </Button>
    </div>
  );
}
