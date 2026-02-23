import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useProtocolKits, kitLevelConfig } from "@/hooks/client-portal/useProtocolKits";
import { useCartRecommendations } from "@/hooks/client-portal/useAIRecommendations";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateVAT } from "@/types/order-note";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingCart, Loader2, Info, Sparkles, Package, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export default function ClientProtocolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clientUser } = useClientAuth();
  const { data: kits = [], isLoading: kitsLoading } = useProtocolKits(id);
  const { addItem } = useCart();
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch protocol info
  const { data: protocol } = useQuery({
    queryKey: ["protocol-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("product_protocols")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Auto-select default or first kit
  const selectedKit = useMemo(() => {
    if (kits.length === 0) return null;
    if (selectedKitId) return kits.find((k) => k.id === selectedKitId) || kits[0];
    const defaultKit = kits.find((k) => k.is_default);
    return defaultKit || kits[0];
  }, [kits, selectedKitId]);

  // Init quantities from kit items
  useMemo(() => {
    if (selectedKit) {
      const q: Record<string, number> = {};
      selectedKit.items.forEach((item) => {
        if (!quantities[item.product_id]) {
          q[item.product_id] = item.suggested_qty;
        }
      });
      if (Object.keys(q).length > 0) {
        setQuantities((prev) => ({ ...q, ...prev }));
      }
    }
  }, [selectedKit?.id]);

  // AI recommendations
  const kitProductIds = selectedKit?.items.map((i) => i.product_id) || [];
  const { data: aiRecs = [] } = useCartRecommendations(kitProductIds, clientUser?.workspace_id);

  // Calculate totals
  const vatRate = 23;
  const totals = useMemo(() => {
    if (!selectedKit) return { subtotal: 0, vat: 0, total: 0 };
    const subtotal = selectedKit.items.reduce((sum, item) => {
      const qty = quantities[item.product_id] || item.suggested_qty;
      const price = item.product?.base_price || 0;
      return sum + price * qty;
    }, 0);
    const discount = protocol?.discount_percentage ? subtotal * (protocol.discount_percentage / 100) : 0;
    const netAfterDiscount = subtotal - discount;
    const vat = calculateVAT(netAfterDiscount, vatRate);
    return { subtotal, discount, netAfterDiscount, vat, total: netAfterDiscount + vat };
  }, [selectedKit, quantities, protocol?.discount_percentage]);

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta),
    }));
  };

  const handleAddKitToCart = () => {
    if (!selectedKit) return;
    selectedKit.items.forEach((item) => {
      if (!item.product) return;
      const qty = quantities[item.product_id] || item.suggested_qty;
      addItem({
        product_id: item.product_id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        product_image_url: item.product.images?.[0] || null,
        quantity: qty,
        unit_price_net: item.product.base_price,
        vat_rate: vatRate,
      });
    });
    setAddedToCart(true);
    toast.success("Kit adicionado ao carrinho!");
    setTimeout(() => setAddedToCart(false), 3000);
  };

  if (kitsLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Back */}
        <Link to="/client/diagnosis">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>

        {/* Protocol Header */}
        {protocol && (
          <div className="flex flex-col md:flex-row gap-6">
            {protocol.image_url && (
              <div className="w-full md:w-64 h-48 rounded-lg overflow-hidden shrink-0">
                <img src={protocol.image_url} alt={protocol.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{protocol.name}</h1>
              {protocol.short_description && (
                <p className="text-muted-foreground">{protocol.short_description}</p>
              )}
              {protocol.description && (
                <p className="text-sm text-muted-foreground">{protocol.description}</p>
              )}
              {protocol.discount_percentage > 0 && (
                <Badge variant="default">-{protocol.discount_percentage}% no kit</Badge>
              )}
            </div>
          </div>
        )}

        {/* Guardrail */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Recomendação técnica — confirme com protocolo profissional antes de aplicar.
          </p>
        </div>

        {/* Kit Level Selector */}
        {kits.length > 1 && (
          <div className="flex gap-2">
            {kits.map((kit) => {
              const config = kitLevelConfig[kit.kit_level] || kitLevelConfig.basic;
              return (
                <Button
                  key={kit.id}
                  variant={selectedKit?.id === kit.id ? "default" : "outline"}
                  onClick={() => setSelectedKitId(kit.id)}
                  className="gap-2"
                >
                  <Badge className={`${config.bgColor} ${config.color} border-0`}>{config.label}</Badge>
                  {kit.kit_name}
                </Button>
              );
            })}
          </div>
        )}

        {/* Kit Items */}
        {selectedKit && selectedKit.items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedKit.kit_name}
              </CardTitle>
              {selectedKit.description && (
                <CardDescription>{selectedKit.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedKit.items.map((item) => {
                const qty = quantities[item.product_id] || item.suggested_qty;
                const price = item.product?.base_price || 0;
                const lineTotal = price * qty;

                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product?.name}
                        className="w-16 h-16 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product?.name}</p>
                      <p className="text-sm text-muted-foreground">{price.toFixed(2)}€/un (s/IVA)</p>
                      {item.is_optional && <Badge variant="outline" className="text-xs mt-1">Opcional</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.product_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.product_id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-medium w-24 text-right">{lineTotal.toFixed(2)}€</p>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal (s/IVA)</span>
                  <span>{totals.subtotal.toFixed(2)}€</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto Kit (-{protocol?.discount_percentage}%)</span>
                    <span>-{totals.discount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>IVA ({vatRate}%)</span>
                  <span>{totals.vat.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total (c/IVA)</span>
                  <span>{totals.total.toFixed(2)}€</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleAddKitToCart}
                disabled={addedToCart}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-5 w-5" /> Adicionado!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" /> Adicionar Kit ao Carrinho
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum kit configurado para este protocolo.
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        {aiRecs.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Complementares e Upgrades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiRecs.map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{rec.product_name}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{rec.type}</Badge>
                    {rec.base_price && (
                      <span className="text-sm font-medium">{rec.base_price.toFixed(2)}€</span>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground italic">
                Recomendação gerada por IA — confirme com protocolo profissional.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
