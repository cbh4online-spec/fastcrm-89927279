// Figma MCP Section → FastCRM Builder Block mapping types and helpers

export type BuilderBlockType =
  | "hero"
  | "features_grid"
  | "cta_banner"
  | "testimonials"
  | "faq_accordion"
  | "pricing_cards"
  | "lead_form"
  | "logo_strip"
  | "split_content"
  | "rich_text";

export interface BuilderBlock {
  id: string;
  landing_page_id: string;
  workspace_id: string;
  block_type: BuilderBlockType;
  section_name: string | null;
  sort_order: number;
  content: Record<string, unknown>;
  auto_generated: boolean;
  source_import_id: string | null;
  source_section_type: string | null;
  mapping_confidence: "high" | "medium" | "low" | null;
  mapping_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const BLOCK_TYPE_LABELS: Record<BuilderBlockType, string> = {
  hero: "Hero",
  features_grid: "Features / Benefícios",
  cta_banner: "CTA Banner",
  testimonials: "Testemunhos",
  faq_accordion: "FAQ",
  pricing_cards: "Preços",
  lead_form: "Formulário de Lead",
  logo_strip: "Barra de Logos",
  split_content: "Conteúdo Dividido",
  rich_text: "Texto Rico",
};

export const BLOCK_TYPE_ICONS: Record<BuilderBlockType, string> = {
  hero: "🏠",
  features_grid: "✅",
  cta_banner: "🔘",
  testimonials: "⭐",
  faq_accordion: "❓",
  pricing_cards: "💰",
  lead_form: "📝",
  logo_strip: "🏢",
  split_content: "📐",
  rich_text: "📋",
};
