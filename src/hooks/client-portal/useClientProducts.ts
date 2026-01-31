import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  commercial_description: string | null;
  base_price: number;
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
}

export function useClientProducts(workspaceId: string | undefined): UseClientProductsReturn {
  const [filters, setFilters] = useState<ProductFilters>({});

  // Fetch products
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["client-products", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("products")
        .select("id, name, sku, short_description, commercial_description, base_price, category, images, primary_image_index, specifications, status, workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("name");

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If function or pathology filters are set, fetch attributes and filter
      if (filters.function || filters.pathology) {
        const productIds = (data || []).map((p) => p.id);
        
        if (productIds.length > 0) {
          const { data: attributes } = await supabase
            .from("product_attributes")
            .select("*")
            .in("product_id", productIds);

          // Filter products by attributes
          const filteredProducts = (data || []).filter((product) => {
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

          return filteredProducts as Product[];
        }
      }

      return (data || []) as Product[];
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
  };
}
