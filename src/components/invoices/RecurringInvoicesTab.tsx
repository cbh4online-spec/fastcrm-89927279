import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInvoices, type InvoiceStatus } from "@/hooks/useInvoices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ExternalLink, FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviada", variant: "outline" },
  paid: { label: "Paga", variant: "default" },
  partially_paid: { label: "Parcial", variant: "outline" },
  overdue: { label: "Vencida", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "secondary" },
};

export function RecurringInvoicesTab() {
  const navigate = useNavigate();
  const { data: allInvoices = [], isLoading } = useInvoices();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter only invoices linked to renewal contracts
  const renewalInvoices = (allInvoices as any[]).filter(
    (inv) => !!inv.renewal_contract_id
  );

  const filteredInvoices = statusFilter === "all"
    ? renewalInvoices
    : renewalInvoices.filter((inv) => inv.status === statusFilter);

  // KPIs
  const totalRenewalRevenue = renewalInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const totalPaid = renewalInvoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + (inv.total || 0), 0);
  const totalPending = renewalInvoices.filter((inv) => inv.status === "sent" || inv.status === "overdue").reduce((s, inv) => s + (inv.total || 0) - (inv.amount_paid || 0), 0);
  const currency = renewalInvoices[0]?.currency || "EUR";

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (renewalInvoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem faturas de renovação</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            As faturas de renovação são geradas automaticamente quando um contrato
            é renovado. Pode gerir os contratos no módulo de Renovações.
          </p>
          <Button className="gap-2" onClick={() => navigate("/dashboard/renewals")}>
            Ir para Renovações
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground font-medium">Total Faturado (Renovações)</p>
            <p className="text-2xl font-bold">{fmt(totalRenewalRevenue)}</p>
            <p className="text-xs text-muted-foreground">{renewalInvoices.length} faturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground font-medium">Recebido</p>
            <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground font-medium">Pendente</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-600" />
              Faturas de Renovação
            </h3>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="partially_paid">Parcial</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => navigate("/dashboard/renewals")}
              >
                Ver Contratos
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nº Fatura</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Data Emissão</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Pago</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const sc = statusConfig[invoice.status] || statusConfig.draft;
                return (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                  >
                    <TableCell className="text-sm font-medium">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                        {invoice.invoice_number}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{invoice.client_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: pt })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(invoice.due_date), "dd MMM yyyy", { locale: pt })}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {fmt(invoice.total)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {fmt(invoice.amount_paid || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className="text-[10px]">
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma fatura de renovação com este filtro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
