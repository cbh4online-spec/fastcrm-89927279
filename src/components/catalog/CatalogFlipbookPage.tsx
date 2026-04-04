import type { ProductCatalogItem, CatalogSettings } from "@/hooks/useProductCatalogs";

interface CatalogPageProps {
  items: ProductCatalogItem[];
  settings: CatalogSettings;
  pageWidth: number;
  pageHeight: number;
  pageNumber: number;
}

function formatPrice(price: number, currency?: string | null) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(price);
}

function ProductCard({ item, size }: { item: ProductCatalogItem; size: "full" | "half" | "quarter" }) {
  const p = item.product;
  if (!p) return null;
  const title = item.custom_title || p.name;
  const desc = item.custom_description || p.description;
  const img = item.custom_image || p.images?.[0];
  const isCompact = size === "quarter";
  const isHalf = size === "half";

  return (
    <div className={`flex flex-col items-center text-center gap-2 ${isCompact ? "p-2" : isHalf ? "p-3" : "p-4 flex-1"}`}>
      {img && (
        <div className={`w-full overflow-hidden rounded-lg bg-muted/30 flex items-center justify-center ${isCompact ? "h-[40%]" : isHalf ? "h-[50%]" : "h-[55%]"}`}>
          <img src={img} alt={title} className="max-w-full max-h-full object-contain" loading="lazy" />
        </div>
      )}
      <h3 className={`font-bold leading-tight ${isCompact ? "text-xs" : isHalf ? "text-sm" : "text-base"}`} style={{ color: "var(--ebook-primary, #1a1a2e)" }}>
        {title}
      </h3>
      {desc && !isCompact && (
        <p className={`text-muted-foreground leading-snug line-clamp-3 ${isHalf ? "text-[10px]" : "text-xs"}`}>
          {desc}
        </p>
      )}
      <p className={`font-bold ${isCompact ? "text-xs" : "text-sm"}`} style={{ color: "var(--ebook-accent, #e94560)" }}>
        {p.compare_at_price && p.compare_at_price > p.price && (
          <span className="line-through opacity-50 mr-1 font-normal">{formatPrice(p.compare_at_price, p.currency)}</span>
        )}
        {formatPrice(p.price, p.currency)}
      </p>
    </div>
  );
}

export function CatalogFlipbookPage({ items, settings, pageWidth, pageHeight, pageNumber }: CatalogPageProps) {
  const perPage = settings.products_per_page;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        width: pageWidth,
        height: pageHeight,
        backgroundColor: "var(--ebook-bg, #ffffff)",
        fontFamily: "var(--ebook-body-font, 'Inter', sans-serif)",
      }}
    >
      {perPage === 1 && items[0] && (
        <div className="flex-1 flex flex-col justify-center p-6">
          <ProductCard item={items[0]} size="full" />
        </div>
      )}

      {perPage === 2 && (
        <div className="flex-1 grid grid-rows-2 gap-2 p-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} size="half" />
          ))}
        </div>
      )}

      {perPage === 4 && (
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 p-3">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} size="quarter" />
          ))}
        </div>
      )}

      {/* Page number */}
      <div className="text-center pb-2 text-[10px] text-muted-foreground">{pageNumber}</div>
    </div>
  );
}

// Cover page component
export function CatalogCoverPage({ title, subtitle, coverImage, pageWidth, pageHeight }: {
  title: string;
  subtitle?: string | null;
  coverImage?: string | null;
  pageWidth: number;
  pageHeight: number;
}) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center relative overflow-hidden"
      style={{
        width: pageWidth,
        height: pageHeight,
        background: "var(--ebook-primary, linear-gradient(135deg, #1a1a2e, #16213e))",
        color: "#fff",
      }}
    >
      {coverImage && (
        <div className="absolute inset-0 opacity-30">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="relative z-10 px-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "var(--ebook-heading-font, 'Georgia', serif)" }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
        <div className="mt-6 w-16 h-0.5 bg-white/40 mx-auto" />
        <p className="mt-4 text-xs opacity-60">CATÁLOGO DE PRODUTOS</p>
      </div>
    </div>
  );
}

// Back cover
export function CatalogBackPage({ title, pageWidth, pageHeight }: {
  title: string;
  pageWidth: number;
  pageHeight: number;
}) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center"
      style={{
        width: pageWidth,
        height: pageHeight,
        background: "var(--ebook-primary, linear-gradient(135deg, #1a1a2e, #16213e))",
        color: "#fff",
      }}
    >
      <p className="text-lg font-bold opacity-80">{title}</p>
      <p className="text-xs opacity-50 mt-2">Obrigado por consultar o nosso catálogo</p>
    </div>
  );
}
