import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

const sb = supabase as any;

interface ProductMessageCardProps {
  productId: string;
  isMe: boolean;
  workspaceId?: string;
}

export function ProductMessageCard({ productId, isMe, workspaceId }: ProductMessageCardProps) {
  const { data: product } = useQuery({
    queryKey: ["product-card", productId],
    queryFn: async () => {
      const { data } = await sb
        .from("products")
        .select("id, name, base_price, sku, images, primary_image_index, currency, workspace_id")
        .eq("id", productId)
        .single();
      return data;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
  });

  const wsId = product?.workspace_id || workspaceId;

  const { data: storeSettings } = useQuery({
    queryKey: ["store-slug-for-card", wsId],
    queryFn: async () => {
      const { data } = await sb
        .from("store_settings")
        .select("store_slug")
        .eq("workspace_id", wsId)
        .maybeSingle();
      return data;
    },
    enabled: !!wsId,
    staleTime: 1000 * 60 * 30,
  });

  if (!product) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Package className="h-4 w-4" />
        <span className="text-xs italic">Produto</span>
      </div>
    );
  }

  const imgIdx = product.primary_image_index ?? 0;
  const imageUrl = product.images?.length > 0 ? product.images[imgIdx] || product.images[0] : null;
  const price = new Intl.NumberFormat("pt-PT", { style: "currency", currency: product.currency || "EUR" }).format(product.base_price || 0);

  const slug = storeSettings?.store_slug || wsId;
  const buyUrl = slug ? `${getPublicBaseUrl()}/store/${slug}/product/${productId}` : null;

  return (
    <div className={`rounded-md overflow-hidden border ${isMe ? "border-primary-foreground/20" : "border-border"} mt-1`}>
      {imageUrl && (
        <img src={imageUrl} alt={product.name} className="w-full h-28 object-cover" />
      )}
      <div className={`p-2 ${isMe ? "bg-primary-foreground/10" : "bg-card"}`}>
        <p className={`text-sm font-medium ${isMe ? "" : "text-foreground"}`}>{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge variant={isMe ? "secondary" : "outline"} className="text-xs">{price}</Badge>
          {product.sku && <span className={`text-xs ${isMe ? "opacity-60" : "text-muted-foreground"}`}>SKU: {product.sku}</span>}
        </div>
        {buyUrl && (
          <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1">
              <ExternalLink className="h-3 w-3" />
              Comprar
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
