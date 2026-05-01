import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { usePartnerCart } from "@/contexts/PartnerCartContext";

interface Recommendation {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
  image_url: string | null;
}

interface Props {
  partnerAccountId: string | null | undefined;
  cartProductIds: string[];
  limit?: number;
}

export function CrossSellRail({ partnerAccountId, cartProductIds, limit = 4 }: Props) {
  const { addItem } = usePartnerCart();
  const [items, setItems] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!partnerAccountId || cartProductIds.length === 0) {
      setItems([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('get_partner_recommendations', {
        p_partner_account_id: partnerAccountId,
        p_current_product_ids: cartProductIds,
        p_limit: limit,
      });
      if (error || !data || (data as unknown as Array<{ product_id: string }>).length === 0) {
        setItems([]);
        return;
      }
      const productIds = (data as unknown as Array<{ product_id: string }>).map((r) => r.product_id);
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, sku, base_price, image_url')
        .in('id', productIds);
      setItems((prods as Recommendation[]) || []);
    })();
  }, [partnerAccountId, cartProductIds.join(','), limit]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Compre frequentemente junto
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((p) => (
            <div key={p.id} className="border rounded-md p-2 space-y-2">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-20 object-cover rounded bg-muted" />
              ) : (
                <div className="w-full h-20 bg-muted rounded" />
              )}
              <p className="text-xs font-medium line-clamp-2 min-h-[2rem]">{p.name}</p>
              <p className="text-sm font-semibold">{formatMoneyEur(p.base_price)}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={() => addItem({
                  product_id: p.id,
                  product_name: p.name,
                  sku: p.sku,
                  quantity: 1,
                  unit_price_net: p.base_price,
                  pvp_recommended: null,
                  margin_estimated: null,
                  pack_size: 1,
                  moq: 1,
                  image_url: p.image_url,
                })}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
