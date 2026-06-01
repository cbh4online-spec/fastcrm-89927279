import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInvoice, useInvoiceItems, useMarkInvoicePaid, useSendInvoice, useForceInvoiceStatus, type InvoiceStatus } from "@/hooks/useInvoices";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Mail,
  CreditCard,
  ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { RegisterPaymentDialog } from "@/components/invoices/RegisterPaymentDialog";
import { InvoicePaymentsHistory } from "@/components/invoices/InvoicePaymentsHistory";
import { PaymentActionsCard } from "@/components/invoices/PaymentActionsCard";
import { InvoiceWhatsAppHistoryCard } from "@/components/invoices/InvoiceWhatsAppHistoryCard";
import { PushToInvoiceXpressButton } from "@/components/invoices/PushToInvoiceXpressButton";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviada", variant: "default" },
  paid: { label: "Paga", variant: "default" },
  partially_paid: { label: "Parcialmente Paga", variant: "outline" },
  overdue: { label: "Vencida", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useWorkspace();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: items, isLoading: itemsLoading } = useInvoiceItems(id);
  const markAsPaid = useMarkInvoicePaid();
  const sendInvoice = useSendInvoice();
  const forceStatus = useForceInvoiceStatus();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["invoice-company", invoice?.company_id],
    enabled: !!invoice?.company_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, email, nif")
        .eq("id", invoice!.company_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: contact } = useQuery({
    queryKey: ["invoice-contact", invoice?.contact_id],
    enabled: !!invoice?.contact_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email")
        .eq("id", invoice!.contact_id!)
        .maybeSingle();
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
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
  const canRegisterPayment = invoice.status === "sent" || invoice.status === "overdue" || invoice.status === "partially_paid";
  const remaining = Math.max(0, invoice.total - (invoice.amount_paid || 0));

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
            <PushToInvoiceXpressButton
              invoiceId={invoice.id}
              externalProvider={(invoice as any).external_provider}
              externalUrl={(invoice as any).external_url}
            />
            {invoice.status === "draft" && (
              <Button variant="outline" onClick={handleSendInvoice} disabled={sendInvoice.isPending}>
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            )}
            {canRegisterPayment && (
              <Button onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Registar Pagamento
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
                      <p className="font-medium">{company?.name || "Empresa"}</p>
                      <p className="text-sm text-muted-foreground">
                        {company?.nif ? `NIF ${company.nif}` : null}
                        {company?.nif && company?.email ? " · " : null}
                        {company?.email || (!company ? "A carregar…" : null)}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.contact_id && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{contact?.name || "Contacto"}</p>
                      {contact?.email && (
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      )}
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
                        {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                          <>
                            <div className="flex justify-between gap-8 text-sm text-green-600">
                              <span>Pago</span>
                              <span>{formatCurrency(invoice.amount_paid)}</span>
                            </div>
                            <div className="flex justify-between gap-8 text-sm font-semibold text-destructive">
                              <span>Em dívida</span>
                              <span>{formatCurrency(remaining)}</span>
                            </div>
                          </>
                        )}
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

            {/* Online Payment (admin) — neutral, no provider branding */}
            {canRegisterPayment && (
              <PaymentActionsCard
                invoiceId={invoice.id}
                invoiceTotal={invoice.total}
                amountPaid={invoice.amount_paid || 0}
                currency={invoice.currency}
                invoiceNumber={invoice.invoice_number}
              />
            )}

            {/* Histórico de envios por WhatsApp */}
            {canRegisterPayment && (
              <InvoiceWhatsAppHistoryCard invoiceId={invoice.id} />
            )}

            {/* Payments History */}
            <InvoicePaymentsHistory
              invoiceId={invoice.id}
              invoiceTotal={invoice.total}
              amountPaid={invoice.amount_paid || 0}
              currency={invoice.currency}
            />

            {/* Super Admin: Force Status */}
            {isSuperAdmin && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    Alterar Estado (Admin)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Alteração manual do estado — apenas super admins.
                  </p>
                  <Select
                    value={invoice.status}
                    onValueChange={(value) => {
                      forceStatus.mutate({ id: invoice.id, status: value as InvoiceStatus });
                    }}
                    disabled={forceStatus.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="paid">Paga</SelectItem>
                      <SelectItem value="partially_paid">Parcialmente Paga</SelectItem>
                      <SelectItem value="overdue">Vencida</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Register Payment Dialog */}
      {canRegisterPayment && (
        <RegisterPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoiceId={invoice.id}
          invoiceTotal={invoice.total}
          amountPaid={invoice.amount_paid || 0}
          currency={invoice.currency}
        />
      )}
    </DashboardLayout>
  );
}
