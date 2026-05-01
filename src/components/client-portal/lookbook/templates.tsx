// Templates de página do Lookbook B2B
// Cada template recebe a página + items + handler de "add to cart" e renderiza o layout.

import type { LookbookTemplateKey, PartnerCatalogPageWithItems, PartnerCatalogPageItem } from "@/types/partnerCatalog";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TemplateProps {
  page: PartnerCatalogPageWithItems;
  onAddToCart: (item: PartnerCatalogPageItem) => void;
}

interface TemplateMeta {
  key: LookbookTemplateKey;
  name: string;
  description: string;
  /** Slots disponíveis neste template (para o admin atribuir produtos) */
  slots: { id: string; label: string }[];
  Component: React.FC<TemplateProps>;
}

// ============= Helpers =============
function getProductImage(item: PartnerCatalogPageItem): string | null {
  return item.product?.images?.[0] ?? null;
}

function getProductTitle(item: PartnerCatalogPageItem): string {
  return item.custom_title || item.product?.name || "Produto";
}

function getProductCaption(item: PartnerCatalogPageItem): string | null {
  return item.custom_caption || item.product?.short_description || null;
}

// ============= Atomic: ProductBlock =============
interface ProductBlockProps {
  item: PartnerCatalogPageItem;
  size: "xl" | "lg" | "md" | "sm";
  onAdd: () => void;
  layout?: "stacked" | "side";
  align?: "left" | "center" | "right";
}

function ProductBlock({ item, size, onAdd, layout = "stacked", align = "left" }: ProductBlockProps) {
  const img = getProductImage(item);
  const title = getProductTitle(item);
  const caption = getProductCaption(item);
  const price = item.product?.base_price ?? 0;
  const sku = item.product?.sku;

  const imgSize = {
    xl: "w-full max-w-[280px] sm:max-w-[360px] md:max-w-[420px] aspect-square",
    lg: "w-full max-w-[220px] sm:max-w-[260px] md:max-w-[280px] aspect-square",
    md: "w-full max-w-[160px] sm:max-w-[180px] md:max-w-[200px] aspect-square",
    sm: "w-full max-w-[120px] sm:max-w-[140px] aspect-square",
  }[size];

  const titleSize = {
    xl: "text-xl sm:text-2xl md:text-3xl",
    lg: "text-lg sm:text-xl md:text-2xl",
    md: "text-sm sm:text-base md:text-lg",
    sm: "text-sm",
  }[size];

  const alignClass = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  }[align];

  return (
    <div
      className={cn(
        "flex gap-4 group",
        layout === "side" ? "flex-row items-center" : "flex-col",
        alignClass
      )}
    >
      <div className={cn("relative shrink-0", imgSize)}>
        {img ? (
          <img
            src={img}
            alt={title}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--lb-surface))] rounded-lg">
            <Package className="h-12 w-12 opacity-30" />
          </div>
        )}
        <button
          onClick={onAdd}
          aria-label={`Adicionar ${title} ao carrinho`}
          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[hsl(var(--lb-cta))] text-[hsl(var(--lb-cta-fg))] flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("flex flex-col gap-1", alignClass)}>
        <h3 className={cn("font-editorial tracking-tight leading-tight text-[hsl(var(--lb-ink))]", titleSize)}>
          {title}
        </h3>
        {caption && (
          <p className="text-xs uppercase tracking-[0.15em] text-[hsl(var(--lb-muted))] max-w-[260px] leading-relaxed">
            {caption}
          </p>
        )}
        {sku && (
          <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--lb-muted))] opacity-70">
            {sku}
          </p>
        )}
        <p className="text-base font-semibold text-[hsl(var(--lb-ink))] mt-1">
          {formatCurrency(price)}
        </p>
      </div>
    </div>
  );
}

// ============= Page Header (eyebrow + title + divider) =============
function PageHeader({ page, align = "left" }: { page: PartnerCatalogPageWithItems; align?: "left" | "center" }) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={cn("flex flex-col gap-3 mb-6 md:mb-8", alignClass)}>
      <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight text-[hsl(var(--lb-ink))] uppercase leading-[1.05]">
        {page.title}
      </h1>
      <div className="w-16 sm:w-24 h-px bg-[hsl(var(--lb-divider))]" />
      {(page.eyebrow || page.description) && (
        <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[hsl(var(--lb-muted))] max-w-md leading-relaxed">
          {page.eyebrow || page.description}
        </p>
      )}
    </div>
  );
}

// ============= Template 1: hero-single =============
const HeroSingleTemplate: React.FC<TemplateProps> = ({ page, onAddToCart }) => {
  const main = page.items[0];
  return (
    <div className="min-h-[400px] md:min-h-[600px] grid lg:grid-cols-2 gap-8 md:gap-12 items-center p-5 sm:p-8 md:p-16">
      <div>
        <PageHeader page={page} />
        {page.description && (
          <p className="text-sm md:text-base text-[hsl(var(--lb-muted))] max-w-md leading-relaxed mt-4">
            {page.description}
          </p>
        )}
      </div>
      {main && (
        <div className="flex justify-center">
          <ProductBlock item={main} size="xl" onAdd={() => onAddToCart(main)} align="center" />
        </div>
      )}
    </div>
  );
};

