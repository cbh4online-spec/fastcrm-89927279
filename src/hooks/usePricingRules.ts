import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface PricingRule {
  id: string;
  workspace_id: string;
  name: string;
  rule_type: "volume" | "customer" | "period" | "category";
  condition_json: Record<string, any>;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePricingRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["pricing-rules", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as PricingRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Omit<PricingRule, "id" | "workspace_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .insert({ ...input, workspace_id: currentWorkspace!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Regra de pricing criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingRule> & { id: string }) => {
      const { error } = await supabase.from("pricing_rules").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Regra atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Regra removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTogglePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("pricing_rules").update({ is_active: isActive } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
  });
}

/** Calcula o preço final aplicando regras por prioridade */
export function applyPricingRules(basePrice: number, rules: PricingRule[], context?: { qty?: number; categoryId?: string }): { finalPrice: number; appliedRule?: PricingRule } {
  const now = new Date();
  const activeRules = rules
    .filter(r => r.is_active)
    .filter(r => !r.starts_at || new Date(r.starts_at) <= now)
    .filter(r => !r.ends_at || new Date(r.ends_at) >= now)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const cond = rule.condition_json;
    if (rule.rule_type === "volume" && context?.qty && context.qty >= (cond.min_qty || 0)) {
      return { finalPrice: calcDiscount(basePrice, rule), appliedRule: rule };
    }
    if (rule.rule_type === "category" && context?.categoryId && cond.category_id === context.categoryId) {
      return { finalPrice: calcDiscount(basePrice, rule), appliedRule: rule };
    }
    if (rule.rule_type === "period") {
      return { finalPrice: calcDiscount(basePrice, rule), appliedRule: rule };
    }
  }
  return { finalPrice: basePrice };
}

function calcDiscount(price: number, rule: PricingRule): number {
  if (rule.discount_type === "percentage") return price * (1 - rule.discount_value / 100);
  return Math.max(0, price - rule.discount_value);
}
