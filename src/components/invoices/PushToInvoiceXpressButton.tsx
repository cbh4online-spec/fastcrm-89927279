import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUp, ExternalLink, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

type DocType = "invoice" | "invoice_receipt" | "simplified_invoice" | "credit_note";

const LABELS: Record<DocType, string> = {
  invoice: "Fatura",
  invoice_receipt: "Fatura-recibo",
  simplified_invoice: "Fatura simplificada",
  credit_note: "Nota de crédito",
};

const STATE_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho na IX", variant: "secondary" },
  sent: { label: "Enviada na IX", variant: "default" },
  settled: { label: "Liquidada na IX", variant: "default" },
  final: { label: "Finalizada na IX", variant: "default" },
  partial: { label: "Pago parcial na IX", variant: "outline" },
  canceled: { label: "Cancelada na IX", variant: "destructive" },
  second_copy: { label: "2ª via na IX", variant: "outline" },
  deleted: { label: "Apagada na IX", variant: "destructive" },
};

interface Props {
  invoiceId: string;
  externalProvider: string | null | undefined;
  externalUrl: string | null | undefined;
  externalState?: string | null;
  externalSequenceNumber?: string | null;
  externalStateSyncedAt?: string | null;
}

export function PushToInvoiceXpressButton({
  invoiceId,
  externalProvider,
  externalUrl,
  externalState,
  externalSequenceNumber,
  externalStateSyncedAt,
}: Props) {
  const [pending, setPending] = useState<DocType | null>(null);
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();
  const alreadyPushed = externalProvider === "invoicexpress";

  async function push(documentType: DocType) {
    setPending(documentType);
    try {
      const { data, error } = await supabase.functions.invoke(
        "invoicexpress-push-document",
        { body: { invoice_id: invoiceId, document_type: documentType } },
      );
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; external_url?: string };
      if (!r.ok) throw new Error(r.error || "Falha ao enviar para a InvoiceXpress");
      toast.success(`${LABELS[documentType]} criada como rascunho na InvoiceXpress`, {
        action: r.external_url
          ? { label: "Abrir", onClick: () => window.open(r.external_url!, "_blank") }
          : undefined,
      });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro a enviar para a InvoiceXpress");
    } finally {
      setPending(null);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "invoicexpress-sync-document-state",
        { body: { invoice_id: invoiceId } },
      );
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; results?: Array<{ ok: boolean; state?: string; error?: string }> };
      if (!r.ok) throw new Error(r.error || "Falha ao sincronizar");
      const first = r.results?.[0];
      if (first?.ok) {
        const stateLabel = first.state ? STATE_LABEL[first.state]?.label || first.state : "atualizado";
        toast.success(`Estado sincronizado: ${stateLabel}`);
      } else {
        toast.message("Sem atualizações", { description: first?.error });
      }
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro a sincronizar com a InvoiceXpress");
    } finally {
      setSyncing(false);
    }
  }

  if (alreadyPushed && externalUrl) {
    const stateInfo = externalState ? STATE_LABEL[externalState] : null;
    return (
      <div className="flex items-center gap-2">
        {stateInfo && (
          <Badge variant={stateInfo.variant} className="hidden md:inline-flex">
            {stateInfo.label}
            {externalSequenceNumber ? ` · ${externalSequenceNumber}` : ""}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={sync}
          disabled={syncing}
          title={
            externalStateSyncedAt
              ? `Sincronizado ${formatDistanceToNow(new Date(externalStateSyncedAt), { addSuffix: true, locale: pt })}`
              : "Sincronizar estado da InvoiceXpress"
          }
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
        <Button variant="outline" asChild>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            Ver na InvoiceXpress
            <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending !== null}>
          {pending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileUp className="w-4 h-4 mr-2" />
          )}
          Enviar para InvoiceXpress
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Criar como rascunho</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(LABELS) as DocType[]).map((t) => (
          <DropdownMenuItem
            key={t}
            disabled={pending !== null}
            onClick={() => push(t)}
          >
            {LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
