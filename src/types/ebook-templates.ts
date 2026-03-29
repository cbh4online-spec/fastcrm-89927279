export interface StyleTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  titleWeight: number;
  bodyWeight: number;
  borderRadius: number;
  shadow: "none" | "soft" | "medium" | "hard" | "glow";
}

export interface ContentSlots {
  bookTitle?: boolean;
  subTitle?: boolean;
  authorName?: boolean;
  authorBio?: boolean;
  heroImage?: boolean;
  logo?: boolean;
  ctaText?: boolean;
}

export interface DefaultContent {
  bookTitle?: string;
  subTitle?: string;
  authorName?: string;
  authorBio?: string;
  ctaText?: string;
  welcomeText?: string;
  copyrightText?: string;
  [key: string]: string | undefined;
}

export type LayoutKey =
  | "cover_hero_image"
  | "cover_split"
  | "copyright_simple"
  | "disclaimer_clean"
  | "table_of_contents_split"
  | "welcome_letter"
  | "chapter_intro_large"
  | "chapter_intro_minimal"
  | "rich_text"
  | "text_image_split"
  | "three_column_highlights"
  | "quote_fullpage"
  | "stats_highlight"
  | "testimonial_block"
  | "timeline_block"
  | "cta_page"
  | "author_section"
  | "thank_you_page";

export type TemplateCategory = "minimal" | "editorial" | "corporate";
export type StyleFamily = "minimal" | "editorial" | "corporate";

export interface EbookTemplate {
  id: string;
  workspace_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: TemplateCategory;
  style_family: StyleFamily;
  use_cases: string[];
  thumbnail_url: string | null;
  preview_images: string[];
  style_tokens: StyleTokens;
  page_layouts: LayoutKey[];
  content_slots: ContentSlots;
  default_content: DefaultContent;
  is_system_template: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EbookPage {
  id: string;
  ebook_id: string;
  page_order: number;
  page_type: string;
  layout_key: LayoutKey;
  content: Record<string, unknown>;
  style_overrides: Partial<StyleTokens>;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface EbookAsset {
  id: string;
  ebook_id: string | null;
  workspace_id: string;
  asset_type: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
}

/** Placeholder variables supported in templates */
export const TEMPLATE_PLACEHOLDERS = [
  "{{book_title}}",
  "{{book_subtitle}}",
  "{{author_name}}",
  "{{author_role}}",
  "{{company_name}}",
  "{{website}}",
  "{{email}}",
  "{{phone}}",
  "{{cta_text}}",
] as const;

/** Resolve placeholders in a string */
export function resolvePlaceholders(
  text: string,
  vars: Record<string, string | undefined>
): string {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

/** Layout key display names */
export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  cover_hero_image: "Capa (Imagem Hero)",
  cover_split: "Capa (Split)",
  copyright_simple: "Copyright",
  disclaimer_clean: "Disclaimer",
  table_of_contents_split: "Índice",
  welcome_letter: "Carta de Boas-Vindas",
  chapter_intro_large: "Intro Capítulo (Grande)",
  chapter_intro_minimal: "Intro Capítulo (Minimal)",
  rich_text: "Texto Rico",
  text_image_split: "Texto + Imagem",
  three_column_highlights: "3 Colunas",
  quote_fullpage: "Citação (Página Inteira)",
  stats_highlight: "Estatísticas",
  testimonial_block: "Testemunho",
  timeline_block: "Timeline",
  cta_page: "Call to Action",
  author_section: "Sobre o Autor",
  thank_you_page: "Agradecimento",
};

/** Category labels */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  minimal: "Minimal Clean",
  editorial: "Editorial Bold",
  corporate: "Corporate Strategy",
};

/** Use case labels */
export const USE_CASE_LABELS: Record<string, string> = {
  ebook: "eBook",
  lead_magnet: "Lead Magnet",
  guide: "Guia",
  premium_guide: "Guia Premium",
  coaching: "Coaching",
  brand_book: "Brand Book",
  report: "Relatório",
  workbook: "Workbook",
  proposal: "Proposta",
  strategy: "Estratégia",
  magazine: "Magazine",
  storytelling: "Storytelling",
  marketing: "Marketing",
  authority: "Autoridade",
};
