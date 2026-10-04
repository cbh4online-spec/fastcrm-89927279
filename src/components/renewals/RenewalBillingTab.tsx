import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Copy, ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Ban, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RenewalBillingTabProps {
  contractId: string;
  workspaceId: string;
  onGeneratePaymentLink: () => void;
  stripeSubscriptionId?: string | null;
  dunningAttempts?: number;
  contractStatus?: string;
}

export function RenewalBillingTab({ contractId, workspaceId, onGeneratePaymentLink, stripeSubscriptionId, dunningAttempts = 0, contractStatus }: RenewalBillingTabProps) {
  const { workspaceClient } = useWorkspaceInstance();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [subInput, setSubInput] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-stripe-renewals", {
        body: {
          workspace_id: workspaceId,
          contract_id: contractId,
          ...(!stripeSubscriptionId && subInput ? { stripe_subscription_id: subInput } : {}),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na sincronização");
      const r = data.results?.[0];
      if (r && !r.ok) throw new Error(r.error);
      toast.success(r ? `Sincronizado: próxima renovação ${r.next_renewal_date ?? "—"}, ${r.payments_added} pagamento(s) recuperado(s)` : "Sem subscrição Stripe para sincronizar");
      setSubInput("");
      ["renewal-contract", "renewal-contracts", "renewal-payment-events", "renewal-invoices"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (e: any) {
      toast.error(e.message || "Erro ao sincronizar com Stripe");
    } finally {
      setSyncing(false);
    }
  };

  const { data: paymentLinks = [], isLoading } = useQuery({
    queryKey: ["renewal-payment-links", contractId],
    queryFn: async () => {
      if (!workspaceClient) return [];
      const { data, error } = await workspaceClient
        .from("renewal_payment_links")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceClient && !!contractId,
  });

  const { data: paymentEvents = [] } = useQuery({
    queryKey: ["renewal-payment-events", contractId],
    queryFn: async () => {
      if (!workspaceClient) return [];
      const { data, error } = await workspaceClient
        .from("renewal_payment_events")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceClient && !!contractId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["renewal-invoices", contractId],
    queryFn: async () => {
      if (!workspaceClient) return [];
      const { data, error } = await workspaceClient
        .from("invoices")
        .select("id, invoice_number, total, currency, status, issue_date, paid_at, pdf_url, external_url")
        .eq("renewal_contract_id", contractId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceClient && !!contractId,
  });

  const formatCurrency = (val: number, currency = "EUR") =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(val);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      paid: { label: "Pago", variant: "default" },
      expired: { label: "Expirado", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    const cfg = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const eventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_succeeded": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "payment_failed": return <XCircle className="h-4 w-4 text-destructive" />;
      case "subscription_created": return <CreditCard className="h-4 w-4 text-primary" />;
      case "subscription_cancelled": return <Ban className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const eventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      payment_succeeded: "Pagamento recebido",
      payment_failed: "Pagamento falhado",
      subscription_created: "Subscrição criada",
      subscription_cancelled: "Subscrição cancelada",
    };
    return labels[eventType] || eventType;
  };

  const recentFailedCount = paymentEvents.filter(
    (e: any) => e.event_type === "payment_failed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Dunning Warning Banner */}
      {dunningAttempts > 0 && contractStatus !== "churned" && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Dunning Ativo — {dunningAttempts} tentativa(s) de pagamento falhada(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  {dunningAttempts >= 3
                    ? "O serviço será cancelado automaticamente."
                    : `O serviço será cancelado após ${3 - dunningAttempts} tentativa(s) falhada(s) adicional(ais).`}
                </p>
              </div>
              <Badge variant="destructive" className="shrink-0">
                {dunningAttempts}/3
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Churned Banner */}
      {contractStatus === "churned" && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Ban className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Contrato Cancelado</p>
                <p className="text-xs text-muted-foreground">Serviço cancelado automaticamente por falta de pagamento.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status */}
      {stripeSubscriptionId && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Subscrição Stripe {contractStatus === "churned" ? "Cancelada" : "Ativa"}</p>
                <p className="text-xs text-muted-foreground font-mono">{stripeSubscriptionId}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {dunningAttempts > 0 && contractStatus !== "churned" && (
                  <Badge variant="destructive" className="text-[10px]">
                    Dunning {dunningAttempts}/3
                  </Badge>
                )}
                <Badge variant={contractStatus === "churned" ? "destructive" : "default"}>
                  {contractStatus === "churned" ? "Cancelada" : "Recorrente"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sincronização Stripe */}
      <Card>
        <CardContent className="py-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          {!stripeSubscriptionId && (
            <Input
              placeholder="ID da subscrição Stripe (sub_...)"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value.trim())}
              className="sm:max-w-xs"
              maxLength={100}
              aria-label="ID da subscrição Stripe"
            />
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || (!stripeSubscriptionId && !/^sub_[A-Za-z0-9]+$/.test(subInput))}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "A sincronizar..." : stripeSubscriptionId ? "Sincronizar com Stripe" : "Ligar e sincronizar"}
          </Button>
          <p className="text-xs text-muted-foreground">Atualiza estado, próxima data de renovação e pagamentos a partir do Stripe.</p>
        </CardContent>
      </Card>

      {/* Payment Links */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Links de Pagamento</h3>
        <Button size="sm" onClick={onGeneratePaymentLink} disabled={contractStatus === "churned"}>
          <CreditCard className="mr-1 h-3.5 w-3.5" /> Gerar Link
        </Button>
      </div>

      {paymentLinks.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {stripeSubscriptionId ? (
              <>
                <p className="text-sm">Subscrição Stripe ativa e ligada — não é preciso link de pagamento.</p>
                <p className="text-xs mt-1">
                  Total recebido: {formatCurrency(paymentEvents.filter((e: any) => e.event_type === "payment_succeeded").reduce((s: number, e: any) => s + Number(e.amount || 0), 0), "EUR")}
                  {" · "}{paymentEvents.filter((e: any) => e.event_type === "payment_succeeded").length} pagamento(s)
                </p>
              </>
            ) : (
              <>
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum link de pagamento gerado</p>
                <p className="text-xs mt-1">Clique em "Gerar Link" para criar uma subscrição recorrente Stripe</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLinks.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="text-sm">
                      {format(new Date(link.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(link.amount), link.currency)}
                    </TableCell>
                    <TableCell>{statusBadge(link.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(link.stripe_url);
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => window.open(link.stripe_url, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Events / Movements */}
      {paymentEvents.length > 0 && (
        <>
          <h3 className="text-sm font-semibold">Movimentos</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentEvents.map((evt: any) => (
                    <TableRow key={evt.id} className={evt.event_type === "payment_failed" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm">
                        {format(new Date(evt.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {eventIcon(evt.event_type)}
                          <span className="text-sm">{eventLabel(evt.event_type)}</span>
                          {evt.event_type === "payment_failed" && evt.metadata?.dunning_step && (
                            <Badge variant="destructive" className="text-[10px] ml-1">
                              Tentativa {evt.metadata.dunning_step}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {evt.amount > 0 ? formatCurrency(Number(evt.amount), evt.currency) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {evt.metadata?.hosted_invoice_url ? (
                          <a href={evt.metadata.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            {evt.metadata?.invoice_number || "Recibo"} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="font-mono">{evt.metadata?.invoice_number || evt.stripe_invoice_id || "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Invoices linked to this contract */}
      {invoices.length > 0 && (
        <>
          <h3 className="text-sm font-semibold">Faturas</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Fatura</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                      <TableCell className="text-sm font-medium">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(inv.issue_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell>
                        {inv.pdf_url || inv.external_url ? (
                          <a href={inv.pdf_url || inv.external_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Abrir documento Stripe">
                            <FileText className="h-4 w-4 text-primary" />
                          </a>
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
