// Types for Product Operational Control (Stock, MOQ, Delivery)

export type StockStatus = 'available' | 'limited' | 'backorder' | 'out_of_stock';

export interface ProductOperationalData {
  stock_status: StockStatus;
  stock_notes: string | null;
  min_order_quantity: number;
  order_multiple: number;
  pack_size: number;
  delivery_estimate: string;
  delivery_notes: string | null;
}

// Status display configuration
export const stockStatusConfig: Record<StockStatus, {
  label: string;
  labelPT: string;
  color: string;
  bgColor: string;
  icon: 'check' | 'alert' | 'clock' | 'x';
}> = {
  available: {
    label: 'Available',
    labelPT: 'Disponível',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'check',
  },
  limited: {
    label: 'Limited Stock',
    labelPT: 'Stock Limitado',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'alert',
  },
  backorder: {
    label: 'Backorder',
    labelPT: 'Sob Encomenda',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'clock',
  },
  out_of_stock: {
    label: 'Out of Stock',
    labelPT: 'Esgotado',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'x',
  },
};

// Validation helpers
export function validateQuantity(
  quantity: number,
  minOrderQuantity: number,
  orderMultiple: number
): { valid: boolean; message: string | null } {
  if (quantity < minOrderQuantity) {
    return {
      valid: false,
      message: `Quantidade mínima: ${minOrderQuantity} unidades`,
    };
  }

  if (orderMultiple > 1 && quantity % orderMultiple !== 0) {
    return {
      valid: false,
      message: `Este produto vende-se em múltiplos de ${orderMultiple}`,
    };
  }

  return { valid: true, message: null };
}

// Calculate next valid quantity
export function getNextValidQuantity(
  currentQuantity: number,
  minOrderQuantity: number,
  orderMultiple: number,
  direction: 'up' | 'down'
): number {
  if (direction === 'up') {
    const nextMultiple = Math.ceil((currentQuantity + 1) / orderMultiple) * orderMultiple;
    return Math.max(nextMultiple, minOrderQuantity);
  } else {
    const prevMultiple = Math.floor((currentQuantity - 1) / orderMultiple) * orderMultiple;
    return Math.max(prevMultiple, minOrderQuantity);
  }
}

// Format delivery estimate for display
export function formatDeliveryEstimate(estimate: string, notes?: string | null): string {
  if (notes) {
    return `${estimate} (${notes})`;
  }
  return estimate;
}

// Calculate max delivery time from multiple items
export function calculateMaxDeliveryTime(estimates: string[]): string {
  const deliveryDays: Record<string, number> = {
    '24h': 1,
    '24-48h': 2,
    '48h': 2,
    '2-3 dias': 3,
    '3-5 dias': 5,
    '5-7 dias': 7,
    '7-10 dias': 10,
    '10-15 dias': 15,
    'Sob consulta': 999,
  };

  let maxDays = 0;
  let maxEstimate = '24-48h';

  for (const estimate of estimates) {
    const days = deliveryDays[estimate] || 0;
    if (days > maxDays) {
      maxDays = days;
      maxEstimate = estimate;
    }
  }

  return maxEstimate;
}
