// Tipos partilhados pelo Lookbook editorial B2B

export type LookbookTemplateKey =
  | "hero-single"
  | "duo-asymmetric"
  | "quad-grid"
  | "category-spread";

export type LookbookThemeKey =
  | "nude-cosmetic"
  | "editorial-ink"
  | "clinical-minimal";

export interface PartnerCatalogPage {
  id: string;
  workspace_id: string;
  slug: string | null;
  title: string;
  eyebrow: string | null;
  description: string | null;
  template_key: LookbookTemplateKey;
  theme_key: LookbookThemeKey;
  hero_image_url: string | null;
  background_color: string | null;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PartnerCatalogPageItem {
  id: string;
  page_id: string;
  product_id: string;
  slot: string;
  custom_title: string | null;
  custom_caption: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  // joined product (opcional, preenchido em queries)
  product?: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number;
    images: string[] | null;
    short_description: string | null;
    category: string | null;
  } | null;
}

export interface PartnerCatalogPageWithItems extends PartnerCatalogPage {
  items: PartnerCatalogPageItem[];
}
