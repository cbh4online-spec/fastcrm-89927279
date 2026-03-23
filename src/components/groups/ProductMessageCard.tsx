import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

interface ProductMessageCardProps {
  productId: string;
  isMe: boolean;
}

export function ProductMessageCard({ productId, isMe }: ProductMessageCardProps) {
  const { data: product } = useQuery({
    queryKey: ["product-card", productId],
    queryFn: async () => {
      const { data } = await sb
        .from("products")
        .select("id, name, base_price, sku, images, primary_image_index, currency")
        .eq("id", productId)
        .single();
      return data;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
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
      </div>
    </div>
  );
}
