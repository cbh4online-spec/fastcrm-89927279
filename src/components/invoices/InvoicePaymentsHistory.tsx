import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoicePayments, type InvoicePayment } from "@/hooks/useInvoicePayments";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreditCard, Euro } from "lucide-react";

interface InvoicePaymentsHistoryProps {
  invoiceId: string;
  invoiceTotal: number;
  amountPaid: number;
  currency: string;
}

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferência",
  mbway: "MB WAY",
  multibanco: "Multibanco",
  cash: "Numerário",
  check: "Cheque",
  card: "Cartão",
  other: "Outro",
};

export function InvoicePaymentsHistory({
  invoiceId,
  invoiceTotal,
  amountPaid,
  currency,
}: InvoicePaymentsHistoryProps) {
  const { t } = useTranslation("invoices");
  const { data: payments, isLoading } = useInvoicePayments(invoiceId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);

  const progressPercent = invoiceTotal > 0 ? Math.min(100, (amountPaid / invoiceTotal) * 100) : 0;
  const remaining = Math.max(0, invoiceTotal - amountPaid);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {t("paymentsHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("paymentProgress")}</span>
            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("totalPaidLabel")}: {formatCurrency(amountPaid)}</span>
            <span>{t("remainingLabel")}: {formatCurrency(remaining)}</span>
          </div>
        </div>

        {/* Payments list */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.payment_date), "d MMM yyyy", { locale: pt })}
                      {payment.payment_method && ` · ${METHOD_LABELS[payment.payment_method] || payment.payment_method}`}
                    </p>
                  </div>
                </div>
                {payment.reference && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {payment.reference}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("noPayments")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
