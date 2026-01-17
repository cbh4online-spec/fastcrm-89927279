import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "./useProducts";
import type { Product } from "@/types/product";
import type { CartItem } from "@/components/proposals/ProposalCart";

interface SuggestProductsContext {
  opportunityTitle?: string;
  opportunityValue?: number;
  leadName?: string;
  companyName?: string;
}

export interface ProductSuggestion {
  product: Product;
  matchScore: number;
  reason: string;
  suggestedQuantity: number;
}

export function useProposalCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const updatePrice = useCallback((productId: string, priceOverride: number | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, priceOverride } : item
      )
    );
  }, []);

  const updateDiscount = useCallback((productId: string, discount: number | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getSelectedProductIds = useCallback(() => {
    return items.map((item) => item.product.id);
  }, [items]);

  const calculateTotals = useCallback(() => {
    return items.reduce(
      (acc, item) => {
        const basePrice = item.priceOverride ?? item.product.base_price ?? 0;
        const discountAmount = item.discount ? basePrice * (item.discount / 100) : 0;
        const itemTotal = (basePrice - discountAmount) * item.quantity;
        const itemCost = ((item.product.direct_cost ?? 0) + (item.product.operational_cost ?? 0)) * item.quantity;
        
        return {
          subtotal: acc.subtotal + itemTotal,
          cost: acc.cost + itemCost,
          margin: acc.subtotal + itemTotal - (acc.cost + itemCost),
        };
      },
      { subtotal: 0, cost: 0, margin: 0 }
    );
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    updateDiscount,
    clearCart,
    getSelectedProductIds,
    calculateTotals,
    setItems,
  };
}

export function useSuggestProposalProducts() {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allProducts } = useProducts({ status: "active" });

  const generateSuggestions = useCallback(async (context: SuggestProductsContext) => {
    if (!allProducts || allProducts.length === 0) {
      setError("Não há produtos disponíveis");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "suggest-proposal-products",
        {
          body: {
            context,
            products: allProducts.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              product_type: p.product_type,
              short_description: p.short_description,
              base_price: p.base_price,
              billing_type: p.billing_type,
            })),
          },
        }
      );

      if (fnError) throw fnError;

      // Map suggestions back to full product objects
      const mappedSuggestions: ProductSuggestion[] = (data?.suggestions || [])
        .map((s: any) => {
          const product = allProducts.find((p) => p.id === s.productId);
          if (!product) return null;
          return {
            product,
            matchScore: s.matchScore,
            reason: s.reason,
            suggestedQuantity: s.suggestedQuantity || 1,
          };
        })
        .filter(Boolean) as ProductSuggestion[];

      setSuggestions(mappedSuggestions);
    } catch (err) {
      console.error("Error generating suggestions:", err);
      setError("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [allProducts]);

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions,
  };
}
