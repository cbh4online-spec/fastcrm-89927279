import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OptimizeTableInput {
  priceTableId: string;
  strategy?: "competitive" | "premium" | "volume" | "customer_value";
  targetMargin?: number;
}

interface SuggestCustomerPricingInput {
  customerId: string;
  products?: { id: string; name: string; basePrice: number; cost?: number; category?: string }[];
}

interface AnalyzeMarginsInput {
  products: { id: string; name: string; basePrice: number; cost?: number; category?: string }[];
}

interface BulkAdjustInput {
  products: { id: string; name: string; basePrice: number }[];
  adjustmentPercent: number;
}

interface ProductSuggestion {
  productId: string;
  currentPrice: number;
  suggestedPrice: number;
  marginBefore: number;
  marginAfter: number;
  reasoning: string;
}

interface OptimizationResult {
  suggestions: ProductSuggestion[];
  summary: string;
  totalMarginImprovement: number;
}

interface CustomerPricingResult {
  recommendedSegment: string;
  suggestedDiscountRange: { min: number; max: number };
  pricingStrategy: string;
  reasoning: string;
  upsellOpportunities?: string[];
  riskLevel: "low" | "medium" | "high";
  productSuggestions?: {
    productName: string;
    originalPrice: number;
    suggestedPrice: number;
    discountPercent: number;
    justification: string;
  }[];
}

interface MarginAlert {
  productName: string;
  issue: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
}

interface MarginOpportunity {
  type: "price_increase" | "cost_reduction" | "bundle" | "upsell";
  description: string;
  potentialImpact: string;
}

interface MarginAnalysisResult {
  overallHealth: "good" | "warning" | "critical";
  averageMargin: number;
  alerts: MarginAlert[];
  opportunities: MarginOpportunity[];
  summary: string;
}

export function usePricingOptimizer() {
  const optimizeTable = useMutation({
    mutationFn: async (input: OptimizeTableInput): Promise<OptimizationResult> => {
      const { data, error } = await supabase.functions.invoke("ai-pricing-optimizer", {
        body: {
          mode: "optimize-table",
          priceTableId: input.priceTableId,
          strategy: input.strategy || "premium",
          targetMargin: input.targetMargin || 30,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao otimizar tabela");
      return data.data;
    },
    onError: (error) => {
      console.warn('[B2B-CATALOG] OPTIMIZE_TABLE_FAILED:', error.message);
    },
  });

  const suggestCustomerPricing = useMutation({
    mutationFn: async (input: SuggestCustomerPricingInput): Promise<CustomerPricingResult> => {
      const { data, error } = await supabase.functions.invoke("ai-pricing-optimizer", {
        body: {
          mode: "suggest-customer-pricing",
          customerId: input.customerId,
          products: input.products,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao sugerir preços");
      return data.data;
    },
    onError: (error) => {
      console.warn('[B2B-CATALOG] SUGGEST_CUSTOMER_PRICING_FAILED:', error.message);
    },
  });

  const analyzeMargins = useMutation({
    mutationFn: async (input: AnalyzeMarginsInput): Promise<MarginAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("ai-pricing-optimizer", {
        body: {
          mode: "analyze-margins",
          products: input.products,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao analisar margens");
      return data.data;
    },
    onError: (error) => {
      console.warn('[B2B-CATALOG] ANALYZE_MARGINS_FAILED:', error.message);
    },
  });

  const bulkAdjust = useMutation({
    mutationFn: async (input: BulkAdjustInput) => {
      const { data, error } = await supabase.functions.invoke("ai-pricing-optimizer", {
        body: {
          mode: "bulk-adjust",
          products: input.products,
          adjustmentPercent: input.adjustmentPercent,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao ajustar preços");
      return data.data;
    },
    onError: (error) => {
      console.warn('[B2B-CATALOG] BULK_ADJUST_FAILED:', error.message);
    },
  });

  return {
    optimizeTable,
    suggestCustomerPricing,
    analyzeMargins,
    bulkAdjust,
    isLoading:
      optimizeTable.isPending ||
      suggestCustomerPricing.isPending ||
      analyzeMargins.isPending ||
      bulkAdjust.isPending,
  };
}
