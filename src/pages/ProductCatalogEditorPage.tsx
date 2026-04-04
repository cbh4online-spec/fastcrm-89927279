import { useState, useMemo, forwardRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Save, Globe, Sparkles, Trash2, GripVertical } from "lucide-react";
import { useProductCatalog, useUpdateCatalog, useProductCatalogItems, useAddCatalogItem, useRemoveCatalogItem, useReorderCatalogItems } from "@/hooks/useProductCatalogs";
import { useAICatalog } from "@/hooks/useAICatalog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CatalogProductPicker } from "@/components/catalog/CatalogProductPicker";
import { CatalogStyleEditor } from "@/components/catalog/CatalogStyleEditor";
import { CatalogFlipbookPage, CatalogCoverPage, CatalogBackPage } from "@/components/catalog/CatalogFlipbookPage";
import HTMLFlipBook from "react-pageflip";
import { toast } from "sonner";
import type { CatalogSettings, ProductCatalogItem } from "@/hooks/useProductCatalogs";

// Wrapper for react-pageflip
const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
  <div ref={ref} className="w-full h-full">{children}</div>
));
FlipPage.displayName = "FlipPage";

export default function ProductCatalogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: catalog, isLoading } = useProductCatalog(id);
  const { data: items = [] } = useProductCatalogItems(id);
  const updateCatalog = useUpdateCatalog();
  const addItem = useAddCatalogItem();
  const removeItem = useRemoveCatalogItem();
  const reorderItems = useReorderCatalogItems();
  const { suggest, loading: aiLoading } = useAICatalog();
  const [showPreview, setShowPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  // Sync local state
  if (catalog && !title && catalog.title) {
    setTitle(catalog.title);
    setSubtitle(catalog.subtitle || "");
  }

  const settings = (catalog?.settings || { products_per_page: 2, show_prices: true, show_descriptions: true, watermark: false }) as CatalogSettings;
  const styleTokens = (catalog?.style_tokens || {}) as Record<string, string>;

  const handleSave = async () => {
    if (!catalog) return;
    await updateCatalog.mutateAsync({ id: catalog.id, title, subtitle: subtitle || null });
    toast.success("Catálogo guardado");
  };

  const handlePublish = async () => {
    if (!catalog) return;
    const newStatus = catalog.status === "published" ? "draft" : "published";
    await updateCatalog.mutateAsync({ id: catalog.id, status: newStatus as any, is_public: newStatus === "published" });
    toast.success(newStatus === "published" ? "Catálogo publicado" : "Catálogo despublicado");
  };

  const handleAddProduct = async (productId: string) => {
    if (!catalog) return;
    await addItem.mutateAsync({ catalog_id: catalog.id, product_id: productId, sort_order: items.length });
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!catalog) return;
    await removeItem.mutateAsync({ id: itemId, catalogId: catalog.id });
  };

  const handleAISuggestDescriptions = async () => {
    if (!items.length) return;
    const result = await suggest("generate_descriptions", {
      products: items.map((it) => ({
        id: it.product_id,
        name: it.product?.name || "",
        description: it.product?.short_description || "",
      })),
    });
    if (result?.descriptions) {
      toast.success(`${result.descriptions.length} descrições geradas pela IA`);
    }
  };

  const handleStyleChange = async (tokens: Record<string, string>) => {
    if (!catalog) return;
    await updateCatalog.mutateAsync({ id: catalog.id, style_tokens: tokens });
  };

  const handleSettingsChange = async (newSettings: CatalogSettings) => {
    if (!catalog) return;
    await updateCatalog.mutateAsync({ id: catalog.id, settings: newSettings });
  };

  // Build preview pages
  const previewPages = useMemo(() => {
    const perPage = settings.products_per_page;
    const pages: ProductCatalogItem[][] = [];
    for (let i = 0; i < items.length; i += perPage) {
      pages.push(items.slice(i, i + perPage));
    }
    return pages;
  }, [items, settings.products_per_page]);

  if (isLoading) return <div className="p-6">A carregar...</div>;
  if (!catalog) return <div className="p-6">Catálogo não encontrado</div>;

  const excludeIds = items.map((it) => it.product_id);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/store-catalogs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold border-none shadow-none px-0 h-auto" placeholder="Título do catálogo" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
          <Eye className="h-4 w-4 mr-1" /> Pré-visualizar
        </Button>
        <Button variant="outline" size="sm" onClick={handlePublish}>
          <Globe className="h-4 w-4 mr-1" /> {catalog.status === "published" ? "Despublicar" : "Publicar"}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={updateCatalog.isPending}>
          <Save className="h-4 w-4 mr-1" /> Guardar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product list */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products">Produtos ({items.length})</TabsTrigger>
              <TabsTrigger value="add">Adicionar</TabsTrigger>
            </TabsList>
            <TabsContent value="products" className="space-y-2">
              {items.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum produto adicionado. Use o separador "Adicionar" para selecionar produtos.</CardContent></Card>
              ) : (
                <div className="space-y-1">
                  {items.map((item, idx) => (
                    <Card key={item.id} className="group">
                      <CardContent className="p-3 flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                        {item.product?.images?.[0] && (
                          <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.custom_title || item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product?.base_price ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: item.product.currency || "EUR" }).format(item.product.base_price) : "—"}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleAISuggestDescriptions} disabled={aiLoading}>
                  <Sparkles className="h-4 w-4 mr-1" /> {aiLoading ? "A gerar..." : "Gerar descrições IA"}
                </Button>
              )}
            </TabsContent>
            <TabsContent value="add">
              {currentWorkspace && (
                <CatalogProductPicker workspaceId={currentWorkspace.id} excludeProductIds={excludeIds} onAdd={handleAddProduct} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Style & Settings */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Personalização</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Subtítulo</Label>
                  <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex: Coleção Premium" className="h-8" />
                </div>
                <CatalogStyleEditor
                  styleTokens={styleTokens}
                  settings={settings}
                  onStyleChange={handleStyleChange}
                  onSettingsChange={handleSettingsChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Flipbook Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 border-0 rounded-xl bg-slate-950 [&>button]:text-white [&>button]:z-50">
          <div className="w-full h-full flex items-center justify-center p-8"
            style={{
              "--ebook-primary": styleTokens.primaryColor || "#1a1a2e",
              "--ebook-secondary": styleTokens.secondaryColor || "#16213e",
              "--ebook-accent": styleTokens.accentColor || "#e94560",
              "--ebook-bg": styleTokens.backgroundColor || "#ffffff",
            } as React.CSSProperties}
          >
            {/* @ts-ignore */}
            <HTMLFlipBook
              width={380}
              height={538}
              size="fixed"
              minWidth={280}
              maxWidth={600}
              minHeight={400}
              maxHeight={850}
              showCover={true}
              drawShadow={true}
              flippingTime={800}
              usePortrait={false}
              startPage={0}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.5}
              mobileScrollSupport={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
              className="flipbook-container"
              style={{}}
            >
              <FlipPage>
                <CatalogCoverPage title={title || catalog.title} subtitle={subtitle || catalog.subtitle} coverImage={catalog.cover_image} pageWidth={380} pageHeight={538} />
              </FlipPage>
              {previewPages.map((pageItems, idx) => (
                <FlipPage key={idx}>
                  <CatalogFlipbookPage items={pageItems} settings={settings} pageWidth={380} pageHeight={538} pageNumber={idx + 1} />
                </FlipPage>
              ))}
              <FlipPage>
                <CatalogBackPage title={title || catalog.title} pageWidth={380} pageHeight={538} />
              </FlipPage>
            </HTMLFlipBook>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
