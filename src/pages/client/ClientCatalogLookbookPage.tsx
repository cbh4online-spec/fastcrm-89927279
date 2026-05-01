import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { EditorialPageHeader } from "@/components/client-portal/EditorialPageHeader";
import { EditorialHero } from "@/components/client-portal/EditorialHero";
import { LookbookRenderer } from "@/components/client-portal/lookbook/LookbookRenderer";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { usePartnerCatalogPages } from "@/hooks/usePartnerCatalogPages";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutGrid, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { PartnerCatalogPageItem } from "@/types/partnerCatalog";

export default function ClientCatalogLookbookPage() {
  const { clientUser } = useClientAuth();
  const { addItem, itemCount } = useCart();
  const { data: pages = [], isLoading } = usePartnerCatalogPages(clientUser?.workspace_id);

  const handleAddToCart = (item: PartnerCatalogPageItem) => {
    if (!item.product) return;
    addItem({
      product_id: item.product.id,
      product_name: item.custom_title || item.product.name,
      product_sku: item.product.sku,
      product_image_url: item.product.images?.[0] ?? null,
      quantity: 1,
      unit_price_net: item.product.base_price,
      vat_rate: 23,
    });
    toast.success(`${item.product.name} adicionado ao carrinho`);
  };

  return (
    <ClientLayout>
      <div className="space-y-8">
        <EditorialPageHeader
          breadcrumbs={[
            { label: "Portal", to: "/client" },
            { label: "Catálogo" },
          ]}
          eyebrow="Portal Profissional · Lookbook"
          title="Catálogo Editorial"
          subtitle="Navegue pelas coleções selecionadas pela nossa equipa."
          actions={
            <>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/client/catalog/grid">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Vista grelha
                </Link>
              </Button>
              {itemCount > 0 && (
                <Button asChild className="rounded-full bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))]">
                  <Link to="/client/cart">
                    {itemCount} no carrinho
                  </Link>
                </Button>
              )}
            </>
          }
        />

        <EditorialHero
          eyebrow="Edição da estação"
          title="Inspire-se. Encomende. Evolua."
          description="Descubra as campanhas activas e formações certificadas pensadas para profissionais como você. Tudo num só lugar — curado pela nossa equipa."
          primaryCta={{
            label: "Ver campanhas activas",
            to: "/client/campaigns",
            icon: "sparkles",
            variant: "primary",
          }}
          secondaryCta={{
            label: "Explorar formações",
            to: "/client/training",
            icon: "graduation",
            variant: "outline",
          }}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pages.length === 0 ? (
          <EmptyState />
        ) : (
          <LookbookRenderer
            pages={pages}
            onAddToCart={handleAddToCart}
            gridFallbackUrl="/client/catalog/grid"
          />
        )}
      </div>
    </ClientLayout>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[hsl(var(--editorial-border))]/50 bg-[hsl(var(--editorial-cream))] p-12 text-center">
      <Sparkles className="h-10 w-10 mx-auto mb-4 text-[hsl(var(--editorial-accent))]" />
      <h3 className="font-editorial text-2xl text-[hsl(var(--editorial-ink))] mb-2">
        Lookbook ainda não publicado
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        O administrador do workspace ainda não publicou nenhuma página editorial.
        Entretanto, pode consultar o catálogo completo em vista grelha.
      </p>
      <div className="flex justify-center gap-3">
        <Button asChild className="rounded-full bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))]">
          <Link to="/client/catalog/grid">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Ver catálogo em grelha
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/client/admin/catalog-pages">Criar primeira página (admin)</Link>
        </Button>
      </div>
    </div>
  );
}
