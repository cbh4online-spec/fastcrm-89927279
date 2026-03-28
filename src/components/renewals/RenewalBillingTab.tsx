import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Copy, ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RenewalBillingTabProps {
  contractId: string;
  workspaceId: string;
  onGeneratePaymentLink: () => void;
  stripeSubscriptionId?: string | null;
}

export function RenewalBillingTab({ contractId, workspaceId, onGeneratePaymentLink, stripeSubscriptionId }: RenewalBillingTabProps) {
  const { workspaceClient } = useWorkspaceInstance();

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
      case "subscription_cancelled": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
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

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      {stripeSubscriptionId && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Subscrição Stripe Ativa</p>
                <p className="text-xs text-muted-foreground font-mono">{stripeSubscriptionId}</p>
              </div>
              <Badge variant="default" className="ml-auto">Recorrente</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Links */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Links de Pagamento</h3>
        <Button size="sm" onClick={onGeneratePaymentLink}>
          <CreditCard className="mr-1 h-3.5 w-3.5" /> Gerar Link
        </Button>
      </div>

      {paymentLinks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum link de pagamento gerado</p>
            <p className="text-xs mt-1">Clique em "Gerar Link" para criar uma subscrição recorrente Stripe</p>
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
                    <TableRow key={evt.id}>
                      <TableCell className="text-sm">
                        {format(new Date(evt.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {eventIcon(evt.event_type)}
                          <span className="text-sm">{eventLabel(evt.event_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {evt.amount > 0 ? formatCurrency(Number(evt.amount), evt.currency) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                        {evt.stripe_invoice_id || "—"}
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
