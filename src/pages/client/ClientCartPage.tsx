import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useCart } from "@/contexts/CartContext";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Tag,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

const FREE_SHIPPING_THRESHOLD = 150; // €  s/ IVA (alvo motivacional)

export default function ClientCartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart, addItem, itemCount } = useCart();
  const { clientUser } = useClientAuth();
  const { favorites } = useClientFavorites();
  const { orders } = useClientOrders(clientUser?.id);

  const lastOrder = useMemo(
    () =>
      orders.find(
        (o) =>
          o.status === "invoiced" ||
          o.status === "approved" ||
          o.status === "in_preparation",
      ),
    [orders],
  );

  const cartProductIds = useMemo(
    () => new Set(cart.items.map((i) => i.product_id)),
    [cart.items],
  );

  // Sugestões = favoritos que ainda não estão no carrinho
  const suggestions = useMemo(() => {
    return favorites
      .filter((f) => f.product?.id && !cartProductIds.has(f.product_id))
      .slice(0, 4);
  }, [favorites, cartProductIds]);

  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - cart.total_net,
  );
  const freeShippingProgress = Math.min(
    100,
    (cart.total_net / FREE_SHIPPING_THRESHOLD) * 100,
  );
  const hasFreeShipping = remainingForFreeShipping === 0 && cart.total_net > 0;

  // Empty state ----------------------------------------------------------
  if (itemCount === 0) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto py-8">
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <ShoppingCart className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">O seu carrinho está vazio</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Explore o catálogo e adicione os seus produtos profissionais favoritos
                para começar uma nova encomenda.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
                <Link to="/client/catalog">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Package className="h-5 w-5 mr-2" />
                    Ver Catálogo
                  </Button>
                </Link>
                {favorites.length > 0 && (
                  <Link to="/client/favorites">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      <Heart className="h-5 w-5 mr-2" />
                      Os Meus Favoritos ({favorites.length})
                    </Button>
                  </Link>
                )}
              </div>

              {lastOrder && lastOrder.items && lastOrder.items.length > 0 && (
                <div className="border-t pt-8 mt-2">
                  <p className="text-sm font-medium mb-3">
                    Quer repetir a sua última encomenda?
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      lastOrder.items?.forEach((item) =>
                        addItem({
                          product_id: item.product_id || "",
                          product_name: item.product_name,
                          product_sku: item.product_sku || null,
                          product_image_url: item.product_image_url || null,
                          quantity: item.quantity,
                          unit_price_net: item.unit_price_net,
                          vat_rate: item.vat_rate,
                        }),
                      );
                      toast.success("Produtos adicionados ao carrinho");
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reencomendar {lastOrder.order_number}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  // Filled cart ----------------------------------------------------------
  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Carrinho de Compras
            </h1>
            <p className="text-muted-foreground text-sm">
              {itemCount} {itemCount === 1 ? "produto" : "produtos"} no carrinho
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/client/catalog">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continuar a Comprar
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove todos os {itemCount} produtos do carrinho. Não pode
                    ser anulada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearCart}>
                    Limpar carrinho
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Free shipping bar */}
        <Card
          className={
            hasFreeShipping
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-primary/30 bg-primary/5"
          }
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center ${
                  hasFreeShipping
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-primary/15 text-primary"
                }`}
              >
                <Truck className="h-4 w-4" />
              </div>
              <div className="flex-1 text-sm">
                {hasFreeShipping ? (
                  <p className="font-medium text-emerald-700">
                    Parabéns! A sua encomenda tem portes grátis 🎉
                  </p>
                ) : (
                  <p>
                    Faltam{" "}
                    <span className="font-semibold text-foreground">
                      {remainingForFreeShipping.toFixed(2)}€
                    </span>{" "}
                    para portes grátis (acima de {FREE_SHIPPING_THRESHOLD}€ s/ IVA).
                  </p>
                )}
              </div>
            </div>
            <Progress value={freeShippingProgress} className="h-1.5" />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.product_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                      {item.product_image_url ? (
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight truncate">
                            {item.product_name}
                          </h3>
                          {item.product_sku && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              SKU: {item.product_sku}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="font-medium text-primary">
                              {item.unit_price_net.toFixed(2)}€
                            </span>
                            <span className="text-muted-foreground text-xs">/ un. s/ IVA</span>
                            <Badge variant="secondary" className="text-[10px]">
                              IVA {item.vat_rate}%
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-1"
                          onClick={() => removeItem(item.product_id)}
                          aria-label="Remover produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Quantity + line total */}
                      <div className="mt-auto pt-3 flex items-end justify-between gap-3">
                        <div className="flex items-center border rounded-md bg-background">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-r-none"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.product_id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-14 h-9 text-center border-0 p-0 focus-visible:ring-0 rounded-none"
                            min={1}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-l-none"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-lg leading-tight">
                            {item.line_total_gross.toFixed(2)}€
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.line_total_net.toFixed(2)}€ s/ IVA
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Suggestions from favorites */}
            {suggestions.length > 0 && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Adicione dos seus favoritos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {suggestions.map((fav) => {
                      const p = fav.product;
                      const img =
                        p?.images && p.images.length > 0
                          ? p.images[p.primary_image_index ?? 0]
                          : null;
                      return (
                        <div
                          key={fav.id}
                          className="border rounded-lg p-2.5 hover:border-primary/50 transition-colors group flex flex-col"
                        >
                          <div className="aspect-square w-full bg-muted rounded mb-2 overflow-hidden">
                            {img ? (
                              <img
                                src={img}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium line-clamp-2 mb-1 min-h-[2rem]">
                            {p.name}
                          </p>
                          <p className="text-xs text-primary font-semibold mb-2">
                            {Number(p.base_price || 0).toFixed(2)}€
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs mt-auto"
                            onClick={() => {
                              addItem({
                                product_id: p.id,
                                product_name: p.name,
                                product_sku: p.sku,
                                product_image_url: img,
                                quantity: 1,
                                unit_price_net: Number(p.base_price || 0),
                                vat_rate: 23,
                              });
                              toast.success("Adicionado ao carrinho");
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reorder shortcut */}
            {lastOrder && lastOrder.items && lastOrder.items.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-primary/20">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/15">
                    <RefreshCw className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium">Repetir última encomenda</p>
                    <p className="text-xs text-muted-foreground">
                      {lastOrder.order_number} · {lastOrder.items.length} produtos
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      lastOrder.items?.forEach((item) =>
                        addItem({
                          product_id: item.product_id || "",
                          product_name: item.product_name,
                          product_sku: item.product_sku || null,
                          product_image_url: item.product_image_url || null,
                          quantity: item.quantity,
                          unit_price_net: item.unit_price_net,
                          vat_rate: item.vat_rate,
                        }),
                      );
                      toast.success("Produtos adicionados");
                    }}
                  >
                    Adicionar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <aside className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Resumo da Encomenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CouponField />

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal ({itemCount} {itemCount === 1 ? "item" : "itens"})
                    </span>
                    <span className="font-medium">{cart.total_net.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{cart.total_vat.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portes</span>
                    {hasFreeShipping ? (
                      <span className="text-emerald-700 font-medium">Grátis</span>
                    ) : (
                      <span className="text-muted-foreground italic">A calcular</span>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary leading-none">
                      {cart.total_gross.toFixed(2)}€
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">c/ IVA</p>
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

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground border rounded-md px-2 py-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Pagamento seguro</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground border rounded-md px-2 py-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Envio rápido</span>
                  </div>
                </div>

                <p className="text-[11px] text-center text-muted-foreground">
                  Encomenda sujeita a aprovação interna conforme política B2B.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </ClientLayout>
  );
}

// --------------------------------------------------------------------
// Coupon field — UI only (validação real será no checkout/RPC).
// --------------------------------------------------------------------
function CouponField() {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Tag className="h-4 w-4 text-emerald-700" />
          <span className="font-medium text-emerald-700">{applied}</span>
          <span className="text-xs text-muted-foreground">aplicado</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setApplied(null);
            setCode("");
          }}
        >
          Remover
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" /> Código promocional
      </label>
      <div className="flex gap-2">
        <Input
          placeholder="Ex: PARCEIRO10"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-9"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!code.trim()}
          onClick={() => {
            // Validação real ocorre no backend ao finalizar.
            setApplied(code.trim());
            toast.success("Código guardado para o checkout");
          }}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
