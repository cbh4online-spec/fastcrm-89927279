import { ShoppingCart, Package, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactOrderNotes } from "@/hooks/useContactOrderNotes";
import { orderNoteStatusConfig } from "@/types/order-note";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";

interface ContactOrderNotesSectionProps {
  contactId: string;
}

export function ContactOrderNotesSection({ contactId }: ContactOrderNotesSectionProps) {
  const { orders, loading, error } = useContactOrderNotes(contactId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Erro ao carregar encomendas: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
          <CardDescription>
            Encomendas associadas a este contacto através do Portal B2B
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              Sem encomendas B2B associadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              As encomendas aparecerão aqui quando o contacto tiver um cliente B2B associado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Encomendas B2B
          <Badge variant="secondary" className="ml-auto">
            {orders.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Histórico de encomendas via Portal B2B
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map((order) => {
          const statusConfig = order.status ? orderNoteStatusConfig[order.status] : null;
          
          return (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {order.order_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {order.created_at && format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: pt })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {order.installment_requested && (
                  <Badge variant="outline" className="text-xs">
                    {order.installment_count}x prestações
                  </Badge>
                )}
                
                <span className="font-semibold text-sm">
                  {order.total_gross?.toLocaleString('pt-PT', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  })}
                </span>
                
                {statusConfig && (
                  <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                    {statusConfig.labelPT}
                  </Badge>
                )}
                
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/dashboard/order-notes/${order.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