// ============= Template 2: duo-asymmetric =============
const DuoAsymmetricTemplate: React.FC<TemplateProps> = ({ page, onAddToCart }) => {
  const [first, second] = page.items;
  return (
    <div className="p-5 sm:p-8 md:p-12">
      <PageHeader page={page} />
      <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-end mt-6 md:mt-8">
        {first && (
          <div className="md:col-span-7">
            <ProductBlock item={first} size="xl" onAdd={() => onAddToCart(first)} />
          </div>
        )}
        {second && (
          <div className="md:col-span-5 md:pb-12">
            <ProductBlock item={second} size="lg" onAdd={() => onAddToCart(second)} />
          </div>
        )}
      </div>
    </div>
  );
};

// ============= Template 3: quad-grid =============
const QuadGridTemplate: React.FC<TemplateProps> = ({ page, onAddToCart }) => {
  return (
    <div className="p-5 sm:p-8 md:p-12">
      <PageHeader page={page} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mt-6 md:mt-8">
        {page.items.slice(0, 4).map((item) => (
          <ProductBlock
            key={item.id}
            item={item}
            size="md"
            onAdd={() => onAddToCart(item)}
            align="center"
          />
        ))}
      </div>
    </div>
  );
};

// ============= Template 4: category-spread (referência Vou Pedir) =============
const CategorySpreadTemplate: React.FC<TemplateProps> = ({ page, onAddToCart }) => {
  const items = page.items.slice(0, 6);

  return (
    <div className="p-8 md:p-12">
      <PageHeader page={page} />

      {/* Layout asimétrico inspirado na referência:
          col 1: produtos pequenos empilhados
          col 2: produto grande central
          col 3: produtos pequenos empilhados */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-8">
        {/* Coluna esquerda */}
        <div className="md:col-span-4 space-y-12">
          {items[0] && (
            <ProductBlock item={items[0]} size="md" onAdd={() => onAddToCart(items[0])} />
          )}
          {items[1] && (
            <div className="md:pl-8">
              <ProductBlock item={items[1]} size="md" onAdd={() => onAddToCart(items[1])} />
            </div>
          )}
        </div>

        {/* Coluna central — destaque grande */}
        <div className="md:col-span-4 flex justify-center md:pt-16">
          {items[2] && (
            <ProductBlock item={items[2]} size="lg" onAdd={() => onAddToCart(items[2])} align="center" />
          )}
        </div>

        {/* Coluna direita */}
        <div className="md:col-span-4 space-y-12">
          {items[3] && (
            <div className="md:pl-4">
              <ProductBlock item={items[3]} size="md" onAdd={() => onAddToCart(items[3])} align="right" />
            </div>
          )}
          {items[4] && (
            <ProductBlock item={items[4]} size="md" onAdd={() => onAddToCart(items[4])} align="right" />
          )}
        </div>

        {/* Item extra no fundo se houver 6º */}
        {items[5] && (
          <div className="md:col-span-12 flex justify-center mt-8">
            <ProductBlock item={items[5]} size="md" onAdd={() => onAddToCart(items[5])} align="center" />
          </div>
        )}
      </div>
    </div>
  );
};

// ============= Registry =============
export const LOOKBOOK_TEMPLATES: Record<LookbookTemplateKey, TemplateMeta> = {
  "hero-single": {
    key: "hero-single",
    name: "Hero Único",
    description: "Um produto em destaque com texto editorial ao lado",
    slots: [{ id: "main", label: "Produto principal" }],
    Component: HeroSingleTemplate,
  },
  "duo-asymmetric": {
    key: "duo-asymmetric",
    name: "Duo Assimétrico",
    description: "Dois produtos com tamanhos diferentes — estilo lookbook",
    slots: [
      { id: "left", label: "Produto grande (esquerda)" },
      { id: "right", label: "Produto pequeno (direita)" },
    ],
    Component: DuoAsymmetricTemplate,
  },
  "quad-grid": {
    key: "quad-grid",
    name: "Grelha 4 Produtos",
    description: "Quatro produtos lado a lado",
    slots: [
      { id: "1", label: "Slot 1" },
      { id: "2", label: "Slot 2" },
      { id: "3", label: "Slot 3" },
      { id: "4", label: "Slot 4" },
    ],
    Component: QuadGridTemplate,
  },
  "category-spread": {
    key: "category-spread",
    name: "Spread de Categoria",
    description: "Lookbook editorial com 5-6 produtos posicionados (referência Vou Pedir)",
    slots: [
      { id: "tl", label: "Topo esquerda" },
      { id: "ml", label: "Meio esquerda" },
      { id: "center", label: "Centro (grande)" },
      { id: "tr", label: "Topo direita" },
      { id: "mr", label: "Meio direita" },
      { id: "bottom", label: "Fundo (opcional)" },
    ],
    Component: CategorySpreadTemplate,
  },
};

export function getLookbookTemplate(key: LookbookTemplateKey | string): TemplateMeta {
  if (key in LOOKBOOK_TEMPLATES) return LOOKBOOK_TEMPLATES[key as LookbookTemplateKey];
  return LOOKBOOK_TEMPLATES["category-spread"];
}
