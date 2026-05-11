import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, CreditCard, Smartphone, Receipt, Store, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type MethodId = "multibanco" | "mbway" | "cc" | "payshop" | "pix";

const METHOD_META: Record<MethodId, { label: string; icon: any; desc: string }> = {
  multibanco: { label: "Multibanco (referência)", icon: Receipt, desc: "Pague em qualquer ATM ou homebanking" },
  mbway: { label: "MB WAY", icon: Smartphone, desc: "Receba pedido na app MB WAY" },
  cc: { label: "Cartão de Crédito / Débito", icon: CreditCard, desc: "Visa, Mastercard, etc." },
  payshop: { label: "Payshop / CTT", icon: Store, desc: "Pague em qualquer Payshop ou CTT" },
  pix: { label: "Pix", icon: Zap, desc: "Pagamento instantâneo (Brasil)" },
};

interface PublicInvoiceData {
  invoice: {
    id: string;
    number: string;
    client_name: string;
    total: number;
    amount_paid: number;
    remaining: number;
    currency: string;
    status: string;
    due_date: string;
    document_type: string;
  };
  workspace: { name: string; slug: string } | null;
  payment_methods: MethodId[];
}

export default function PublicInvoicePayPage() {
  const { token } = useParams<{ token: string }>();
  const [selectedMethod, setSelectedMethod] = useState<MethodId | null>(null);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    enabled: !!token,
    queryFn: async (): Promise<PublicInvoiceData> => {
      const { data, error } = await supabase.functions.invoke("invoice-pay-public", {
        method: "GET" as any,
        // @ts-ignore - GET with query string
        headers: {},
      });
      // Fallback: use direct fetch since invoke doesn't pass query params
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const r = await fetch(`${supabaseUrl}/functions/v1/invoice-pay-public?token=${encodeURIComponent(token!)}`, {
        headers: { apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Fatura não encontrada");
      return j;
    },
  });

  const payMutation = useMutation({
    mutationFn: async (input: { method: MethodId; mbway_phone?: string }) => {
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const r = await fetch(`${supabaseUrl}/functions/v1/invoice-pay-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          token,
          method: input.method,
          mbway_phone: input.mbway_phone,
          return_url: window.location.href,
          cancel_url: window.location.href,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao gerar pagamento");
      return j.payment;
    },
    onSuccess: (p) => {
      setResult(p);
      toast.success("Pagamento gerado");
      if (p.cc_payment_url && (p.method === "cc" || p.method === "pix")) {
        window.location.href = p.cc_payment_url;
      }
    },
    onError: (e: any) => toast.error(e?.message || "Erro"),
  });

  const formatCurrency = (v: number, c = "EUR") =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: c }).format(v);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg"><CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-3/4" /><Skeleton className="h-32 w-full" /><Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg"><CardContent className="p-6 text-center space-y-2">
          <h1 className="text-xl font-semibold">Fatura indisponível</h1>
          <p className="text-sm text-muted-foreground">
            O link pode ter expirado ou ser inválido.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  const { invoice, workspace, payment_methods } = data;
  const alreadyPaid = invoice.remaining <= 0 || invoice.status === "paid";

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Pagamento de fatura</h1>
          {workspace && <p className="text-sm text-muted-foreground">{workspace.name}</p>}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fatura {invoice.number}</CardTitle>
              <Badge variant={alreadyPaid ? "default" : "secondary"}>
                {alreadyPaid ? "Paga" : invoice.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{invoice.client_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Já pago</span>
              <span>{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Em falta</span>
              <span>{formatCurrency(invoice.remaining, invoice.currency)}</span>
            </div>
          </CardContent>
        </Card>

        {alreadyPaid ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Esta fatura já se encontra paga. Obrigado!</AlertDescription>
          </Alert>
        ) : payment_methods.length === 0 ? (
          <Alert>
            <AlertDescription>
              Pagamento online indisponível para esta fatura. Contacte o emissor.
            </AlertDescription>
          </Alert>
        ) : result ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Instruções de pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.mb_entidade && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Entidade</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-lg">{result.mb_entidade}</p>
                        <Button size="icon" variant="ghost" onClick={() => copy(result.mb_entidade)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Referência</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-lg">{result.mb_referencia}</p>
                        <Button size="icon" variant="ghost" onClick={() => copy(result.mb_referencia)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor: {formatCurrency(Number(result.amount), result.currency)}
                    {result.mb_expiry_date && ` · Válido até ${result.mb_expiry_date}`}
                  </p>
                </>
              )}
              {result.payshop_reference && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Referência Payshop</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg">{result.payshop_reference}</p>
                    <Button size="icon" variant="ghost" onClick={() => copy(result.payshop_reference)}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
              {result.mbway_phone && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Pedido enviado para <strong>{result.mbway_phone}</strong>. Confirme na app MB WAY.
                  </AlertDescription>
                </Alert>
              )}
              {result.cc_payment_url && (
                <Button asChild className="w-full">
                  <a href={result.cc_payment_url} target="_blank" rel="noreferrer">
                    Abrir página de pagamento <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => { setResult(null); setSelectedMethod(null); }}>
                Escolher outro método
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Escolha o método de pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {payment_methods.map((m) => {
                const meta = METHOD_META[m];
                if (!meta) return null;
                const Icon = meta.icon;
                const isSelected = selectedMethod === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.desc}</p>
                    </div>
                  </button>
                );
              })}

              {selectedMethod === "mbway" && (
                <div className="pt-2 space-y-2">
                  <Label htmlFor="phone">Telemóvel MB WAY</Label>
                  <Input
                    id="phone"
                    placeholder="+351912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              <Button
                className="w-full mt-3"
                disabled={!selectedMethod || (selectedMethod === "mbway" && !phone) || payMutation.isPending}
                onClick={() => payMutation.mutate({
                  method: selectedMethod!,
                  mbway_phone: selectedMethod === "mbway" ? phone : undefined,
                })}
              >
                {payMutation.isPending ? "A gerar..." : `Pagar ${formatCurrency(invoice.remaining, invoice.currency)}`}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pagamento processado de forma segura.
        </p>
      </div>
    </div>
  );
}
