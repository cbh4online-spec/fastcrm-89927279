import { useState } from "react";

import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerCatalog, type PartnerCatalogProduct, type PartnerCatalogVariant } from "@/hooks/partner/usePartnerCatalog";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Package } from "lucide-react";
import { PartnerProductCard } from "@/components/partner/PartnerProductCard";

export default function PartnerCatalogPage() {
  const { partnerUser } = usePartnerAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [brand, setBrand] = useState<string>("");

  const { products, isLoading, categories, brands } = usePartnerCatalog({
    workspaceId: partnerUser?.workspace_id,
    partnerAccountId: partnerUser?.partner_account_id,
    search: search || undefined,
    category: category || undefined,
    brand: brand || undefined,
  });

  const { addItem } = usePartnerCart();

  /**
   * Adiciona o item correcto ao carrinho:
   * - Se o utilizador escolheu variante, usa-se o ID/SKU/preço/MOQ da variante.
   * - Caso contrário (produto simples), usa-se o produto pai.
   * O nome mostrado no carrinho concatena o rótulo da variante quando existe.
   */
  const handleAddToCart = ({
    product,
    variant,
  }: {
    product: PartnerCatalogProduct;
    variant: PartnerCatalogVariant | null;
  }) => {
    if (variant) {
      const pricing = variant.pricing;
      const variantImage = variant.images?.[0] ?? product.image_url;
      const labelSuffix = variant.variant_label ? ` — ${variant.variant_label}` : "";
      addItem({
        product_id: variant.id,
        product_name: `${product.name}${labelSuffix}`,
        sku: variant.sku,
        quantity: variant.min_order_quantity ?? 1,
        unit_price_net: pricing?.price_net ?? variant.base_price ?? 0,
        pvp_recommended: pricing?.pvp_recommended ?? null,
        margin_estimated: pricing?.gross_margin_pct ?? null,
        pack_size: variant.pack_size ?? 1,
        moq: variant.min_order_quantity ?? 1,
        image_url: variantImage,
      });
      return;
    }

    const pricing = product.pricing;
    addItem({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: product.moq || 1,
      unit_price_net: pricing?.price_net ?? product.base_price ?? 0,
      pvp_recommended: pricing?.pvp_recommended ?? product.pvp_recommended,
      margin_estimated: pricing?.gross_margin_pct ?? null,
      pack_size: product.pack_size || 1,
      moq: product.moq || 1,
      image_url: product.image_url,
    });
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo B2B</h1>
          <p className="text-muted-foreground">Produtos disponíveis para encomenda</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por nome ou SKU..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {categories.length > 0 && (
            <Select value={category} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {brands.length > 0 && (
            <Select value={brand} onValueChange={(v) => setBrand(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <PartnerProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
    </div>
  );
}
