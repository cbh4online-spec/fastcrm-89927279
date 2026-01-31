import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { OrderNoteStatusBadge } from "./OrderNoteStatusBadge";
import { OrderNoteFilters } from "./OrderNoteFilters";
import { useOrderNotes } from "@/hooks/useOrderNotes";
import type { OrderNoteStatus } from "@/types/order-note";
import { Eye, CreditCard, FileText } from "lucide-react";

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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma encomenda encontrada
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow 
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/dashboard/order-notes/${order.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.client_user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.client_user?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.submitted_at
                      ? format(new Date(order.submitted_at), "dd MMM yyyy", { locale: pt })
                      : format(new Date(order.created_at), "dd MMM yyyy", { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <OrderNoteStatusBadge status={order.status} size="sm" />
                      {order.installment_requested && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Prestações
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    €{order.total_gross?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
