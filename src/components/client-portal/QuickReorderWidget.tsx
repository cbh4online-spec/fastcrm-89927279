import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export function QuickReorderWidget() {
  const { clientUser } = useClientAuth();
  const { orders } = useClientOrders(clientUser?.id);
  const { addItem } = useCart();

  // Get the latest completed/invoiced order
  const lastOrder = orders.find(
    (o) => o.status === "invoiced" || o.status === "approved" || o.status === "in_preparation"
  );

  if (!lastOrder) return null;

  const items = lastOrder.items || [];

  if (items.length === 0) return null;

  const handleReorder = () => {
    items.forEach((item) => {
      addItem({
        product_id: item.product_id || "",
        product_name: item.product_name,
        product_sku: item.product_sku || null,
        product_image_url: item.product_image_url || null,
        quantity: item.quantity,
        unit_price_net: item.unit_price_net,
        vat_rate: item.vat_rate,
      });
    });
    toast.success(`${items.length} produto(s) adicionados ao carrinho!`);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-primary/20 hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-xl bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          Repetir Última Encomenda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[180px]">
                {item.product_name}
              </span>
              <span className="font-medium">{item.quantity}x</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{items.length - 3} mais produto(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleReorder} size="sm" className="flex-1">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reencomendar
          </Button>
          <Link to="/client/cart">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
