import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RenewalBillingTabProps {
  contractId: string;
  workspaceId: string;
  onGeneratePaymentLink: () => void;
}

export function RenewalBillingTab({ contractId, workspaceId, onGeneratePaymentLink }: RenewalBillingTabProps) {
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

  return (
    <div className="space-y-4">
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
            <p className="text-xs mt-1">Clique em "Gerar Link" para criar um link de pagamento Stripe</p>
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
    </div>
  );
}
