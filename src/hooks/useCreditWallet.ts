import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CreditWallet {
  id: string;
  workspace_id: string;
  balance: number;
  reserved_balance: number;
  monthly_limit: number | null;
  daily_limit: number | null;
}

export interface CreditPricingRule {
  id: string;
  action_key: string;
  label: string;
  description: string | null;
  credits_cost: number;
  module: string;
  category: string;
  is_active: boolean;
}

export interface CreditLedgerEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  action_key: string;
  module: string;
  reference_type: string | null;
  reference_id: string | null;
  credits_amount: number;
  direction: string;
  status: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useCreditWallet() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch wallet
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["credit-wallet", workspaceId],
    queryFn: async (): Promise<CreditWallet | null> => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("credit_wallets")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as CreditWallet | null;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // Fetch pricing rules
  const { data: pricingRules = [] } = useQuery({
    queryKey: ["credit-pricing-rules"],
    queryFn: async (): Promise<CreditPricingRule[]> => {
      const { data, error } = await supabase
        .from("credit_pricing_rules")
        .select("*")
        .eq("is_active", true)
        .order("credits_cost", { ascending: true });
      if (error) throw error;
      return data as CreditPricingRule[];
    },
    staleTime: 5 * 60_000,
  });

  // Fetch ledger
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["credit-ledger", workspaceId],
    queryFn: async (): Promise<CreditLedgerEntry[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("credit_ledger")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CreditLedgerEntry[];
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // Get cost for an action
  const getCost = (actionKey: string): number => {
    const rule = pricingRules.find((r) => r.action_key === actionKey);
    return rule?.credits_cost ?? 0;
  };

  // Get pricing rule for an action
  const getRule = (actionKey: string): CreditPricingRule | undefined => {
    return pricingRules.find((r) => r.action_key === actionKey);
  };

  // Check if user can afford action
  const canAfford = (actionKey: string): boolean => {
    const cost = getCost(actionKey);
    return (wallet?.balance ?? 0) >= cost;
  };

  // Consume credits via RPC
  const consumeCredits = useMutation({
    mutationFn: async ({
      actionKey,
      idempotencyKey,
      referenceType,
      referenceId,
      metadata,
    }: {
      actionKey: string;
      idempotencyKey?: string;
      referenceType?: string;
      referenceId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!workspaceId || !user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("consume_funnel_credits", {
        p_workspace_id: workspaceId,
        p_user_id: user.id,
        p_action_key: actionKey,
        p_idempotency_key: idempotencyKey || null,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
        p_metadata: (metadata || {}) as Json,
      });

      if (error) throw error;
      const result = (data as unknown as Array<{ success: boolean; credits_consumed: number; balance_remaining: number; message: string }>)?.[0];
      if (!result?.success) {
        throw new Error(result?.message || "Erro ao consumir créditos");
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit-wallet", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["credit-ledger", workspaceId] });
      if (result.credits_consumed > 0) {
        toast.success(`${result.credits_consumed} crédito${result.credits_consumed > 1 ? "s" : ""} consumido${result.credits_consumed > 1 ? "s" : ""}`);
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Erro ao consumir créditos";
      toast.error(msg);
    },
  });

  return {
    wallet,
    walletLoading,
    balance: wallet?.balance ?? 0,
    pricingRules,
    ledger,
    ledgerLoading,
    getCost,
    getRule,
    canAfford,
    consumeCredits,
  };
}
