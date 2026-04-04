import { useMemo, forwardRef } from "react";
import { useParams } from "react-router-dom";
import { useProductCatalogBySlug, usePublicCatalogItems } from "@/hooks/useProductCatalogs";
import { CatalogFlipbookPage, CatalogCoverPage, CatalogBackPage } from "@/components/catalog/CatalogFlipbookPage";
import HTMLFlipBook from "react-pageflip";
import type { CatalogSettings, ProductCatalogItem } from "@/hooks/useProductCatalogs";

const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
  <div ref={ref} className="w-full h-full">{children}</div>
));
FlipPage.displayName = "FlipPage";

export default function StoreCatalogViewPage() {
  const { workspaceSlug, catalogSlug } = useParams<{ workspaceSlug: string; catalogSlug: string }>();
  const { data: catalog, isLoading, error } = useProductCatalogBySlug(workspaceSlug, catalogSlug);
  const { data: items = [] } = usePublicCatalogItems(catalog?.id);

  const settings = (catalog?.settings || { products_per_page: 2, show_prices: true, show_descriptions: true, watermark: false }) as CatalogSettings;
  const styleTokens = (catalog?.style_tokens || {}) as Record<string, string>;

  const previewPages = useMemo(() => {
    const perPage = settings.products_per_page;
    const pages: ProductCatalogItem[][] = [];
    for (let i = 0; i < items.length; i += perPage) {
      pages.push(items.slice(i, i + perPage));
    }
    return pages;
  }, [items, settings.products_per_page]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Catálogo não encontrado</h2>
          <p className="text-sm opacity-60">Este catálogo pode não estar publicado ou não existir.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-950 p-4"
      style={{
        "--ebook-primary": styleTokens.primaryColor || "#1a1a2e",
        "--ebook-secondary": styleTokens.secondaryColor || "#16213e",
        "--ebook-accent": styleTokens.accentColor || "#e94560",
        "--ebook-bg": styleTokens.backgroundColor || "#ffffff",
      } as React.CSSProperties}
    >
      {/* @ts-ignore */}
      <HTMLFlipBook
        width={420}
        height={594}
        size="fixed"
        minWidth={280}
        maxWidth={700}
        minHeight={400}
        maxHeight={990}
        showCover={true}
        drawShadow={true}
        flippingTime={800}
        usePortrait={window.innerWidth < 640}
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
          <CatalogCoverPage title={catalog.title} subtitle={catalog.subtitle} coverImage={catalog.cover_image} pageWidth={420} pageHeight={594} />
        </FlipPage>
        {previewPages.map((pageItems, idx) => (
          <FlipPage key={idx}>
            <CatalogFlipbookPage items={pageItems} settings={settings} pageWidth={420} pageHeight={594} pageNumber={idx + 1} />
          </FlipPage>
        ))}
        <FlipPage>
          <CatalogBackPage title={catalog.title} pageWidth={420} pageHeight={594} />
        </FlipPage>
      </HTMLFlipBook>
    </div>
  );
}
