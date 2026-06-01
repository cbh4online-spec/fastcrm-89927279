import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUp, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type DocType = "invoice" | "invoice_receipt" | "simplified_invoice" | "credit_note";

const LABELS: Record<DocType, string> = {
  invoice: "Fatura",
  invoice_receipt: "Fatura-recibo",
  simplified_invoice: "Fatura simplificada",
  credit_note: "Nota de crédito",
};

interface Props {
  invoiceId: string;
  externalProvider: string | null | undefined;
  externalUrl: string | null | undefined;
}

export function PushToInvoiceXpressButton({ invoiceId, externalProvider, externalUrl }: Props) {
  const [pending, setPending] = useState<DocType | null>(null);
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

  if (alreadyPushed && externalUrl) {
    return (
      <Button variant="outline" asChild>
        <a href={externalUrl} target="_blank" rel="noopener noreferrer">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
          Ver na InvoiceXpress
          <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
        </a>
      </Button>
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
