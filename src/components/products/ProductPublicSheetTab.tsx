import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { ProductContentSectionsEditor } from "./ProductContentSectionsEditor";
import { ProductOfferPageSettingsTab } from "./ProductOfferPageSettingsTab";
import { ProductQAModeration } from "./ProductQAModeration";

const sb = supabase as any;

interface Props {
  product: any;
  /** Abre o gestor de packs do catálogo. */
  onOpenBundles?: () => void;
}

/**
 * Gestão de tudo o que aparece na ficha de produto pública:
 * qualidade, secções de conteúdo, página de oferta, packs e perguntas.
 */
export function ProductPublicSheetTab({ product, onOpenBundles }: Props) {
  const [showQA, setShowQA] = useState(false);

  const { data: storeSlug } = useQuery({
    queryKey: ["store-slug", product?.workspace_id],
    enabled: !!product?.workspace_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("store_settings")
        .select("store_slug")
        .eq("workspace_id", product.workspace_id)
        .maybeSingle();
      if (error) throw error;
      return (data?.store_slug as string | null) ?? null;
    },
  });

  const publicUrl = storeSlug
    ? `/store/${storeSlug}/product/${product.store_slug || product.id}`
    : null;

  /** Mesma regra usada para noindex na ficha pública. */
  const quality = useMemo(() => {
    const images: string[] = Array.isArray(product?.images) ? product.images : [];
    const hasImage = images.length > 0 || !!product?.image_url;
    const description: string = product?.commercial_description || product?.description || "";
    const hasDescription = description.trim().length >= 120;
    const missing: string[] = [];
    if (!hasImage) missing.push("pelo menos uma imagem");
    if (!hasDescription) missing.push("descrição comercial com 120+ caracteres");
    if (!product?.sku) missing.push("SKU");
    return { complete: missing.length === 0, missing };
  }, [product]);

  return (
    <div className="space-y-4">
      <IXCard
        title="Qualidade da ficha"
        description="Fichas incompletas não são indexadas nem geram dados estruturados."
        actions={
          publicUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ver ficha pública
              </a>
            </Button>
          ) : undefined
        }
      >
        {quality.complete ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-foreground">Ficha completa e indexável.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-foreground">Ficha incompleta</span>
              <Badge variant="secondary">{quality.missing.length} em falta</Badge>
            </div>
            <ul className="list-disc pl-6 text-sm text-muted-foreground">
              {quality.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {!publicUrl && (
          <p className="mt-3 text-xs text-muted-foreground">
            Defina o endereço da loja nas Definições da Loja para pré-visualizar a ficha.
          </p>
        )}
      </IXCard>

      <ProductStoreSlugCard
        productId={product.id}
        productName={product.name}
        storeSlug={storeSlug ?? null}
        currentSlug={product.store_slug ?? null}
      />

      <ProductContentSectionsEditor productId={product.id} />

      <ProductOfferPageSettingsTab
        productId={product.id}
        workspaceId={product.workspace_id}
        metadata={product.metadata}
      />

      <IXCard
        title="Packs"
        description="Conjuntos com poupança mostrados na ficha pública."
        actions={
          onOpenBundles ? (
            <Button variant="outline" size="sm" onClick={onOpenBundles}>
              <Layers className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Gerir packs
            </Button>
          ) : undefined
        }
      >
        <p className="text-sm text-muted-foreground">
          Os packs são geridos no catálogo, na aba Bundles. Só aparecem na ficha pública quando estão ativos e
          incluem este produto.
        </p>
      </IXCard>

      <IXCard
        title="Perguntas e respostas"
        description="Perguntas deste produto. Só ficam visíveis na loja depois de aprovadas."
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowQA((v) => !v)}>
            {showQA ? "Ocultar" : "Ver perguntas"}
          </Button>
        }
      >
        {showQA ? (
          <ProductQAModeration productId={product.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Abra para responder, aprovar ou remover perguntas deste produto.
          </p>
        )}
      </IXCard>
    </div>
  );
}
