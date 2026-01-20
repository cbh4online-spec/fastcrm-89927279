// =============================================
// GROWTH/SEO MODULE - TYPE DEFINITIONS
// =============================================

export type EntityType = 'keyword' | 'template' | 'category' | 'tool' | 'glossary' | 'guide' | 'blog' | 'profile';
export type Intent = 'informational' | 'commercial' | 'transactional';
export type EntityStatus = 'draft' | 'published' | 'archived';

export interface SEOEntity {
  id: string;
  workspace_id: string | null;
  entity_type: EntityType;
  slug: string;
  title: string;
  meta_description: string | null;
  h1: string | null;
  tldr: string | null;
  content: SEOContent;
  intent: Intent | null;
  status: EntityStatus;
  schema_markup: Record<string, unknown> | null;
  canonical_url: string | null;
  og_image: string | null;
  language: string;
  country: string | null;
  priority: number;
  change_frequency: string;
  ai_generated_at: string | null;
  ai_quality_score: number | null;
  published_at: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface SEOContent {
  sections?: ContentSection[];
  faqs?: FAQ[];
  examples?: Example[];
  cta?: CTA;
  relatedEntities?: string[];
  toolConfig?: ToolWidgetConfig;
}

export interface ContentSection {
  id: string;
  heading: string;
  content: string;
  type: 'text' | 'list' | 'steps' | 'comparison' | 'code';
  items?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Example {
  title: string;
  input?: string;
  output?: string;
  description?: string;
}

export interface CTA {
  type: 'signup' | 'try_tool' | 'export' | 'install' | 'contact' | 'upgrade';
  text: string;
  url: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface ToolWidgetConfig {
  toolId: string;
  placeholder?: string;
  maxInputLength?: number;
  showPreview?: boolean;
}

export interface SEOComparison {
  id: string;
  workspace_id: string | null;
  entity_a_id: string;
  entity_b_id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  content: ComparisonContent;
  winner: 'a' | 'b' | 'tie' | null;
  status: EntityStatus;
  schema_markup: Record<string, unknown> | null;
  published_at: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  entity_a?: SEOEntity;
  entity_b?: SEOEntity;
}

export interface ComparisonContent {
  introduction?: string;
  criteria?: ComparisonCriteria[];
  conclusion?: string;
  faqs?: FAQ[];
}

export interface ComparisonCriteria {
  name: string;
  entity_a_value: string;
  entity_b_value: string;
  winner?: 'a' | 'b' | 'tie';
  weight?: number;
}

export interface GDPRConsent {
  id: string;
  visitor_id: string;
  user_id: string | null;
  consent_necessary: boolean;
  consent_analytics: boolean;
  consent_marketing: boolean;
  ip_hash: string | null;
  user_agent: string | null;
  consent_given_at: string;
  consent_updated_at: string;
}

export interface GrowthSettings {
  id: string;
  workspace_id: string;
  gtm_container_id: string | null;
  ga4_measurement_id: string | null;
  meta_pixel_id: string | null;
  clarity_project_id: string | null;
  gdpr_enabled: boolean;
  gdpr_banner_text: string | null;
  gdpr_policy_url: string | null;
  sitemap_auto_update: boolean;
  default_og_image: string | null;
  social_share_hashtags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SEOPageAnalytics {
  id: string;
  entity_id: string | null;
  comparison_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  visitor_id: string | null;
  session_id: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  country_code: string | null;
  device_type: string | null;
  created_at: string;
}

export interface SEOFAQ {
  id: string;
  workspace_id: string;
  entity_id: string;
  question: string;
  answer: string;
  position: number;
  is_featured: boolean;
  created_at: string;
}

// Tracking Types
export interface TrackingEvent {
  event: string;
  params?: Record<string, unknown>;
}

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  hasConsented: boolean;
}

// GA4 Event Types
export interface GA4PageViewParams {
  page_type: EntityType | 'compare' | 'home' | 'pricing';
  entity_slug?: string;
  intent?: Intent;
  language?: string;
  country?: string;
}

export interface GA4CTAClickParams {
  cta_type: 'signup' | 'try_tool' | 'export' | 'install' | 'contact' | 'upgrade';
  placement: 'hero' | 'sidebar' | 'inline' | 'footer' | 'nav';
  page_type?: string;
  entity_slug?: string;
}

export interface GA4SearchParams {
  search_term: string;
  search_context: string;
  filters_used?: string[];
  results_count?: number;
}

export interface GA4ScrollParams {
  depth: 25 | 50 | 75 | 100;
  page_type?: string;
  entity_slug?: string;
}

export interface GA4ToolParams {
  tool_name: string;
  input_type?: string;
  result_type?: string;
  credits_used?: number;
}

export interface GA4PurchaseParams {
  plan: string;
  value: number;
  currency: string;
  transaction_id?: string;
}

// Breadcrumb
export interface Breadcrumb {
  name: string;
  url: string;
}

// Schema.org types
export interface SchemaOrg {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}
