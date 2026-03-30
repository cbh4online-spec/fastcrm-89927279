import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";

const PAYOUT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Pedido", variant: "outline" },
  approved: { label: "Aprovado", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  failed: { label: "Falhado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function MarketplacePayoutsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["c2c-payouts", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("c2c_payouts")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Payouts</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos de Payout</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem payouts registados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p: any) => {
                    const s = PAYOUT_STATUS[p.status] || { label: p.status, variant: "outline" as const };
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs">{p.seller_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-right font-medium">€{Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>{p.method || "—"}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
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
