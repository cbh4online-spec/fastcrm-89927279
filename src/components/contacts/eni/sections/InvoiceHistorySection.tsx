import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Receipt } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface InvoiceHistorySectionProps {
  contactId?: string;
  companyId?: string;
}

export function InvoiceHistorySection({ contactId, companyId }: InvoiceHistorySectionProps) {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInvoices({
    contact_id: contactId,
    company_id: companyId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Paga</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Enviada</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground">Cancelada</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const totalPending = invoices
    .filter(inv => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-card dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <Receipt className="h-4 w-4 text-amber-500" />
            </div>
            Histórico de Faturas
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard/invoices")}
            className="text-xs"
          >
            Ver todas
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <CardDescription>
          Faturas emitidas para este {contactId ? "contacto" : "empresa"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200/50">
              <p className="text-xs text-green-600 dark:text-green-400">Total Pago</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50">
              <p className="text-xs text-amber-600 dark:text-amber-400">Pendente</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        )}

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem faturas emitidas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.issue_date), "d MMM yyyy", { locale: pt })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatCurrency(Number(invoice.total))}</span>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            ))}
            {invoices.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{invoices.length - 5} faturas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
