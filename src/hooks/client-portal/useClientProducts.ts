import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEffectivePrice, ClientPriceTier, ProductTierPrice } from "@/types/pricing-tier";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  commercial_description: string | null;
  base_price: number;
  effective_price: number; // Price after tier discounts
  has_discount: boolean;
  category: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  specifications: Record<string, any> | null;
  status: string;
  workspace_id: string;
}

interface ProductFilters {
  search?: string;
  category?: string;
  function?: string;
  pathology?: string;
  line?: string;
}

interface UseClientProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  categories: string[];
  functions: string[];
  pathologies: string[];
  lines: string[];
  tier: ClientPriceTier | null;
  discountPercentage: number;
}

export function useClientProducts(
  workspaceId: string | undefined,
  clientUserId?: string
): UseClientProductsReturn {
  const [filters, setFilters] = useState<ProductFilters>({});

  // Fetch client user's price tier
  const { data: tierData } = useQuery({
    queryKey: ["client-user-tier", clientUserId],
    queryFn: async () => {
      if (!clientUserId) return null;

      const { data: clientUser } = await supabase
        .from("client_users")
        .select("price_tier_id")
        .eq("id", clientUserId)
        .single();

      if (!clientUser?.price_tier_id) return null;

      const { data: tier } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", clientUser.price_tier_id)
        .single();

      return tier as ClientPriceTier | null;
    },
    enabled: !!clientUserId,
  });

  // Fetch tier-specific prices
  const { data: tierPrices = [] } = useQuery({
    queryKey: ["client-tier-prices", tierData?.id],
    queryFn: async () => {
      if (!tierData?.id) return [];

      const { data } = await supabase
        .from("product_tier_prices")
        .select("*")
        .eq("tier_id", tierData.id)
        .eq("is_active", true);

      return (data || []) as ProductTierPrice[];
    },
    enabled: !!tierData?.id,
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["client-products", workspaceId, filters, tierData?.id, tierPrices.length],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("products")
        .select("id, name, sku, short_description, commercial_description, base_price, category, images, primary_image_index, specifications, status, workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("b2b_published", true)
        .order("name");

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.line) {
        query = query.eq("line", filters.line);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply tier pricing to products
      const productsWithPricing = (data || []).map((product) => {
        const tierPrice = tierPrices.find(tp => tp.product_id === product.id);
        const effectivePrice = getEffectivePrice(
          product.base_price,
          tierData,
          tierPrice || null
        );
        
        return {
          ...product,
          effective_price: effectivePrice,
          has_discount: effectivePrice < product.base_price,
        } as Product;
      });

      // If function or pathology filters are set, fetch attributes and filter
      if (filters.function || filters.pathology) {
        const productIds = productsWithPricing.map((p) => p.id);
        
        if (productIds.length > 0) {
          const { data: attributes } = await supabase
            .from("product_attributes")
            .select("*")
            .in("product_id", productIds);

          // Filter products by attributes
          const filteredProducts = productsWithPricing.filter((product) => {
            const productAttrs = (attributes || []).filter((a) => a.product_id === product.id);
            
            if (filters.function) {
              const hasFunction = productAttrs.some(
                (a) => a.attribute_type === "function" && a.attribute_value === filters.function
              );
              if (!hasFunction) return false;
            }
            
            if (filters.pathology) {
              const hasPathology = productAttrs.some(
                (a) => a.attribute_type === "pathology" && a.attribute_value === filters.pathology
              );
              if (!hasPathology) return false;
            }
            
            return true;
          });

          return filteredProducts;
        }
      }

      return productsWithPricing;
    },
    enabled: !!workspaceId,
  });

  // Fetch unique categories from products
  const { data: categories = [] } = useQuery({
    queryKey: ["client-product-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .not("category", "is", null);
      
      const uniqueCategories = [...new Set((data || []).map(p => p.category).filter(Boolean))] as string[];
      return uniqueCategories.sort();
    },
    enabled: !!workspaceId,
  });

  // Fetch unique lines from products
  const { data: lines = [] } = useQuery({
    queryKey: ["client-product-lines", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("products")
        .select("line")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .not("line", "is", null);
      
      const uniqueLines = [...new Set((data || []).map((p: any) => p.line).filter(Boolean))] as string[];
      return uniqueLines.sort();
    },
    enabled: !!workspaceId,
  });

  // Fetch unique attribute values for filters
  const { data: attributeValues = { functions: [], pathologies: [] } } = useQuery({
    queryKey: ["client-attribute-values", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { functions: [] as string[], pathologies: [] as string[] };
      
      const { data } = await supabase
        .from("product_attributes")
        .select("attribute_type, attribute_value")
        .eq("workspace_id", workspaceId);

      const functions = [...new Set(
        (data || [])
          .filter((a) => a.attribute_type === "function")
          .map((a) => a.attribute_value)
      )] as string[];

      const pathologies = [...new Set(
        (data || [])
          .filter((a) => a.attribute_type === "pathology")
          .map((a) => a.attribute_value)
      )] as string[];

      return { functions, pathologies };
    },
    enabled: !!workspaceId,
  });

  return {
    products,
    loading: productsLoading,
    error: productsError?.message || null,
    filters,
    setFilters,
    categories,
    functions: attributeValues.functions,
    pathologies: attributeValues.pathologies,
    lines,
    tier: tierData || null,
    discountPercentage: tierData?.discount_percentage || 0,
  };
}
