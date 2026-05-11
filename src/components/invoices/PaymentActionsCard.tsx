import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Copy, Loader2, Check, Link2, ExternalLink, MessageCircle, AlertTriangle, CalendarClock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useCreateIfthenpayPayment,
  useIfthenpayPayments,
  type IfthenpayMethodId,
} from "@/hooks/payments/useIfthenpayPayments";
import { useIfthenpaySettings } from "@/hooks/integrations/useIfthenpaySettings";
import { useWhatsAppProviderInstance, useWhatsAppProSend } from "@/hooks/useWhatsAppPro";
import { useWhatsAppSettings, DEFAULT_PAYMENT_LINK_TEMPLATE } from "@/hooks/useWhatsAppSettings";
import { renderPaymentMessage } from "@/lib/whatsapp/paymentMessage";
import { useLogInvoiceWhatsAppSend } from "@/hooks/invoices/useInvoiceWhatsAppSends";
import { ScheduleWhatsAppDialog } from "@/components/invoices/ScheduleWhatsAppDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { formatEUR } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toE164, formatPhone } from "@/utils/phone";

interface Props {
  invoiceId: string;
  invoiceTotal: number;
  amountPaid: number;
  currency: string;
  customerPhone?: string | null;
  customerName?: string | null;
  invoiceNumber?: string | null;
}

const METHOD_LABELS: Record<IfthenpayMethodId, string> = {
  multibanco: "Multibanco (referência)",
  mbway: "MB WAY",
  cc: "Cartão de Crédito",
  payshop: "Payshop",
  pix: "Pix",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  expired: "outline",
  cancelled: "outline",
  failed: "destructive",
};

