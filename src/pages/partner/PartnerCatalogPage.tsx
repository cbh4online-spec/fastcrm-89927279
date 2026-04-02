import { useState } from "react";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerCatalog } from "@/hooks/partner/usePartnerCatalog";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Package } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";

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

  const handleAddToCart = (product: typeof products[0]) => {
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
    <PartnerLayout>
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
            {products.map((product) => {
              const pricing = product.pricing;
              const priceNet = pricing?.price_net ?? product.base_price ?? 0;
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {product.image_url && (
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                    </div>

                    {/* Pricing */}
                    <div className="space-y-1">
                      <p className="text-lg font-bold">{formatMoneyEur(priceNet)}</p>
                      {pricing?.price_source && pricing.price_source !== 'base' && (
                        <Badge variant="outline" className="text-xs">{pricing.price_source === 'price_list' ? 'Preço Lista' : 'Desc. Tier'}</Badge>
                      )}
                      {pricing?.pvp_recommended && (
                        <p className="text-xs text-muted-foreground">PVP: {formatMoneyEur(pricing.pvp_recommended)}</p>
                      )}
                      {pricing?.gross_margin_pct != null && (
                        <p className="text-xs text-green-600">Margem: {pricing.gross_margin_pct.toFixed(1)}%</p>
                      )}
                    </div>

                    {/* MOQ / Pack */}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {product.moq > 1 && <span>MOQ: {product.moq}</span>}
                      {product.pack_size > 1 && <span>Pack: {product.pack_size}</span>}
                    </div>

                    <Button size="sm" className="w-full" onClick={() => handleAddToCart(product)} disabled={!product.b2b_sellable}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
