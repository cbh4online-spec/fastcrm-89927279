import { Link } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orderNoteStatusConfig, type OrderNote } from "@/types/order-note";
import { ArrowRight, CreditCard, Package } from "lucide-react";

interface OrderCardProps {
  order: OrderNote;
}

export function OrderCard({ order }: OrderCardProps) {
  const statusConfig = orderNoteStatusConfig[order.status];
  const itemCount = order.items?.length || 0;

  return (
    <Card className="hover:border-primary/50 transition-colors group">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          {/* Header: Order number + Status */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg font-mono">
                  {order.order_number}
                </h3>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  {statusConfig.labelPT}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {order.submitted_at 
                  ? format(new Date(order.submitted_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })
                  : format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })
                }
              </p>
            </div>
            
            {/* Total */}
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {order.total_gross.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground">c/ IVA</p>
            </div>
          </div>

          {/* Products Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>{itemCount} {itemCount === 1 ? "produto" : "produtos"}</span>
            </div>
            
            {order.installment_requested && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <CreditCard className="h-4 w-4" />
                <span>{order.installment_count}x prestações</span>
              </div>
            )}
          </div>

          {/* Product Images Preview (if available) */}
          {order.items && order.items.length > 0 && (
            <div className="flex gap-2">
              {order.items.slice(0, 4).map((item, index) => (
                <div
                  key={item.id}
                  className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0"
                >
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
              {order.items.length > 4 && (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{order.items.length - 4}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Client Notes */}
          {order.client_notes && (
            <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg p-3">
              <span className="font-medium">Notas:</span> {order.client_notes}
            </p>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <Link to={`/client/orders/${order.id}`}>
              <Button variant="outline" size="sm" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                Ver detalhes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
