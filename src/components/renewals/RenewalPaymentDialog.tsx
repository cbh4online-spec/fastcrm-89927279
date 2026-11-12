import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Mail, CreditCard, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildRevolutLink, buildManualMessage, type ManualMethod } from "@/lib/renewals/manualPayment";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { RenewalItem, RenewalContract } from "@/types/renewal";
import { RENEWAL_ITEM_TYPE_LABELS } from "@/types/renewal";

interface RenewalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: RenewalContract;
  items: RenewalItem[];
  onPaymentCreated?: (url: string) => void;
}

export function RenewalPaymentDialog({
  open, onOpenChange, contract, items, onPaymentCreated,
}: RenewalPaymentDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(items.map(i => i.id));
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<"stripe" | ManualMethod>("stripe");
  const saved = ((contract as any).alert_settings?.payment ?? {}) as { revolut?: string; mbway?: string; title?: string };
  const [revolutRaw, setRevolutRaw] = useState(saved.revolut || "");
  const [mbwayPhone, setMbwayPhone] = useState(saved.mbway || "");
  const [title, setTitle] = useState(saved.title || "Pagamento da renovação");
  // Guardar na renovação (servidor), para funcionar em qualquer navegador
  useEffect(() => {
    if (!open) return;
    const next = { revolut: revolutRaw.trim(), mbway: mbwayPhone.trim(), title };
    if (next.revolut === (saved.revolut || "") && next.mbway === (saved.mbway || "") && next.title === (saved.title || "Pagamento da renovação")) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("renewal_contracts").select("alert_settings").eq("id", contract.id).maybeSingle();
      const current = ((data?.alert_settings as any) || {}) as Record<string, unknown>;
      const { error } = await supabase.from("renewal_contracts")
        .update({ alert_settings: { ...current, payment: { ...(current.payment as object || {}), ...next } } as any })
        .eq("id", contract.id);
      if (error) toast.error("Não foi possível guardar os dados de pagamento");
      else { (contract as any).alert_settings = { ...current, payment: next }; }
    }, 800);
    return () => clearTimeout(t);
  }, [revolutRaw, mbwayPhone, title, open]);

  const logSent = async (channel: "whatsapp" | "email" | "copy") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("renewal_events").insert({
      workspace_id: contract.workspace_id, contract_id: contract.id, event_type: "invoice_sent",
      payload_json: { kind: "payment_request", method, channel, amount: selectedTotal, title,
        items: msgLines.map(l => l.name), sent_by: u.user?.id ?? null },
    });
    if (error) toast.error("A mensagem não ficou registada no histórico");
    else { toast.success("Envio registado no histórico da renovação"); queryClient.invalidateQueries({ queryKey: ["renewal-events", contract.id] }); }
  };

  // Último link Stripe pendente deste contrato (guardado no servidor)
  const { data: lastStripe } = useQuery({
    queryKey: ["renewal-last-stripe-link", contract.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("renewal_payment_links").select("stripe_url, status")
        .eq("contract_id", contract.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1);
      return data?.[0]?.stripe_url ?? null;
    },
  });
  useEffect(() => { if (lastStripe && !paymentUrl) setPaymentUrl(lastStripe); }, [lastStripe]);

  const activeItems = items.filter(i => ["active", "pending_renewal", "overdue"].includes(i.status));

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectedTotal = activeItems
    .filter(i => selectedItemIds.includes(i.id))
    .reduce((sum, i) => sum + Number(i.qty) * Number(i.unit_price), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: contract.currency || "EUR" }).format(val);

  const INTERVAL_LABEL: Record<string, string> = { monthly: "mensal", quarterly: "trimestral", semi_annual: "semestral", yearly: "anual" };
  const msgLines = activeItems.filter(i => selectedItemIds.includes(i.id)).map(i => ({
    name: i.name, qty: Number(i.qty), amountLabel: formatCurrency(Number(i.qty) * Number(i.unit_price)),
  }));
  const reference = contract.id.slice(0, 8).toUpperCase();
  const clientName = (contract as any).contact?.name || contract.company?.name || "";
  const email = (contract as any).contact?.email || "";
  const periodLabel = INTERVAL_LABEL[contract.renewal_interval] || "";
  const sendActions = (msg: string, ready: boolean) => (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="outline" disabled={!ready} onClick={() => { navigator.clipboard.writeText(msg); logSent("copy"); }}>
        <Copy className="mr-2 h-4 w-4" /> Copiar
      </Button>
      <Button variant="outline" disabled={!ready} onClick={() => { logSent("whatsapp"); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank"); }}>
        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
      </Button>
      <Button variant="outline" disabled={!ready} onClick={() => { logSent("email"); window.open(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(title || "Pagamento da renovação " + reference)}&body=${encodeURIComponent(msg)}`); }}>
        <Mail className="mr-2 h-4 w-4" /> Email
      </Button>
    </div>
  );
  const titleField = (
    <div className="space-y-1.5">
      <Label htmlFor="pay-title">Título da mensagem</Label>
      <Input id="pay-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
    </div>
  );

  const handleGenerate = async () => {
    if (!currentWorkspace?.id || selectedItemIds.length === 0) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-renewal-payment-link", {
        body: {
          contract_id: contract.id,
          workspace_id: currentWorkspace.id,
          item_ids: selectedItemIds,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentUrl(data.url);
      onPaymentCreated?.(data.url);
      toast.success("Link de pagamento gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar link de pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      toast.success("Link copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerar Link de Pagamento
          </DialogTitle>
        </DialogHeader>

        <Tabs value={method} onValueChange={(v) => setMethod(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="revolut">Revolut</TabsTrigger>
            <TabsTrigger value="mbway">MB WAY</TabsTrigger>
          </TabsList>
        </Tabs>

        {method !== "stripe" ? (() => {
          const amountLabel = formatCurrency(selectedTotal);
          const link = buildRevolutLink(revolutRaw, selectedTotal);
          const phoneOk = /^\+?[\d\s]{9,15}$/.test(mbwayPhone.trim());
          const ready = selectedItemIds.length > 0 && (method === "revolut" ? !!link : phoneOk);
          const msg = ready ? buildManualMessage({ method, clientName, amountLabel, reference, link, phone: mbwayPhone.trim(), title, lines: msgLines, periodLabel }) : "";
          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total dos itens selecionados</span>
                <span className="font-bold">{amountLabel}</span>
              </div>
              {method === "revolut" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="revolut-link">Link Revolut</Label>
                  <Input id="revolut-link" maxLength={300} placeholder="revolut.me/suaempresa ou link de pagamento" value={revolutRaw} onChange={(e) => setRevolutRaw(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Fica guardado. Num link revolut.me o valor é acrescentado automaticamente; se colar a mensagem da Revolut, usamos só o link.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="mbway-phone">Telemóvel MB WAY da empresa</Label>
                  <Input id="mbway-phone" maxLength={20} placeholder="912 345 678" value={mbwayPhone} onChange={(e) => setMbwayPhone(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Fica guardado para as próximas cobranças.</p>
                </div>
              )}
              {titleField}
              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea readOnly rows={8} value={msg} placeholder="Preencha os dados acima para gerar a mensagem." />
              </div>
              {sendActions(msg, ready)}
              <p className="text-xs text-muted-foreground">Estes pagamentos não são confirmados automaticamente. Quando o cliente pagar, registe o pagamento manualmente.</p>
            </div>
          );
        })() : !paymentUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os itens a incluir no link de pagamento Stripe:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activeItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {RENEWAL_ITEM_TYPE_LABELS[item.item_type]}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(Number(item.qty) * Number(item.unit_price))}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={isLoading || selectedItemIds.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Gerar Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Link de pagamento gerado:</p>
              <p className="text-sm font-mono break-all">{paymentUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Link
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.open(paymentUrl, "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir
              </Button>
            </div>
            {titleField}
            {(() => {
              const msg = buildManualMessage({ method: "stripe", clientName, amountLabel: formatCurrency(selectedTotal), reference, link: paymentUrl, title, lines: msgLines, periodLabel });
              return (<>
                <div className="space-y-1.5"><Label>Mensagem</Label><Textarea readOnly rows={8} value={msg} /></div>
                {sendActions(msg, true)}
              </>);
            })()}
            <Button variant="outline" className="w-full" onClick={() => setPaymentUrl(null)}>Gerar novo link</Button>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
