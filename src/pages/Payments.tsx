import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageElementGate } from "@/components/shared/PageElementGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayments, useUpdatePayment, useCreatePayment, type PaymentStatus } from "@/hooks/usePayments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toolbar } from "@/components/common/Toolbar";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  CreditCard, DollarSign, TrendingUp, AlertCircle, XCircle,
  MoreHorizontal, Eye, RotateCcw, Download, Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { InvoiceReceiptsCard } from "@/components/payments/InvoiceReceiptsCard";

export default function Payments() {
  const { data: payments, isLoading } = usePayments();
  const updatePayment = useUpdatePayment();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any>(null);

  // Register form
  const [regForm, setRegForm] = useState({ opportunity_id: "", amount: "", currency: "EUR" });

  const filtered = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.opportunity_id?.toLowerCase().includes(q) ||
          p.stripe_payment_id?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payments, search, statusFilter]);

  const totalReceived = payments?.filter(p => p.status === "succeeded").reduce((s, p) => s + (p.amount || 0), 0) || 0;
  const pendingAmount = payments?.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0) || 0;
  const failedAmount = payments?.filter(p => p.status === "failed").reduce((s, p) => s + (p.amount || 0), 0) || 0;
  const totalPayments = payments?.length || 0;
  const successRate = totalPayments > 0
    ? Math.round((payments?.filter(p => p.status === "succeeded").length || 0) / totalPayments * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Pago</Badge>;
      case "pending": return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Pendente</Badge>;
      case "failed": return <Badge variant="destructive">Falhado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const fmt = (v: number) => `€${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

  const handleRegister = async () => {
    if (!regForm.opportunity_id || !regForm.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      await createPayment.mutateAsync({
        opportunity_id: regForm.opportunity_id,
        amount: parseFloat(regForm.amount),
        currency: regForm.currency,
        status: "succeeded",
      });
      toast.success("Pagamento registado com sucesso");
      setRegisterOpen(false);
      setRegForm({ opportunity_id: "", amount: "", currency: "EUR" });
    } catch {
      toast.error("Erro ao registar pagamento");
    }
  };

  const handleMarkRefunded = async (id: string) => {
    try {
      await updatePayment.mutateAsync({ id, status: "failed" });
      toast.success("Pagamento marcado como reembolsado");
    } catch {
      toast.error("Erro ao atualizar pagamento");
    }
  };

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Data", "ID Oportunidade", "Valor", "Moeda", "Estado"];
    const rows = filtered.map(p => [
      p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "",
      p.opportunity_id || "",
      p.amount?.toString() || "0",
      p.currency || "EUR",
      p.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagamentos_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
            <p className="text-muted-foreground">Histórico e gestão de pagamentos recebidos</p>
          </div>
          <PageElementGate kind="action" id="register-payment">
            <Button onClick={() => setRegisterOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Registar Pagamento
            </Button>
          </PageElementGate>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold text-green-600">{fmt(totalReceived)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold text-amber-600">{fmt(pendingAmount)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhados</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold text-destructive">{fmt(failedAmount)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{successRate}%</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={search}
          searchPlaceholder="Pesquisar por ID, oportunidade..."
          onSearchChange={setSearch}
          showFilters={false}
          sortOptions={[
            { value: "all", label: "Todos" },
            { value: "succeeded", label: "Pagos" },
            { value: "pending", label: "Pendentes" },
            { value: "failed", label: "Falhados" },
          ]}
          sortValue={statusFilter}
          onSortChange={(v) => setStatusFilter(v)}
          rightActions={
            <PageElementGate kind="action" id="export">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </PageElementGate>
          }
        />

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>{filtered.length} pagamento(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Oportunidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailPayment(payment)}>
                      <TableCell>
                        {payment.created_at ? format(new Date(payment.created_at), "dd MMM yyyy", { locale: pt }) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payment.opportunity_id?.slice(0, 8) || "-"}</TableCell>
                      <TableCell className="font-medium">{fmt(payment.amount || 0)}</TableCell>
                      <TableCell>{payment.currency || "EUR"}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailPayment(payment); }}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalhe
                            </DropdownMenuItem>
                            {payment.status === "succeeded" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkRefunded(payment.id); }}>
                                <RotateCcw className="h-4 w-4 mr-2" /> Marcar como reembolsado
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Sem pagamentos</h3>
                <p className="text-muted-foreground mt-1">Os pagamentos aparecerão aqui.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recibos de Faturas (inclui SAF-T) */}
        <InvoiceReceiptsCard />
      </div>


      {/* Register Payment Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Pagamento Manual</DialogTitle>
            <DialogDescription>Registe um pagamento recebido fora do sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID da Oportunidade *</Label>
              <Input value={regForm.opportunity_id} onChange={(e) => setRegForm(f => ({ ...f, opportunity_id: e.target.value }))} placeholder="UUID da oportunidade" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={regForm.amount} onChange={(e) => setRegForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Moeda</Label>
                <Select value={regForm.currency} onValueChange={(v) => setRegForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegister} disabled={createPayment.isPending}>Registar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Dialog */}
      <Dialog open={!!detailPayment} onOpenChange={() => setDetailPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhe do Pagamento</DialogTitle>
          </DialogHeader>
          {detailPayment && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{detailPayment.id}</span>
                <span className="text-muted-foreground">Oportunidade</span>
                <span className="font-mono text-xs">{detailPayment.opportunity_id}</span>
                <span className="text-muted-foreground">Valor</span>
                <span className="font-medium">{fmt(detailPayment.amount)} {detailPayment.currency}</span>
                <span className="text-muted-foreground">Estado</span>
                <span>{getStatusBadge(detailPayment.status)}</span>
                <span className="text-muted-foreground">Data</span>
                <span>{detailPayment.created_at ? format(new Date(detailPayment.created_at), "dd MMM yyyy HH:mm", { locale: pt }) : "-"}</span>
                {detailPayment.stripe_payment_id && (
                  <>
                    <span className="text-muted-foreground">Stripe ID</span>
                    <span className="font-mono text-xs">{detailPayment.stripe_payment_id}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
