import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, MessageCircle, FileText, Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatEur } from "../lib/collectionsFormat";
import { useAccountStatement } from "../hooks/useAccountStatement";
import { toE164 } from "@/utils/phone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  workspaceId: string | undefined;
  companyId: string | null | undefined;
  contactId: string | null | undefined;
  debtorName: string;
  debtorEmail: string | null | undefined;
  debtorPhone: string | null | undefined;
}

const DEFAULT_MSG =
  "Caro cliente,\n\nEnviamos em anexo o extrato atualizado da sua conta. Solicitamos a regularização dos valores em dívida assinalados.\n\nFicamos disponíveis para qualquer esclarecimento.";

export function SendStatementDialog({
  open, onOpenChange, caseId, workspaceId, companyId, contactId,
  debtorName, debtorEmail, debtorPhone,
}: Props) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState(debtorEmail ?? "");
  const [phone, setPhone] = useState(debtorPhone ?? "");
  const [message, setMessage] = useState(DEFAULT_MSG);

  const { data: statement, isLoading } = useAccountStatement({
    workspaceId, companyId, contactId, enabled: open,
  });

  // Re-inicializa quando o diálogo abre
  useMemo(() => {
    if (open) {
      setEmail(debtorEmail ?? "");
      setPhone(debtorPhone ?? "");
    }
  }, [open, debtorEmail, debtorPhone]);

  const sendEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-account-statement", {
        body: { caseId, recipientEmail: email.trim(), customMessage: message.trim() },
      });
      if (error) throw error;
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Extrato enviado por email");
      qc.invalidateQueries({ queryKey: ["case-actions", caseId] });
      qc.invalidateQueries({ queryKey: ["collection-case", caseId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Falha ao enviar: " + e.message),
  });

  const registerWhatsAppAction = useMutation({
    mutationFn: async (payload: { phone: string; summary: string }) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { error } = await supabase.from("collection_actions").insert({
        workspace_id: workspaceId,
        case_id: caseId,
        action_type: "whatsapp_sent",
        channel: "whatsapp",
        subject: "Extrato de conta enviado via WhatsApp",
        body: payload.summary,
        outcome: "sent",
        is_automated: false,
        metadata: {
          kind: "account_statement",
          recipient_phone: payload.phone,
          total_outstanding: statement?.totalOutstanding ?? 0,
        },
      });
      if (error) throw error;
      await supabase
        .from("collection_cases")
        .update({ last_action_at: new Date().toISOString() })
        .eq("id", caseId);
    },
    onSuccess: () => {
      toast.success("WhatsApp aberto e ação registada");
      qc.invalidateQueries({ queryKey: ["case-actions", caseId] });
      qc.invalidateQueries({ queryKey: ["collection-case", caseId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Falha ao registar: " + e.message),
  });

  const buildWhatsAppText = () => {
    if (!statement) return message;
    const lines: string[] = [];
    lines.push(`*Extrato de conta — ${debtorName}*`);
    lines.push("");
    if (message.trim()) {
      lines.push(message.trim());
      lines.push("");
    }
    lines.push(`Total faturado: ${formatEur(statement.totalInvoiced)}`);
    lines.push(`Total pago: ${formatEur(statement.totalPaid)}`);
    lines.push(`*Saldo em dívida: ${formatEur(statement.totalOutstanding)}*`);
    lines.push("");
    const open = statement.invoices.filter((i) => i.total - i.amount_paid > 0.005);
    if (open.length > 0) {
      lines.push(`Faturas em aberto (${open.length}):`);
      open.slice(0, 15).forEach((i) => {
        const rem = i.total - i.amount_paid;
        lines.push(`• ${i.invoice_number} · venc. ${i.due_date} · ${formatEur(rem)}`);
      });
      if (open.length > 15) lines.push(`… e mais ${open.length - 15} fatura(s).`);
    }
    return lines.join("\n");
  };

  const handleWhatsApp = () => {
    const e164 = toE164(phone, "PT");
    if (!e164) {
      toast.error("Número de telefone inválido");
      return;
    }
    const text = buildWhatsAppText();
    const url = `https://wa.me/${e164.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    registerWhatsAppAction.mutate({ phone: e164, summary: text });
  };

  const canSendEmail = !!email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSendWhatsApp = !!phone.trim();
  const isBusy = sendEmail.isPending || registerWhatsAppAction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Enviar extrato de conta
          </DialogTitle>
          <DialogDescription>
            Extrato completo com todas as faturas e pagamentos registados para {debtorName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={channel} onValueChange={(v) => setChannel(v as "email" | "whatsapp")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp</TabsTrigger>
          </TabsList>

          <div className="pt-4 space-y-4 overflow-auto" style={{ maxHeight: "55vh" }}>
            {/* Preview do extrato */}
            <div className="rounded-md border bg-muted/30 p-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar extrato…
                </div>
              ) : statement ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat label="Faturado" value={formatEur(statement.totalInvoiced)} />
                    <Stat label="Pago" value={formatEur(statement.totalPaid)} tone="success" />
                    <Stat label="Em dívida" value={formatEur(statement.totalOutstanding)} tone="warn" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <Badge variant="secondary">{statement.invoices.length} fatura(s)</Badge>
                    <Badge variant="secondary">{statement.payments.length} pagamento(s)</Badge>
                  </div>
                  {statement.invoices.length > 0 && (
                    <ScrollArea className="h-32 mt-2 rounded border bg-background">
                      <table className="w-full text-xs">
                        <tbody>
                          {statement.invoices.map((i) => {
                            const rem = i.total - i.amount_paid;
                            const isOpen = rem > 0.005;
                            return (
                              <tr key={i.id} className="border-b last:border-0">
                                <td className="px-2 py-1 font-medium">{i.invoice_number}</td>
                                <td className="px-2 py-1 text-muted-foreground">venc. {i.due_date}</td>
                                <td className="px-2 py-1 text-right">{formatEur(i.total)}</td>
                                <td className={`px-2 py-1 text-right font-medium ${isOpen ? "text-amber-600" : "text-emerald-600"}`}>
                                  {isOpen ? formatEur(rem) : "pago"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados de extrato.</p>
              )}
            </div>

            <TabsContent value="email" className="space-y-3 m-0">
              <div className="space-y-1.5">
                <Label htmlFor="st-email">Email do destinatário</Label>
                <Input
                  id="st-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.pt"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-msg-email">Mensagem (opcional)</Label>
                <Textarea
                  id="st-msg-email" rows={5}
                  value={message} onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                O extrato é gerado e enviado no momento. Fica registado no histórico do caso.
              </p>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-3 m-0">
              <div className="space-y-1.5">
                <Label htmlFor="st-phone">Número (com indicativo)</Label>
                <Input
                  id="st-phone" type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-msg-wa">Mensagem inicial</Label>
                <Textarea
                  id="st-msg-wa" rows={4}
                  value={message} onChange={(e) => setMessage(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  O resumo do extrato (totais + faturas em aberto) é adicionado automaticamente.
                </p>
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Abrimos o WhatsApp Web/App com a mensagem pré-preenchida. A ação fica registada após confirmar.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {channel === "email" ? (
            <Button onClick={() => sendEmail.mutate()} disabled={!canSendEmail || isBusy || isLoading}>
              {sendEmail.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Enviar email
            </Button>
          ) : (
            <Button onClick={handleWhatsApp} disabled={!canSendWhatsApp || isBusy || isLoading}>
              <MessageCircle className="h-4 w-4 mr-1" /> Abrir WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warn" }) {
  const cls =
    tone === "success" ? "text-emerald-600"
    : tone === "warn" ? "text-amber-600"
    : "text-foreground";
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
