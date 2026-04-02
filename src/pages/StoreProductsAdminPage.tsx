import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Package, Sparkles, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { StoreQuickProductDialog } from "@/components/store/StoreQuickProductDialog";
import { StoreProductEditDialog } from "@/components/store/StoreProductEditDialog";
import { useStoreAdminProducts, type ProductStoreData } from "@/components/store/admin/useStoreAdminProducts";
import { CatalogProductsTable } from "@/components/store/admin/CatalogProductsTable";
import { PricingSuggestionsPanel } from "@/components/store/admin/PricingSuggestionsPanel";
import { PricingIntelligenceSection } from "@/components/store/admin/PricingIntelligenceSection";

export default function StoreProductsAdminPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductStoreData | null>(null);

  const admin = useStoreAdminProducts(search);

  return (
    <>
      <Helmet><title>Gestão da Loja | FastCRM</title></Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" /> Gestão de Produtos na Loja
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{admin.publishedCount}</span> publicados, <span className="font-medium">{admin.featuredCount}</span> em destaque
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" onClick={() => navigate("/mobile/products/quick-create")} className="gap-2">
              <Package className="h-4 w-4" /> Criar Rápido
            </Button>
            <Button onClick={() => setAiDialogOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Criar com IA
            </Button>
          </div>

          <StoreQuickProductDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} />

          <Tabs defaultValue="catalog">
            <TabsList>
              <TabsTrigger value="catalog">Catálogo</TabsTrigger>
              <TabsTrigger value="pricing">Preços &amp; Concorrência</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-4">
              <CatalogProductsTable
                products={admin.products}
                isLoading={admin.isLoading}
                onTogglePublish={admin.togglePublish}
                onToggleFeatured={admin.toggleFeatured}
                onMoveOrder={admin.moveOrder}
                onEdit={setEditProduct}
              />
            </TabsContent>

            <TabsContent value="pricing" className="mt-4 space-y-4">
              <PricingSuggestionsPanel
                suggestions={admin.suggestions}
                products={admin.products}
                onApply={(s) => admin.applySuggestion.mutate(s)}
                onDismiss={(id) => admin.dismissSuggestion.mutate(id)}
              />
              <PricingIntelligenceSection
                products={admin.products}
                isLoading={admin.isLoading}
                loadingPrices={admin.loadingPrices}
                bulkProgress={admin.bulkProgress}
                onUpdateSinglePrice={admin.updateSinglePrice}
                onUpdateAllPrices={admin.updateAllPrices}
              />
            </TabsContent>
          </Tabs>
        </main>

        <StoreProductEditDialog
          product={editProduct}
          open={!!editProduct}
          onOpenChange={(open) => { if (!open) setEditProduct(null); }}
          onSave={(id, updates) => {
            admin.updateProduct.mutate({ id, ...updates });
            setEditProduct(null);
            toast.success("Produto atualizado");
          }}
        />
      </DashboardLayout>
    </>
  );
}
