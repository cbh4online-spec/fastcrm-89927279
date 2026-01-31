// Types for Product Attributes (Clinical/Technical Indexers)

export type ProductAttributeType = 
  | 'function' 
  | 'pathology' 
  | 'indication' 
  | 'protocol';

export interface ProductAttribute {
  id: string;
  workspace_id: string;
  product_id: string;
  attribute_type: ProductAttributeType;
  attribute_value: string;
  display_order: number;
  created_at: string;
}

export interface CreateProductAttributeData {
  workspace_id: string;
  product_id: string;
  attribute_type: ProductAttributeType;
  attribute_value: string;
  display_order?: number;
}

export interface UpdateProductAttributeData {
  attribute_value?: string;
  display_order?: number;
}

// Attribute type display helpers
export const productAttributeTypeConfig: Record<ProductAttributeType, {
  label: string;
  labelPT: string;
  icon: string;
  description: string;
}> = {
  function: {
    label: 'Function',
    labelPT: 'Função',
    icon: 'Zap',
    description: 'What the product does'
  },
  pathology: {
    label: 'Pathology',
    labelPT: 'Patologia',
    icon: 'HeartPulse',
    description: 'Conditions it addresses'
  },
  indication: {
    label: 'Indication',
    labelPT: 'Indicação',
    icon: 'Target',
    description: 'When to use'
  },
  protocol: {
    label: 'Protocol',
    labelPT: 'Protocolo',
    icon: 'ClipboardList',
    description: 'Treatment protocols'
  }
};

// Helper to group attributes by type
export function groupAttributesByType(
  attributes: ProductAttribute[]
): Record<ProductAttributeType, string[]> {
  const grouped: Record<ProductAttributeType, string[]> = {
    function: [],
    pathology: [],
    indication: [],
    protocol: []
  };

  for (const attr of attributes) {
    if (grouped[attr.attribute_type]) {
      grouped[attr.attribute_type].push(attr.attribute_value);
    }
  }

  return grouped;
}
