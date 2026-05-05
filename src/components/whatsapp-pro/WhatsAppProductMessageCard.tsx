import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ExternalLink } from "lucide-react";

interface Props {
  productId: string;
  /** Texto livre da mensagem (caption do envio). */
  caption?: string | null;
  /** Metadata armazenada na mensagem (product_link, product_image, ...). */
  metadata?: Record<string, unknown> | null;
}

/**
 * Card visual de produto dentro do balão de conversa (mensagens com message_type='product').
 * Mostra imagem, nome, preço e link, com fallback gracioso.
 */
export function WhatsAppProductMessageCard({ productId, caption, metadata }: Props) {
  const { data: product, isLoading } = useQuery({
    queryKey: ["whatsapp-product-card", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, short_description, images, sheet_slug")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const fallbackName = (metadata?.product_name as string | undefined) ?? "Produto";
  const fallbackLink = metadata?.product_link as string | undefined;
  const fallbackImage = metadata?.product_image as string | undefined;
  const name = product?.name ?? fallbackName;
  const price = product?.base_price ?? (metadata?.product_price as number | undefined);
  const image = product?.images?.[0] ?? fallbackImage ?? null;
  const link = fallbackLink ?? (product?.sheet_slug ? `/produto/${product.sheet_slug}` : null);
  const description = product?.short_description ?? null;

  return (
    <div className="rounded-lg border bg-background overflow-hidden max-w-xs shadow-sm">
      {image && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <Package className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight line-clamp-2">{name}</p>
            {typeof price === "number" && (
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{price.toFixed(2)} €</p>
            )}
          </div>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
        </div>
        {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            Ver produto
          </a>
        )}
        {caption && caption.trim().length > 0 && (
          <p className="text-xs whitespace-pre-wrap pt-2 border-t mt-2">{caption}</p>
        )}
      </div>
    </div>
  );
}
