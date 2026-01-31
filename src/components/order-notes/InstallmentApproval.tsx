import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CreditCard, Calculator, MessageSquare, Wallet } from "lucide-react";
import type { OrderNote } from "@/types/order-note";

interface InstallmentApprovalProps {
  order: OrderNote;
}

export function InstallmentApproval({ order }: InstallmentApprovalProps) {
  if (!order.installment_requested) return null;

  const installmentValue = order.total_gross / (order.installment_count || 1);
  const creditLimit = order.client_user?.credit_limit || 0;
  const isWithinLimit = order.total_gross <= creditLimit;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          Pedido de Pagamento em Prestações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Nº de Prestações</p>
              <p className="font-semibold text-lg">{order.installment_count}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <Calculator className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Valor por Prestação</p>
              <p className="font-semibold text-lg">€{installmentValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <Wallet className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Limite de Crédito</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg">
                  {creditLimit > 0 ? `€${creditLimit.toFixed(2)}` : "Não definido"}
                </p>
                {creditLimit > 0 && (
                  <Badge
                    variant="outline"
                    className={
                      isWithinLimit
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-red-100 text-red-700 border-red-300"
                    }
                  >
                    {isWithinLimit ? "OK" : "Excede"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
            <MessageSquare className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Total da Encomenda</p>
              <p className="font-semibold text-lg">€{order.total_gross?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {order.installment_notes && (
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Justificação do Cliente:
            </p>
            <p className="text-sm text-muted-foreground italic">
              "{order.installment_notes}"
            </p>
          </div>
        )}

        {!isWithinLimit && creditLimit > 0 && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ O valor total da encomenda (€{order.total_gross?.toFixed(2)}) excede o
              limite de crédito do cliente (€{creditLimit.toFixed(2)}).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