export function PaymentActionsCard({
  invoiceId,
  invoiceTotal,
  amountPaid,
  currency,
  customerPhone,
  customerName,
  invoiceNumber,
}: Props) {
  const { settings } = useIfthenpaySettings();
  const enabledMethods: IfthenpayMethodId[] = (settings?.enabled_methods as IfthenpayMethodId[]) || [];
  const isActive = !!settings?.is_active && enabledMethods.length > 0;

  const outstanding = Math.max(0, Number(invoiceTotal) - Number(amountPaid || 0));

  const [method, setMethod] = useState<IfthenpayMethodId>(enabledMethods[0] || "multibanco");
  const [phone, setPhone] = useState(customerPhone || "");
  const [amount, setAmount] = useState<string>(outstanding.toFixed(2));

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const [waConfirmOpen, setWaConfirmOpen] = useState(false);
  const [waPreview, setWaPreview] = useState<{
    text: string;
    e164: string;
    url: string;
  } | null>(null);
  const [waConsent, setWaConsent] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState<{ phoneE164: string; body: string; url: string } | null>(null);
  const [preparingSchedule, setPreparingSchedule] = useState(false);

  const createPayment = useCreateIfthenpayPayment();
  const { data: payments = [] } = useIfthenpayPayments({
    reference_type: "invoice",
    reference_id: invoiceId,
  });

  const { data: waInstance } = useWhatsAppProviderInstance();
  const { data: waSettings } = useWhatsAppSettings();
  const waSend = useWhatsAppProSend();
  const logSend = useLogInvoiceWhatsAppSend();
  const waActive =
    !!waInstance?.active && (waSettings?.payment_link_enabled ?? true);
  const customerPhoneE164 = customerPhone ? toE164(customerPhone, "PT") : null;

  // Cache + in-flight dedupe: evita chamadas duplicadas ao RPC quando
  // o utilizador clica em "Gerar link" e logo a seguir em "Enviar por WhatsApp".
  const linkPromiseRef = useRef<Promise<string> | null>(null);

  const ensureLink = (): Promise<string> => {
    if (shareLink) return Promise.resolve(shareLink);
    if (linkPromiseRef.current) return linkPromiseRef.current;

    const p = (async () => {
      const { data, error } = await (supabase as any).rpc("ensure_invoice_public_token", {
        _invoice_id: invoiceId,
      });
      if (error) throw error;
      const url = `${window.location.origin}/pay/invoice/${data}`;
      setShareLink(url);
      return url;
    })();

    linkPromiseRef.current = p;
    p.catch(() => {}).finally(() => {
      // Mantém o resultado em shareLink; limpa o in-flight para permitir retry em caso de erro
      linkPromiseRef.current = null;
    });
    return p;
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const url = await ensureLink();
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência");
    } catch (e: any) {
      toast.error(e?.message || "Erro a gerar link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const openWhatsAppConfirm = async () => {
    if (!customerPhone || !customerPhone.trim()) {
      toast.error("Cliente sem telemóvel registado");
      return;
    }
    const e164 = toE164(customerPhone, "PT");
    if (!e164) {
      toast.error(
        `Telemóvel inválido (${customerPhone}). Actualize o contacto do cliente para um número válido.`,
      );
      return;
    }
    setPreparingPreview(true);
    try {
      const url = await ensureLink();
      const template =
        (waSettings?.payment_link_enabled !== false && waSettings?.payment_link_template) ||
        DEFAULT_PAYMENT_LINK_TEMPLATE;
      const text = renderPaymentMessage(template, {
        customer_name: customerName ?? "",
        invoice_number: invoiceNumber ?? "",
        amount: formatEUR(Number(invoiceTotal)),
        link: url,
      });
      setWaPreview({ text, e164, url });
      setWaConsent(false);
      setWaConfirmOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Erro a preparar mensagem");
    } finally {
      setPreparingPreview(false);
    }
  };

  const openScheduleDialog = async () => {
    if (!customerPhone || !customerPhoneE164) {
      toast.error("Telemóvel do cliente inválido");
      return;
    }
    setPreparingSchedule(true);
    try {
      const url = await ensureLink();
      const template =
        (waSettings?.payment_link_enabled !== false && waSettings?.payment_link_template) ||
        DEFAULT_PAYMENT_LINK_TEMPLATE;
      const text = renderPaymentMessage(template, {
        customer_name: customerName ?? "",
        invoice_number: invoiceNumber ?? "",
        amount: formatEUR(Number(invoiceTotal)),
        link: url,
      });
      setScheduleData({ phoneE164: customerPhoneE164, body: text, url });
      setScheduleOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Erro a preparar agendamento");
    } finally {
      setPreparingSchedule(false);
    }
  };

  const confirmSendWhatsApp = async () => {
    if (!waPreview || !waConsent) return;
    try {
      // Backend opt-in precheck (workspace-scoped). Fail-closed if not allowed.
      const { data: pre, error: preErr } = await supabase.functions.invoke(
        "invoice-whatsapp-optin-precheck",
        { body: { invoice_id: invoiceId, phone: waPreview.e164 } },
      );
      if (preErr) {
        toast.error(`Não foi possível validar opt-in: ${preErr.message}`);
        return;
      }
      if (!pre?.allowed) {
        const reason = pre?.reason as string | undefined;
        if (reason === "optout") {
          toast.error(
            "Cliente está em opt-out de WhatsApp neste workspace. Envio bloqueado.",
          );
          logSend
            .mutateAsync({
              invoiceId,
              phone: waPreview.e164,
              messageText: waPreview.text,
              shareUrl: waPreview.url,
              status: "failed",
              errorMessage: "blocked_optout",
              metadata: { consent_confirmed: true, blocked_reason: "optout" },
            })
            .catch(() => {});
        } else if (reason === "invalid_phone") {
          toast.error("Telemóvel inválido para verificação de opt-in.");
        } else {
          toast.error(
            `Verificação de opt-in falhou (${reason || "desconhecido"}). Tente novamente.`,
          );
        }
        return;
      }
      const res = await waSend.mutateAsync({
        phone: waPreview.e164,
        messageType: "text" as any,
        text: waPreview.text,
        metadata: {
          source: "invoice_payment_link",
          invoice_id: invoiceId,
          phone_formatted: formatPhone(waPreview.e164, "PT"),
          consent_confirmed: true,
        },
      });
      logSend
        .mutateAsync({
          invoiceId,
          phone: waPreview.e164,
          messageText: waPreview.text,
          shareUrl: waPreview.url,
          status: "sent",
          providerMessageId: (res as any)?.providerMessageId ?? null,
          metadata: { consent_confirmed: true },
        })
        .catch(() => {});
      toast.success(`Link enviado por WhatsApp para ${formatPhone(waPreview.e164, "PT")}`);
      setWaConfirmOpen(false);
      setWaPreview(null);
      setWaConsent(false);
    } catch (e: any) {
      logSend
        .mutateAsync({
          invoiceId,
          phone: waPreview.e164,
          messageText: waPreview.text,
          shareUrl: waPreview.url,
          status: "failed",
          errorMessage: e?.message || "Erro desconhecido",
          metadata: { consent_confirmed: true },
        })
        .catch(() => {});
      toast.error(e?.message || "Erro a enviar por WhatsApp");
    }
  };

  const handleGenerate = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Valor inválido");
      return;
    }
    if (method === "mbway" && !phone) {
      toast.error("Telemóvel obrigatório para este método");
      return;
    }
    await createPayment.mutateAsync({
      method,
      amount: value,
      currency: currency || "EUR",
      reference_type: "invoice",
      reference_id: invoiceId,
      mbway_phone: method === "mbway" ? phone : undefined,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Gerar pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Gateway de pagamento online não está configurado. Activa em{" "}
            <a href="/settings/payment-gateways" className="underline">
              Gateways de Pagamento
            </a>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Gerar pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {outstanding > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="w-4 h-4" /> Link de pagamento para o cliente
            </div>
            <p className="text-xs text-muted-foreground">
              Envie por email ou WhatsApp. O cliente escolhe o método e paga sem login.
            </p>
            {shareLink ? (
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(shareLink, "Link")}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a href={shareLink} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleGenerateLink} disabled={generatingLink}>
                {generatingLink ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Link2 className="w-3 h-3 mr-2" />}
                Gerar e copiar link
              </Button>
            )}
            {waActive && customerPhone && (
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openWhatsAppConfirm}
                  disabled={generatingLink || preparingPreview || waSend.isPending || !customerPhoneE164}
                  className="text-emerald-600 hover:text-emerald-700"
                  title={
                    customerPhoneE164
                      ? `Pré-visualizar e enviar para ${formatPhone(customerPhoneE164, "PT")}`
                      : "Telemóvel inválido — actualize o contacto"
                  }
                >
                  {preparingPreview || waSend.isPending ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-3 h-3 mr-2" />
                  )}
                  {customerPhoneE164
                    ? `Enviar por WhatsApp (${formatPhone(customerPhoneE164, "PT")})`
                    : "Enviar por WhatsApp"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openScheduleDialog}
                  disabled={generatingLink || preparingPreview || !customerPhoneE164}
                  title="Programar envio para data/hora futura"
                >
                  {preparingSchedule ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <CalendarClock className="w-3 h-3 mr-2" />
                  )}
                  Agendar envio…
                </Button>
                {!customerPhoneE164 && (
                  <p className="text-[11px] text-destructive">
                    Telemóvel do cliente inválido ({customerPhone}). Actualize o contacto.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {outstanding <= 0 ? (
          <p className="text-sm text-emerald-600 flex items-center gap-2">
            <Check className="w-4 h-4" /> Fatura totalmente paga
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Método</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as IfthenpayMethodId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {method === "mbway" && (
              <div>
                <Label className="text-xs">Telemóvel (MB WAY)</Label>
                <Input
                  type="tel"
                  placeholder="9XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={createPayment.isPending}
              className="w-full"
            >
              {createPayment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gerar pagamento
            </Button>
          </>
        )}

        {payments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Tentativas de pagamento
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-md p-3 space-y-1.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{METHOD_LABELS[p.method] || p.method}</span>
                      <Badge variant={STATUS_VARIANTS[p.status] || "outline"}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatEUR(Number(p.amount))}</span>
                      <span>
                        {format(new Date(p.created_at), "d MMM HH:mm", { locale: pt })}
                      </span>
                    </div>
                    {p.method === "multibanco" && p.mb_referencia && (
                      <div className="text-xs flex items-center gap-2">
                        <span className="font-mono">
                          Ent. {p.mb_entidade} • Ref. {p.mb_referencia}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `Entidade: ${p.mb_entidade}\nReferência: ${p.mb_referencia}\nValor: ${formatEUR(Number(p.amount))}`,
                              "Referência"
                            )
                          }
                          className="text-primary hover:opacity-70"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {p.method === "payshop" && p.payshop_reference && (
                      <div className="text-xs font-mono">
                        Ref. {p.payshop_reference}
                      </div>
                    )}
                    {p.method === "cc" && p.cc_payment_url && (
                      <a
                        href={p.cc_payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Abrir link de pagamento
                      </a>
                    )}
                    {p.method === "mbway" && p.mbway_phone && (
                      <div className="text-xs text-muted-foreground">
                        Notificação enviada para {p.mbway_phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog
        open={waConfirmOpen}
        onOpenChange={(open) => {
          setWaConfirmOpen(open);
          if (!open) setWaConsent(false);
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Confirmar envio por WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription>
              Reveja a mensagem antes de enviar. O envio só fica disponível depois
              de confirmar o consentimento do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {waPreview && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-muted-foreground">
                    Destinatário
                  </span>
                  <span className="font-mono">
                    {formatPhone(waPreview.e164, "PT")}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="font-medium text-muted-foreground mb-1">
                  Pré-visualização da mensagem
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed max-h-64 overflow-y-auto">
                  {waPreview.text}
                </pre>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  O envio de mensagens por WhatsApp para clientes exige
                  consentimento prévio (opt-in). Não envie mensagens não
                  solicitadas — pode resultar no bloqueio do número e em
                  incumprimento do RGPD e dos Termos do WhatsApp Business.
                </p>
              </div>

              <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                <Checkbox
                  checked={waConsent}
                  onCheckedChange={(v) => setWaConsent(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Confirmo que o cliente autorizou receber comunicações por
                  WhatsApp e que esta mensagem está em conformidade com a
                  legislação aplicável.
                </span>
              </label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={waSend.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSendWhatsApp();
              }}
              disabled={!waConsent || waSend.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {waSend.isPending ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-3 h-3 mr-2" />
              )}
              Confirmar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {scheduleData && (
        <ScheduleWhatsAppDialog
          open={scheduleOpen}
          onOpenChange={(o) => {
            setScheduleOpen(o);
            if (!o) setScheduleData(null);
          }}
          invoiceId={invoiceId}
          phoneE164={scheduleData.phoneE164}
          defaultBody={scheduleData.body}
          shareUrl={scheduleData.url}
        />
      )}
    </Card>
  );
}
