import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { useClientInvoices } from "@/hooks/client-portal/useClientInvoices";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Receipt, Loader2, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useState, useMemo } from "react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  sent: { label: "Enviada", className: "bg-blue-100 text-blue-800" },
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paga", className: "bg-green-100 text-green-800" },
  overdue: { label: "Vencida", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

const fmt = (v: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);

export default function ClientInvoicesPage() {
  const { canViewInvoices, isLoading: permLoading } = useClientPermissions();
  const { invoices, isLoading } = useClientInvoices();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  if (permLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!canViewInvoices) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Faturas
          </h1>
          <p className="text-muted-foreground">Histórico de faturação da sua empresa</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar faturas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              Sem faturas encontradas
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((inv) => {
              const statusCfg = STATUS_MAP[inv.status] ?? STATUS_MAP.pending;
              const isOverdue =
                inv.status !== "paid" &&
                inv.status !== "cancelled" &&
                new Date(inv.due_date) < new Date();

              return (
                <Card key={inv.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{inv.invoice_number}</p>
                          <Badge variant="outline" className="text-xs">
                            {inv.document_type === "credit_note" ? "Nota Crédito" : "Fatura"}
                          </Badge>
                          <Badge variant="secondary" className={isOverdue ? "bg-red-100 text-red-800" : statusCfg.className}>
                            {isOverdue ? "Vencida" : statusCfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Emissão: {format(new Date(inv.issue_date), "d MMM yyyy", { locale: pt })}
                          {" · "}
                          Vencimento: {format(new Date(inv.due_date), "d MMM yyyy", { locale: pt })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-lg">{fmt(inv.total, inv.currency)}</p>
                      {inv.amount_paid != null && inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                        <p className="text-xs text-muted-foreground">
                          Pago: {fmt(inv.amount_paid, inv.currency)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
