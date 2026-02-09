import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ConditionalOfferConditions {
  client_type?: string[];
  pipeline_stages?: string[];
  min_total_spent?: number;
  segment_ids?: string[];
  price_tier_ids?: string[];
  tags?: string[];
  min_orders?: number;
  countries?: string[];
}

export interface ConditionalOffer {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: ConditionalOfferConditions;
  offer_type: string;
  discount_percentage: number | null;
  discount_fixed: number | null;
  special_price: number | null;
  free_product_ids: string[] | null;
  min_order_value: number | null;
  applies_to: string;
  product_ids: string[] | null;
  category_ids: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DynamicPricingRule {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  priority: number;
  segment_id: string | null;
  price_tier_id: string | null;
  client_type: string | null;
  pricing_type: string;
  value: number;
  applies_to: string;
  product_ids: string[] | null;
  category_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AIGeneratedOffer {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  offer_type: string;
  ai_reasoning: string | null;
  confidence_score: number | null;
  based_on: Record<string, unknown> | null;
  product_ids: string[] | null;
  discount_percentage: number | null;
  special_price: number | null;
  coupon_code: string | null;
  delivery_channel: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

// ======= Conditional Offers =======

export function useConditionalOffers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-conditional-offers", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_conditional_offers" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ConditionalOffer[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateConditionalOffer() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offer: Partial<ConditionalOffer>) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase
        .from("store_conditional_offers" as any)
        .insert({ ...offer, workspace_id: currentWorkspace.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-conditional-offers"] });
      toast.success("Oferta condicional criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateConditionalOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConditionalOffer> & { id: string }) => {
      const { error } = await supabase
        .from("store_conditional_offers" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-conditional-offers"] });
      toast.success("Oferta atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteConditionalOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_conditional_offers" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-conditional-offers"] });
      toast.success("Oferta eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ======= Dynamic Pricing =======

export function useDynamicPricingRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-dynamic-pricing", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_dynamic_pricing" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DynamicPricingRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateDynamicPricing() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<DynamicPricingRule>) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase
        .from("store_dynamic_pricing" as any)
        .insert({ ...rule, workspace_id: currentWorkspace.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-dynamic-pricing"] });
      toast.success("Regra de preço criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteDynamicPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_dynamic_pricing" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-dynamic-pricing"] });
      toast.success("Regra eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ======= AI Offers =======

export function useAIOffers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-ai-offers", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_ai_offers" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as AIGeneratedOffer[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useApproveAIOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("store_ai_offers" as any)
        .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-ai-offers"] });
      toast.success("Oferta aprovada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useRejectAIOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_ai_offers" as any)
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-ai-offers"] });
      toast.success("Oferta rejeitada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ======= Store Product Visibility =======

export function useUpdateProductVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, visibility }: { productId: string; visibility: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ store_visibility: visibility } as any)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["store-products"] });
      toast.success("Visibilidade atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ======= Resolve offers for a contact (storefront) =======

export interface ResolvedStoreOffer {
  type: "conditional" | "dynamic" | "ai";
  name: string;
  offer_type: string;
  discount_percentage?: number;
  discount_fixed?: number;
  special_price?: number;
  product_ids?: string[];
  applies_to: string;
}

export async function resolveOffersForContact(
  workspaceId: string,
  contactContext: {
    contact_id?: string;
    email?: string;
    client_type?: string;
    pipeline_stage?: string;
    total_spent?: number;
    order_count?: number;
    segment_ids?: string[];
    price_tier_id?: string;
    tags?: string[];
  }
): Promise<ResolvedStoreOffer[]> {
  const resolved: ResolvedStoreOffer[] = [];

  // Fetch active conditional offers
  const { data: offers } = await supabase
    .from("store_conditional_offers" as any)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  for (const offer of (offers || []) as unknown as ConditionalOffer[]) {
    const c = offer.conditions;
    let matches = true;

    if (c.client_type?.length && !c.client_type.includes(contactContext.client_type || "")) matches = false;
    if (c.pipeline_stages?.length && !c.pipeline_stages.includes(contactContext.pipeline_stage || "")) matches = false;
    if (c.min_total_spent && (contactContext.total_spent || 0) < c.min_total_spent) matches = false;
    if (c.min_orders && (contactContext.order_count || 0) < c.min_orders) matches = false;
    if (c.segment_ids?.length && !c.segment_ids.some(s => contactContext.segment_ids?.includes(s))) matches = false;
    if (c.price_tier_ids?.length && !c.price_tier_ids.includes(contactContext.price_tier_id || "")) matches = false;
    if (c.tags?.length && !c.tags.some(t => contactContext.tags?.includes(t))) matches = false;

    if (offer.usage_limit && offer.usage_count >= offer.usage_limit) matches = false;
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) matches = false;
    if (offer.starts_at && new Date(offer.starts_at) > new Date()) matches = false;

    if (matches) {
      resolved.push({
        type: "conditional",
        name: offer.name,
        offer_type: offer.offer_type,
        discount_percentage: offer.discount_percentage ?? undefined,
        discount_fixed: offer.discount_fixed ?? undefined,
        special_price: offer.special_price ?? undefined,
        product_ids: offer.product_ids ?? undefined,
        applies_to: offer.applies_to,
      });
    }
  }

  // Fetch dynamic pricing
  const { data: rules } = await supabase
    .from("store_dynamic_pricing" as any)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  for (const rule of (rules || []) as unknown as DynamicPricingRule[]) {
    let matches = true;
    if (rule.client_type && rule.client_type !== contactContext.client_type) matches = false;
    if (rule.price_tier_id && rule.price_tier_id !== contactContext.price_tier_id) matches = false;
    if (rule.segment_id && !contactContext.segment_ids?.includes(rule.segment_id)) matches = false;

    if (matches) {
      resolved.push({
        type: "dynamic",
        name: rule.name,
        offer_type: rule.pricing_type,
        discount_percentage: rule.pricing_type === "percentage_discount" ? rule.value : undefined,
        discount_fixed: rule.pricing_type === "fixed_discount" ? rule.value : undefined,
        special_price: rule.pricing_type === "fixed_price" ? rule.value : undefined,
        product_ids: rule.product_ids ?? undefined,
        applies_to: rule.applies_to,
      });
    }
  }

  // Fetch AI offers for this contact
  if (contactContext.contact_id) {
    const { data: aiOffers } = await supabase
      .from("store_ai_offers" as any)
      .select("*")
      .eq("contact_id", contactContext.contact_id)
      .in("status", ["approved", "delivered"])
      .gt("expires_at", new Date().toISOString());

    for (const ai of (aiOffers || []) as unknown as AIGeneratedOffer[]) {
      resolved.push({
        type: "ai",
        name: ai.title,
        offer_type: ai.offer_type,
        discount_percentage: ai.discount_percentage ?? undefined,
        special_price: ai.special_price ?? undefined,
        product_ids: ai.product_ids ?? undefined,
        applies_to: "specific_products",
      });
    }
  }

  return resolved;
}
