import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, Loader2, ExternalLink, AlertCircle, Check, Eye, MousePointerClick, CalendarClock, X, Repeat } from "lucide-react";
import { useInvoiceWhatsAppSends, type InvoiceWhatsAppSend } from "@/hooks/invoices/useInvoiceWhatsAppSends";
import {
  useInvoiceScheduledWhatsApp,
  useCancelScheduledWhatsApp,
  type InvoiceScheduledWhatsApp,
} from "@/hooks/invoices/useInvoiceScheduledWhatsApp";
import { formatPhone } from "@/utils/phone";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  invoiceId: string;
}

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  clicked: "Clicado",
  failed: "Falhou",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "secondary",
  delivered: "default",
  read: "default",
  clicked: "default",
  failed: "destructive",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "delivered":
      return <Check className="w-3 h-3" />;
    case "read":
      return <Eye className="w-3 h-3" />;
    case "clicked":
      return <MousePointerClick className="w-3 h-3" />;
    case "failed":
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <MessageCircle className="w-3 h-3" />;
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM HH:mm", { locale: pt });
  } catch {
    return iso;
  }
}

function Row({ s }: { s: InvoiceWhatsAppSend }) {
  return (
    <div className="border rounded-md p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={STATUS_VARIANT[s.status] ?? "outline"} className="gap-1 capitalize">
            <StatusIcon status={s.status} />
            {STATUS_LABEL[s.status] ?? s.status}
          </Badge>
          <span className="font-mono text-xs truncate">
            {formatPhone(s.phone, "PT")}
          </span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(s.sent_at)}
        </span>
      </div>

      {(s.delivered_at || s.read_at || s.clicked_at) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {s.delivered_at && <span>Entregue: {fmtDate(s.delivered_at)}</span>}
          {s.read_at && <span>Lido: {fmtDate(s.read_at)}</span>}
          {s.clicked_at && <span>Clicado: {fmtDate(s.clicked_at)}</span>}
        </div>
      )}

      {s.status === "failed" && s.error_message && (
        <p className="text-xs text-destructive break-words">{s.error_message}</p>
      )}

      {s.share_url && (
        <a
          href={s.share_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Abrir link partilhado
        </a>
      )}

      {s.message_text && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver mensagem
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans bg-muted/40 rounded p-2">
            {s.message_text}
          </pre>
        </details>
      )}
    </div>
  );
}

function ScheduledRow({
  s,
  onCancel,
  cancelling,
}: {
  s: InvoiceScheduledWhatsApp;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const recurrence = (s.metadata?.recurrence as string) ?? "none";
  const recurrenceLabel: Record<string, string> = {
    none: "",
    daily: "diária",
    weekly: "semanal",
    monthly: "mensal",
  };
  return (
    <div className="border border-dashed rounded-md p-3 space-y-2 text-sm bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="gap-1">
            <CalendarClock className="w-3 h-3" />
            Agendado
          </Badge>
          {recurrence !== "none" && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Repeat className="w-3 h-3" />
              {recurrenceLabel[recurrence]}
            </Badge>
          )}
          <span className="font-mono text-xs truncate">{formatPhone(s.to_phone, "PT")}</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onCancel(s.id)}
          disabled={cancelling}
          title="Cancelar agendamento"
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        Envio previsto: <span className="font-medium text-foreground">{fmtDate(s.scheduled_at)}</span>
      </div>
      {s.metadata?.title && (
        <div className="text-xs text-muted-foreground">Título: {String(s.metadata.title)}</div>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver mensagem
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words font-sans bg-muted/40 rounded p-2">
          {s.body}
        </pre>
      </details>
    </div>
  );
}

export function InvoiceWhatsAppHistoryCard({ invoiceId }: Props) {
  const { data, isLoading, isFetching, refetch } = useInvoiceWhatsAppSends(invoiceId);
  const { data: scheduledData, refetch: refetchSched, isFetching: schedFetching } =
    useInvoiceScheduledWhatsApp(invoiceId);
  const cancelMut = useCancelScheduledWhatsApp();
  const sends = data ?? [];
  const scheduled = scheduledData ?? [];

  const handleCancel = async (id: string) => {
    try {
      await cancelMut.mutateAsync({ id, invoiceId });
      toast.success("Agendamento cancelado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar");
    }
  };

  const refresh = () => {
    refetch();
    refetchSched();
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          Envios por WhatsApp
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          onClick={refresh}
          disabled={isFetching || schedFetching}
          title="Actualizar"
        >
          {isFetching || schedFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduled.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Agendados ({scheduled.length})
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {scheduled.map((s) => (
                <ScheduledRow
                  key={s.id}
                  s={s}
                  onCancel={handleCancel}
                  cancelling={cancelMut.isPending}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {scheduled.length > 0 && (
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Histórico
            </p>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> A carregar histórico…
            </div>
          ) : sends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {scheduled.length > 0
                ? "Ainda não há envios concluídos."
                : "Ainda não foram registados envios por WhatsApp para esta fatura."}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sends.map((s) => (
                <Row key={s.id} s={s} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
