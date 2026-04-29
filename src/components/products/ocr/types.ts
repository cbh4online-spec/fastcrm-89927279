// Tipos partilhados pelo módulo "Criação Inteligente de Produtos por OCR"

export type ConfidenceLevel = "high" | "medium" | "low" | "pending_validation";
export type ValidationStatus = "pending" | "approved" | "rejected";

export interface OCRStructuredData {
  ocr_raw_text?: string;
  general?: {
    name?: string | null;
    commercial_name?: string | null;
    brand?: string | null;
    product_line?: string | null;
    product_type?: string | null;
    category?: string | null;
    subcategory?: string | null;
  };
  identification?: {
    ean?: string | null;
    sku?: string | null;
    volume?: string | null;
    unit?: string | null;
    origin_country?: string | null;
    distributor?: string | null;
  };
  description?: {
    short?: string | null;
    long?: string | null;
    benefits?: string[];
  };
  usage?: {
    instructions?: string | null;
    precautions?: string | null;
  };
  composition?: {
    ingredients?: string | null;
    claims?: string[];
  };
  commercial?: {
    positioning?: string | null;
    ideal_customer?: string | null;
    sensory_notes?: string | null;
    olfactory_notes?: string | null;
  };
  kit_info?: {
    is_kit?: boolean;
    kit_components_mentioned?: string[];
  };
  field_confidence?: Record<string, ConfidenceLevel>;
  overall_confidence?: number;
  notes?: string;
}

export interface ProductSheetData {
  // Dados principais
  name: string;
  commercial_name: string;
  brand: string;
  line: string;
  category: string;
  subcategory: string;
  product_type: string;
  volume_text: string;
  unit_of_sale: string;
  barcode: string;
  sku: string;
  origin_country: string;
  distributor: string;
  status: "draft" | "active" | "inactive" | "pending_validation";
  // Comerciais
  direct_cost: string; // string para permitir "Pendente de validação"
  base_price: string;
  tax_rate_estimate_pct: string;
  stock_quantity: string;
  low_stock_threshold: string;
  is_seasonal: boolean;
  is_seasonal_validation_status: ValidationStatus;
  is_impulse_product: boolean;
  is_cross_sell: boolean;
  is_cross_sell_validation_status: ValidationStatus;
  is_kit_candidate: boolean;
  is_kit_candidate_validation_status: ValidationStatus;
}

export interface ProductContentData {
  short_title: string;
  seo_title: string;
  short_description: string;
  long_description: string;
  benefits: string[];
  usage_instructions: string;
  precautions: string;
  meta_description: string;
  seo_keywords: string[];
  catalog_text: string;
  proposal_text: string;
  whatsapp_text: string;
  in_store_text: string;
  sensory_experience: string;
  olfactory_experience: string;
  tags: string[];
}

export interface FAQ { question: string; answer: string; }
export interface Objection { objection: string; response: string; }

export interface SalesSupportData {
  positioning: string;
  ideal_customer: string;
  sales_arguments: string[];
  sensory_arguments: string[];
  olfactory_arguments: string[];
  how_to_explain: string;
  faqs: FAQ[];
  objections: Objection[];
  sales_alerts: string[];
  do_not_sell_as: string[];
  sell_as: string[];
  counter_script: string;
  whatsapp_script: string;
  in_store_script: string;
  sales_team_script: string;
  internal_notes: string;
}

export interface OCRDocument {
  id: string;
  workspace_id: string;
  file_url: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  ocr_raw_text: string | null;
  ocr_structured_data: OCRStructuredData;
  ocr_confidence: number | null;
  field_confidence: Record<string, ConfidenceLevel>;
  processing_status: "pending" | "processing" | "completed" | "failed";
  processing_error: string | null;
}

export const PENDING_LABEL = "Pendente de validação";

export function emptyProductSheet(): ProductSheetData {
  return {
    name: "",
    commercial_name: "",
    brand: "",
    line: "",
    category: "",
    subcategory: "",
    product_type: "",
    volume_text: "",
    unit_of_sale: "",
    barcode: "",
    sku: "",
    origin_country: "",
    distributor: "",
    status: "draft",
    direct_cost: "",
    base_price: "",
    tax_rate_estimate_pct: "23",
    stock_quantity: "",
    low_stock_threshold: "",
    is_seasonal: false,
    is_seasonal_validation_status: "pending",
    is_impulse_product: false,
    is_cross_sell: false,
    is_cross_sell_validation_status: "pending",
    is_kit_candidate: false,
    is_kit_candidate_validation_status: "pending",
  };
}

export function emptyContent(): ProductContentData {
  return {
    short_title: "", seo_title: "", short_description: "", long_description: "",
    benefits: [], usage_instructions: "", precautions: "", meta_description: "",
    seo_keywords: [], catalog_text: "", proposal_text: "", whatsapp_text: "",
    in_store_text: "", sensory_experience: "", olfactory_experience: "", tags: [],
  };
}

export function emptySalesSupport(): SalesSupportData {
  return {
    positioning: "", ideal_customer: "", sales_arguments: [], sensory_arguments: [],
    olfactory_arguments: [], how_to_explain: "", faqs: [], objections: [],
    sales_alerts: [], do_not_sell_as: [], sell_as: [], counter_script: "",
    whatsapp_script: "", in_store_script: "", sales_team_script: "", internal_notes: "",
  };
}
