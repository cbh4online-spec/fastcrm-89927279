import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, CheckCircle2, CreditCard, XCircle, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const qc = useQueryClient();

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["marketplace-payouts", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await (supabase as any)
        .from("marketplace_payouts")
        .select("*, c2c_sellers(display_name)")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const managePayout = useMutation({
    mutationFn: async ({ action, payoutId, notes }: { action: string; payoutId: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("marketplace-manage-payout", {
        body: { action, payout_id: payoutId, workspace_id: wsId, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["marketplace-payouts", wsId] });
      const msgs: Record<string, string> = {
        approve: "Payout aprovado",
        mark_paid: "Payout marcado como pago",
        cancel: "Payout cancelado",
      };
      toast.success(msgs[v.action] || "Payout atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // KPI calculations
  const totalPending = payouts
    .filter((p: any) => p.status === "requested" || p.status === "approved")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalPaidThisMonth = payouts
    .filter((p: any) => {
      if (p.status !== "paid") return false;
      const d = new Date(p.processed_at || p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Payouts do Marketplace</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">€{totalPending.toFixed(2)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pago este mês</p>
                <p className="text-2xl font-bold">€{totalPaidThisMonth.toFixed(2)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-500/10"><DollarSign className="h-5 w-5 text-green-500" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total pedidos</p>
                <p className="text-2xl font-bold">{payouts.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
            </CardContent>
          </Card>
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
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p: any) => {
                    const s = PAYOUT_STATUS[p.status] || { label: p.status, variant: "outline" as const };
                    const sellerName = p.c2c_sellers?.display_name || p.seller_id?.slice(0, 8);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{sellerName}</TableCell>
                        <TableCell className="text-right font-medium">€{Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>{p.payout_method || "—"}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {p.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                disabled={managePayout.isPending}
                                onClick={() => managePayout.mutate({ action: "approve", payoutId: p.id })}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Aprovar
                              </Button>
                            )}
                            {(p.status === "requested" || p.status === "approved") && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  disabled={managePayout.isPending}
                                  onClick={() => managePayout.mutate({ action: "mark_paid", payoutId: p.id })}
                                >
                                  <CreditCard className="h-3 w-3" /> Pagar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs gap-1"
                                  disabled={managePayout.isPending}
                                  onClick={() => managePayout.mutate({ action: "cancel", payoutId: p.id })}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
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
