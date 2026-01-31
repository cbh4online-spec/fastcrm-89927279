import { Link, useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export default function ClientCartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart, itemCount } = useCart();

  if (itemCount === 0) {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Carrinho Vazio</h1>
          <p className="text-muted-foreground mb-6">
            Ainda não adicionou produtos ao carrinho.
          </p>
          <Link to="/client/catalog">
            <Button size="lg">
              <Package className="h-5 w-5 mr-2" />
              Ver Catálogo
            </Button>
          </Link>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Carrinho de Compras</h1>
            <p className="text-muted-foreground">
              {itemCount} {itemCount === 1 ? "produto" : "produtos"} no carrinho
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearCart}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.product_id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.product_image_url ? (
                        <img 
                          src={item.product_image_url} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.product_name}</h3>
                      {item.product_sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                      )}
                      <p className="text-sm text-primary font-medium mt-1">
                        {item.unit_price_net.toFixed(2)}€ <span className="text-muted-foreground font-normal">s/ IVA</span>
                      </p>
                    </div>

                    {/* Quantity & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-12 h-8 text-center border-0 p-0"
                          min={1}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.line_total_gross.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">c/ IVA</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumo da Encomenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
                    <span>{cart.total_net.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{cart.total_vat.toFixed(2)}€</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{cart.total_gross.toFixed(2)}€</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/client/checkout")}
                >
                  Finalizar Encomenda
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <Link to="/client/catalog">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continuar a Comprar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
