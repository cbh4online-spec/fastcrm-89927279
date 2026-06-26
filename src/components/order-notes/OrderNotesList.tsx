import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OrderNoteFilters } from "./OrderNoteFilters";
import { useOrderNotes } from "@/hooks/useOrderNotes";
import type { OrderNoteStatus } from "@/types/order-note";
import { Eye, CreditCard, FileText } from "lucide-react";
import {
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
} from "@/components/documents/listing";

const statusMap: Record<string, { label: string; tone: DocumentStatusTone }> = {
  draft: { label: "Rascunho", tone: "draft" },
  submitted: { label: "Submetida", tone: "sent" },
  pending_approval: { label: "Pendente Aprovação", tone: "pending" },
  approved: { label: "Aprovada", tone: "approved" },
  rejected: { label: "Rejeitada", tone: "rejected" },
  converted: { label: "Convertida", tone: "paid" },
  cancelled: { label: "Cancelada", tone: "cancelled" },
};

export function OrderNotesList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    status?: OrderNoteStatus | "all";
    search?: string;
  }>({});

  const { orders, loading, error } = useOrderNotes(filters);

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Erro ao carregar encomendas: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OrderNoteFilters onFiltersChange={setFilters} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhuma encomenda encontrada
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => {
            const s = statusMap[order.status as string] || { label: order.status, tone: "neutral" as DocumentStatusTone };
            const issueDate = order.submitted_at
              ? format(new Date(order.submitted_at), "dd/MM/yyyy", { locale: pt })
              : format(new Date(order.created_at), "dd/MM/yyyy", { locale: pt });
            return (
              <DocumentRow
                key={order.id}
                statusBadge={<DocumentStatusBadge label={s.label} tone={s.tone} />}
                number={order.order_number}
                subtitle="NOTA DE ENCOMENDA"
                clientName={order.client_user?.name || "—"}
                clientSubtitle={order.client_user?.email || undefined}
                issueDate={issueDate}
                totalPrimary={`€${order.total_gross?.toFixed(2) || "0.00"}`}
                totalSecondary={order.installment_requested ? "Prestações" : undefined}
                onClick={() => navigate(`/dashboard/order-notes/${order.id}`)}
                action={
                  <div className="flex items-center gap-1">
                    {order.installment_requested && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Prestações
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/order-notes/${order.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
