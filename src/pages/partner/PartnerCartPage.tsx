import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerCartTotals } from "@/hooks/partner/usePartnerCartTotals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { FreeShippingBar } from "@/components/partner/FreeShippingBar";
import { CouponInput } from "@/components/partner/CouponInput";
import { OrderSummaryBreakdown } from "@/components/partner/OrderSummaryBreakdown";
import { CrossSellRail } from "@/components/partner/CrossSellRail";

export default function PartnerCartPage() {
  const { partnerUser } = usePartnerAuth();
  const {
    items, itemCount, subtotalNet, updateQuantity, removeItem, clearCart,
    poNumber, setPoNumber, orderNotes, setOrderNotes,
    couponCode, setCouponCode, emitFunnelEvent,
  } = usePartnerCart();

  const { totals, loading: totalsLoading } = usePartnerCartTotals(
    partnerUser?.workspace_id,
    partnerUser?.partner_account_id,
    items,
    couponCode,
  );

  // emit view_cart once
  useEffect(() => { emitFunnelEvent('view_cart', { item_count: items.length }); }, []); // eslint-disable-line

  return (
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
          {/* Items + recomendações */}
          <div className="lg:col-span-2 space-y-3">
            <FreeShippingBar
              threshold={totals.free_shipping_threshold}
              remaining={totals.free_shipping_remaining}
              subtotal={totals.subtotal_net || subtotalNet}
            />
            {items.map((item) => {
              const line = totals.lines.find((l) => l.product_id === item.product_id);
              const hasDiscount = !!line && line.discount_pct > 0;
              return (
                <Card key={item.product_id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.product_name} className="w-16 h-16 rounded object-cover bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                      <p className="text-sm font-semibold mt-1">{formatMoneyEur(item.unit_price_net)} / un</p>
                      {hasDiscount && (
                        <p className="text-xs text-emerald-700 mt-0.5">
                          −{line!.discount_pct}% {line!.discount_source === 'bundle' ? '(bundle)' : '(escalão)'}
                        </p>
                      )}
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
                    <div className="text-right min-w-[90px]">
                      <p className="font-bold text-sm">{formatMoneyEur((line?.line_total_net) ?? item.unit_price_net * item.quantity)}</p>
                      {hasDiscount && (
                        <p className="text-xs text-muted-foreground line-through">{formatMoneyEur(line!.line_total_original)}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            <CrossSellRail
              partnerAccountId={partnerUser?.partner_account_id}
              cartProductIds={items.map((i) => i.product_id)}
            />
          </div>

          {/* Resumo */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <OrderSummaryBreakdown totals={totals} fallbackSubtotal={subtotalNet} />

                <CouponInput
                  couponCode={couponCode}
                  onApply={(code) => { setCouponCode(code); emitFunnelEvent('apply_coupon', { code }); }}
                  onRemove={() => setCouponCode(null)}
                  totals={totals}
                  loading={totalsLoading}
                />

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Nº Pedido de Compra (PO)</label>
                  <Input placeholder="PO-12345" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notas</label>
                  <Input placeholder="Notas para a encomenda..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>

                <Link to="/partner/checkout" onClick={() => emitFunnelEvent('start_checkout')}>
                  <Button className="w-full" size="lg">Confirmar Encomenda</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
