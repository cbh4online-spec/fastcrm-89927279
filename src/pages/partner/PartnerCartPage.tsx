import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { Link } from "react-router-dom";

export default function PartnerCartPage() {
  const { items, itemCount, subtotalNet, updateQuantity, removeItem, clearCart, poNumber, setPoNumber, orderNotes, setOrderNotes } = usePartnerCart();

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carrinho B2B</h1>
            <p className="text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearCart}>Limpar Carrinho</Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Carrinho vazio</p>
            <p className="mt-1">Adicione produtos a partir do catálogo.</p>
            <Link to="/partner/catalog"><Button className="mt-4">Ver Catálogo</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <Card key={item.product_id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.product_name} className="w-16 h-16 rounded object-cover bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                      <p className="text-sm font-semibold mt-1">{formatMoneyEur(item.unit_price_net)} / un</p>
                      {item.pvp_recommended && <p className="text-xs text-muted-foreground">PVP: {formatMoneyEur(item.pvp_recommended)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity - item.pack_size)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity + item.pack_size)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold text-sm">{formatMoneyEur(item.unit_price_net * item.quantity)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (net)</span>
                    <span className="font-semibold">{formatMoneyEur(subtotalNet)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA (23%)</span>
                    <span>{formatMoneyEur(subtotalNet * 0.23)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatMoneyEur(subtotalNet * 1.23)}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium">Nº Pedido de Compra (PO)</label>
                    <Input placeholder="PO-12345" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notas</label>
                    <Input placeholder="Notas para a encomenda..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                  </div>

                  <Link to="/partner/checkout">
                    <Button className="w-full" size="lg">Confirmar Encomenda</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
