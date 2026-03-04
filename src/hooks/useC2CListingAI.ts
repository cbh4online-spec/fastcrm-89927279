import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzeResult {
  title: string;
  description: string;
  suggested_price_min?: number;
  suggested_price_max?: number;
  suggested_price: number;
  condition: string;
  category_id?: string;
}

interface PriceSuggestion {
  min_price: number;
  max_price: number;
  suggested_price: number;
  price_assessment: "below_market" | "competitive" | "above_market";
  reasoning: string;
}

function handleAIError(error: unknown) {
  const msg = error instanceof Error ? error.message : "Erro IA";
  if (msg.includes("429") || msg.includes("RATE_LIMITED")) {
    toast.error("Limite de pedidos IA excedido. Tenta novamente em breve.");
  } else if (msg.includes("402") || msg.includes("PAYMENT_REQUIRED")) {
    toast.error("Créditos IA insuficientes.");
  } else {
    toast.error(msg);
  }
}

export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: async ({ image, title, categories }: { image?: string; title?: string; categories: any[] }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "analyze-photo", image, title, categories },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data as AnalyzeResult;
    },
    onError: handleAIError,
  });
}

export function useGenerateTitle() {
  return useMutation({
    mutationFn: async ({ title, description, condition }: { title?: string; description?: string; condition?: string }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "generate-title", title, description, condition },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.title as string;
    },
    onError: handleAIError,
  });
}

export function useGenerateDescription() {
  return useMutation({
    mutationFn: async ({ title, description, condition, price }: { title?: string; description?: string; condition?: string; price?: number }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "generate-description", title, description, condition, price },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.description as string;
    },
    onError: handleAIError,
  });
}

export function useSuggestPrice() {
  return useMutation({
    mutationFn: async ({ title, description, condition, price }: { title?: string; description?: string; condition?: string; price?: number }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "suggest-price", title, description, condition, price },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data as PriceSuggestion;
    },
    onError: handleAIError,
  });
}

export function useSuggestCategory() {
  return useMutation({
    mutationFn: async ({ title, description, categories }: { title?: string; description?: string; categories: any[] }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "suggest-category", title, description, categories },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.category_id as string;
    },
    onError: handleAIError,
  });
}

export function useGenerateListingImage() {
  return useMutation({
    mutationFn: async ({ title, description, condition, count }: { title?: string; description?: string; condition?: string; count?: number }) => {
      const { data, error } = await supabase.functions.invoke("ai-c2c-listing-assistant", {
        body: { mode: "generate-image", title, description, condition, count: count || 1 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.images as string[];
    },
    onError: handleAIError,
  });
}
