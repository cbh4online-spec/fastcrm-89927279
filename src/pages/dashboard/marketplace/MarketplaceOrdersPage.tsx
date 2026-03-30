import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  completed: { label: "Completo", variant: "default" },
  refunded: { label: "Reembolsado", variant: "destructive" },
};

export default function MarketplaceOrdersPage() {
  const { data: orders = [], isLoading } = useMarketplaceOrders();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Encomendas Marketplace</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Encomendas por Seller</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem encomendas marketplace</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => {
                    const s = STATUS_MAP[o.status] || { label: o.status, variant: "outline" as const };
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs">{o.seller_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-right">€{Number(o.gross_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">€{Number(o.commission_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">€{Number(o.net_amount).toFixed(2)}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
