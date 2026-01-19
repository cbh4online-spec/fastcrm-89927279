import { useParams, useNavigate } from "react-router-dom";
import { useInvoice, useInvoiceItems, useMarkInvoicePaid, useSendInvoice } from "@/hooks/useInvoices";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Send, 
  Calendar,
  Building2,
  User,
  Euro,
  Clock,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviada", variant: "default" },
  paid: { label: "Paga", variant: "default" },
  overdue: { label: "Vencida", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: items, isLoading: itemsLoading } = useInvoiceItems(id);
  const markAsPaid = useMarkInvoicePaid();
  const sendInvoice = useSendInvoice();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handleMarkAsPaid = async () => {
    if (!id) return;
    try {
      await markAsPaid.mutateAsync({ id });
      toast.success("Fatura marcada como paga!");
    } catch (error) {
      toast.error("Erro ao marcar fatura como paga");
    }
  };

  const handleSendInvoice = async () => {
    if (!id) return;
    try {
      await sendInvoice.mutateAsync(id);
      toast.success("Fatura enviada!");
    } catch (error) {
      toast.error("Erro ao enviar fatura");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <FileText className="w-16 h-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Fatura não encontrada</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/invoices")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às faturas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.draft;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/invoices")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Fatura #{invoice.invoice_number}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em {format(new Date(invoice.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === "draft" && (
              <Button variant="outline" onClick={handleSendInvoice} disabled={sendInvoice.isPending}>
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            )}
            {(invoice.status === "sent" || invoice.status === "overdue") && (
              <Button onClick={handleMarkAsPaid} disabled={markAsPaid.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Paga
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.company_id && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Empresa</p>
                      <p className="text-sm text-muted-foreground">{invoice.company_id}</p>
                    </div>
                  </div>
                )}
                {invoice.contact_id && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Contacto</p>
                      <p className="text-sm text-muted-foreground">{invoice.contact_id}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Itens da Fatura</CardTitle>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : items && items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground pb-2 border-b">
                      <div className="col-span-5">Descrição</div>
                      <div className="col-span-2 text-center">Qtd</div>
                      <div className="col-span-2 text-right">Preço Unit.</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    {items.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 items-center py-2">
                        <div className="col-span-5">
                          <p className="font-medium">{item.description}</p>
                        </div>
                        <div className="col-span-2 text-center">{item.quantity}</div>
                        <div className="col-span-2 text-right">{formatCurrency(item.unit_price)}</div>
                        <div className="col-span-3 text-right font-medium">{formatCurrency(item.total)}</div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-end">
                      <div className="space-y-1 text-right">
                        <div className="flex justify-between gap-8 text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {invoice.tax_amount > 0 && (
                          <div className="flex justify-between gap-8 text-sm">
                            <span className="text-muted-foreground">IVA</span>
                            <span>{formatCurrency(invoice.tax_amount)}</span>
                          </div>
                        )}
                        {invoice.discount_amount > 0 && (
                          <div className="flex justify-between gap-8 text-sm">
                            <span className="text-muted-foreground">Desconto</span>
                            <span>-{formatCurrency(invoice.discount_amount)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between gap-8 font-bold text-lg">
                          <span>Total</span>
                          <span>{formatCurrency(invoice.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem itens</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Euro className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-xl font-bold">{formatCurrency(invoice.total)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Emissão</p>
                    <p className="font-medium">
                      {format(new Date(invoice.issue_date), "d MMM yyyy", { locale: pt })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                    <p className="font-medium">
                      {format(new Date(invoice.due_date), "d MMM yyyy", { locale: pt })}
                    </p>
                  </div>
                </div>
                {invoice.sent_at && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enviada em</p>
                      <p className="font-medium">
                        {format(new Date(invoice.sent_at), "d MMM yyyy", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.paid_at && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Paga em</p>
                      <p className="font-medium text-emerald-600">
                        {format(new Date(invoice.paid_at), "d MMM yyyy", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
