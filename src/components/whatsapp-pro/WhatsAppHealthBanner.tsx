import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, X, WifiOff, QrCode, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useWhatsAppZapiConnection,
  useStatusWhatsAppZapi,
  type ZapiStatus,
} from "@/hooks/useWhatsAppZapiConnection";
import { useDismissWhatsAppHealthAlert } from "@/hooks/useWhatsAppHealth";

const ALERT_STATUSES: ZapiStatus[] = ["disconnected", "qr_expired", "error", "reconnecting"];

const COPY: Record<string, { title: string; sub: string; icon: React.ReactNode; tone: string; cta: string }> = {
  disconnected: {
    title: "WhatsApp desconectado",
    sub: "A linha está offline. As mensagens não estão a ser enviadas nem recebidas.",
    icon: <WifiOff className="h-4 w-4" />,
    tone: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
    cta: "Reconectar",
  },
  qr_expired: {
    title: "QR Code expirado",
    sub: "Volte a ler o código QR para retomar a sessão do WhatsApp.",
    icon: <QrCode className="h-4 w-4" />,
    tone: "bg-orange-500/10 border-orange-400/40 text-orange-900 dark:text-orange-200",
    cta: "Reabrir QR",
  },
  error: {
    title: "Erro de ligação WhatsApp",
    sub: "A monitorização detectou falhas consecutivas no provedor.",
    icon: <XCircle className="h-4 w-4" />,
    tone: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
    cta: "Diagnosticar",
  },
  reconnecting: {
    title: "WhatsApp a reconectar",
    sub: "A tentar restabelecer a sessão automaticamente.",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    tone: "bg-blue-500/10 border-blue-400/40 text-blue-900 dark:text-blue-200",
    cta: "Verificar agora",
  },
};

/**
 * Banner global de saúde do WhatsApp Pro.
 * - Mostra quando a ligação está em estado degradado e não foi dispensada.
 * - Permite refresh imediato do status ou ir para a página de configuração.
 */
export function WhatsAppHealthBanner() {
  const { data: conn } = useWhatsAppZapiConnection();
  const refresh = useStatusWhatsAppZapi();
  const dismiss = useDismissWhatsAppHealthAlert();
  const [hidden, setHidden] = useState(false);

  const visible = useMemo(() => {
    if (hidden || !conn) return false;
    const status = conn.status as ZapiStatus;
    if (!ALERT_STATUSES.includes(status)) return false;
    const dismissedUntil = (conn as any).health_alert_dismissed_until as string | null | undefined;
    if (dismissedUntil && new Date(dismissedUntil).getTime() > Date.now()) return false;
    return true;
  }, [conn, hidden]);

  if (!visible || !conn) return null;

  const status = conn.status as ZapiStatus;
  const copy = COPY[status] ?? COPY.error;

  return (
    <div className={`border-b ${copy.tone}`} role="alert">
      <div className="px-4 py-2 flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {copy.icon}
          <span className="font-medium truncate">{copy.title}</span>
          <span className="hidden md:inline text-xs opacity-80 truncate">— {copy.sub}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refresh.isPending ? "animate-spin" : ""}`} />
            Verificar
          </Button>
          <Button asChild size="sm" className="h-7">
            <Link to="/settings/integrations">{copy.cta}</Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              dismiss.mutate(4);
              setHidden(true);
            }}
            aria-label="Dispensar por 4 horas"
            title="Dispensar por 4 horas"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
