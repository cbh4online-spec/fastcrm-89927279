// SSoT for product fields used in field-level permissions UI.
// Mantém-se sincronizado com o seed em public.field_catalog.

export type ProductFieldSection =
  | "identification"
  | "commercial"
  | "pricing"
  | "costs"
  | "stock"
  | "content"
  | "store"
  | "consumption"
  | "bundle";

export interface ProductFieldDef {
  key: string;
  label: string;
  section: ProductFieldSection;
  sensitive?: boolean;
}

export const PRODUCT_FIELD_SECTIONS: { key: ProductFieldSection; label: string }[] = [
  { key: "identification", label: "Identificação" },
  { key: "commercial", label: "Comercial" },
  { key: "pricing", label: "Preço" },
  { key: "costs", label: "Custos e margem" },
  { key: "stock", label: "Stock e logística" },
  { key: "content", label: "Conteúdo" },
  { key: "store", label: "Loja e publicação" },
  { key: "consumption", label: "Consumo (serviços)" },
  { key: "bundle", label: "Bundle" },
];

export const PRODUCT_FIELDS: ProductFieldDef[] = [
  // Identificação
  { key: "name", label: "Nome", section: "identification" },
  { key: "sku", label: "SKU", section: "identification" },
  { key: "barcode", label: "Código de barras", section: "identification" },
  { key: "category", label: "Categoria", section: "identification" },
  { key: "line", label: "Linha", section: "identification" },
  { key: "tags", label: "Etiquetas", section: "identification" },
  { key: "brand_logo_url", label: "Logo da marca", section: "identification" },
  { key: "product_type", label: "Tipo de produto", section: "identification" },
  { key: "status", label: "Estado", section: "identification" },
  { key: "product_condition", label: "Condição do produto", section: "identification" },
  // Comercial
  { key: "short_description", label: "Descrição curta", section: "commercial" },
  { key: "commercial_description", label: "Descrição comercial", section: "commercial" },
  { key: "benefits", label: "Benefícios", section: "commercial" },
  { key: "conditions", label: "Condições", section: "commercial" },
  { key: "demo_video_url", label: "Vídeo demo", section: "commercial" },
  // Preço
  { key: "base_price", label: "Preço base", section: "pricing" },
  { key: "currency", label: "Moeda", section: "pricing" },
  { key: "tax_rate_estimate_pct", label: "Taxa IVA (%)", section: "pricing" },
  { key: "tax_included", label: "IVA incluído", section: "pricing" },
  { key: "setup_fee", label: "Taxa de setup", section: "pricing" },
  { key: "recurring_fee", label: "Taxa recorrente", section: "pricing" },
  { key: "billing_type", label: "Tipo de faturação", section: "pricing" },
  { key: "billing_frequency", label: "Frequência de faturação", section: "pricing" },
  { key: "competitor_price_low", label: "Preço concorrência", section: "pricing", sensitive: true },
  { key: "competitor_source", label: "Fonte concorrência", section: "pricing", sensitive: true },
  // Custos
  { key: "direct_cost", label: "Custo direto", section: "costs", sensitive: true },
  { key: "operational_cost", label: "Custo operacional", section: "costs", sensitive: true },
  { key: "target_margin_pct", label: "Margem alvo (%)", section: "costs", sensitive: true },
  { key: "commission_default", label: "Comissão padrão (%)", section: "costs", sensitive: true },
  { key: "labor_hours", label: "Horas de trabalho", section: "costs" },
  { key: "labor_hourly_rate", label: "Custo/hora", section: "costs", sensitive: true },
  { key: "labor_included_in_price", label: "Trabalho incluído no preço", section: "costs" },
  { key: "labor_notes", label: "Notas de trabalho", section: "costs" },
  // Stock
  { key: "stock_status", label: "Estado de stock", section: "stock" },
  { key: "stock_quantity", label: "Quantidade em stock", section: "stock" },
  { key: "track_stock", label: "Controlar stock", section: "stock" },
  { key: "low_stock_threshold", label: "Limite de stock baixo", section: "stock" },
  { key: "min_order_quantity", label: "Qtd mínima de encomenda", section: "stock" },
  { key: "order_multiple", label: "Múltiplo de encomenda", section: "stock" },
  { key: "pack_size", label: "Tamanho da embalagem", section: "stock" },
  { key: "weight", label: "Peso", section: "stock" },
  { key: "delivery_estimate", label: "Estimativa de entrega", section: "stock" },
  { key: "delivery_notes", label: "Notas de entrega", section: "stock" },
  { key: "delivery_mode", label: "Modo de entrega", section: "stock" },
  // Conteúdo
  { key: "images", label: "Imagens", section: "content" },
  { key: "primary_image_index", label: "Imagem principal", section: "content" },
  { key: "specifications", label: "Especificações", section: "content" },
  // Loja
  { key: "store_published", label: "Publicado na loja", section: "store" },
  { key: "store_featured", label: "Destacado na loja", section: "store" },
  { key: "store_visibility", label: "Visibilidade na loja", section: "store" },
  { key: "store_category_id", label: "Categoria da loja", section: "store" },
  { key: "store_sort_order", label: "Ordem na loja", section: "store" },
  { key: "b2b_published", label: "Publicado em B2B", section: "store" },
  { key: "sheet_published", label: "Ficha publicada", section: "store" },
  { key: "sheet_slug", label: "Slug da ficha", section: "store" },
  { key: "business_types", label: "Tipos de negócio", section: "store" },
  // Consumo
  { key: "consumption_model", label: "Modelo de consumo", section: "consumption" },
  { key: "included_quantity", label: "Quantidade incluída", section: "consumption" },
  { key: "unit_name", label: "Nome da unidade", section: "consumption" },
  { key: "unit_duration", label: "Duração da unidade", section: "consumption" },
  { key: "validity_days", label: "Validade (dias)", section: "consumption" },
  { key: "total_units", label: "Total de unidades", section: "consumption" },
  { key: "recommended_frequency", label: "Frequência recomendada", section: "consumption" },
  { key: "typical_duration_days", label: "Duração típica (dias)", section: "consumption" },
  { key: "is_trackable", label: "É rastreável", section: "consumption" },
  // Bundle
  { key: "bundle_price_mode", label: "Modo de preço do bundle", section: "bundle" },
];

export const PRODUCT_ROLES: { key: string; label: string; locked?: boolean }[] = [
  { key: "owner", label: "Owner", locked: true },
  { key: "admin", label: "Admin" },
  { key: "agent", label: "Agente" },
  { key: "viewer", label: "Viewer" },
  { key: "agency", label: "Agência" },
];
