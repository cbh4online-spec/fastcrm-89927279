import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Copy, Loader2, Check, Link2, ExternalLink, MessageCircle } from "lucide-react";
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

  const createPayment = useCreateIfthenpayPayment();
  const { data: payments = [] } = useIfthenpayPayments({
    reference_type: "invoice",
    reference_id: invoiceId,
  });

  const { data: waInstance } = useWhatsAppProviderInstance();
  const { data: waSettings } = useWhatsAppSettings();
  const waSend = useWhatsAppProSend();
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

  const handleSendWhatsApp = async () => {
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
    setGeneratingLink(true);
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
      await waSend.mutateAsync({
        phone: e164,
        messageType: "text" as any,
        text,
        metadata: {
          source: "invoice_payment_link",
          invoice_id: invoiceId,
          phone_formatted: formatPhone(e164, "PT"),
        },
      });
      toast.success(`Link enviado por WhatsApp para ${formatPhone(e164, "PT")}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro a enviar por WhatsApp");
    } finally {
      setGeneratingLink(false);
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
                  onClick={handleSendWhatsApp}
                  disabled={generatingLink || waSend.isPending || !customerPhoneE164}
                  className="text-emerald-600 hover:text-emerald-700"
                  title={
                    customerPhoneE164
                      ? `Enviar para ${formatPhone(customerPhoneE164, "PT")}`
                      : "Telemóvel inválido — actualize o contacto"
                  }
                >
                  {waSend.isPending ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-3 h-3 mr-2" />
                  )}
                  {customerPhoneE164
                    ? `Enviar por WhatsApp (${formatPhone(customerPhoneE164, "PT")})`
                    : "Enviar por WhatsApp"}
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
    </Card>
  );
}
