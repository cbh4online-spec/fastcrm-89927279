import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useBoostWallet() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();

  // Get seller id
  const { data: seller } = useQuery({
    queryKey: ["my-seller", wsId, user?.id],
    queryFn: async () => {
      if (!wsId || !user) return null;
      const { data } = await supabase
        .from("c2c_sellers")
        .select("id")
        .eq("user_id", user.id)
        .eq("workspace_id", wsId)
        .maybeSingle();
      return data;
    },
    enabled: !!wsId && !!user,
  });

  // Get wallet
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["boost-wallet", wsId, seller?.id],
    queryFn: async () => {
      if (!wsId || !seller) return null;
      const { data, error } = await supabase
        .from("c2c_boost_wallets")
        .select("*")
        .eq("seller_id", seller.id)
        .eq("workspace_id", wsId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wsId && !!seller,
  });

  // Get transactions
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["boost-transactions", wallet?.id],
    queryFn: async () => {
      if (!wallet) return [];
      const { data, error } = await supabase
        .from("c2c_boost_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wallet,
  });

  // Get config
  const { data: config } = useQuery({
    queryKey: ["boost-config", wsId],
    queryFn: async () => {
      if (!wsId) return null;
      const { data } = await supabase
        .from("c2c_boost_config")
        .select("*")
        .eq("workspace_id", wsId)
        .maybeSingle();
      return data;
    },
    enabled: !!wsId,
  });

  // Buy credits
  const buyCredits = useMutation({
    mutationFn: async (credits: number) => {
      if (!wsId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("create-boost-credit-checkout", {
        body: { credits, workspaceId: wsId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      // Refresh wallet after a delay
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["boost-wallet"] });
        qc.invalidateQueries({ queryKey: ["boost-transactions"] });
      }, 2000);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao comprar créditos");
    },
  });

  // Spend credits (activate boost)
  const spendCredits = useMutation({
    mutationFn: async ({
      listingId,
      boostType,
      days,
      cpcBudget,
    }: {
      listingId: string;
      boostType: "highlight" | "cpc" | "both";
      days?: number;
      cpcBudget?: number;
    }) => {
      if (!wallet || !wsId) throw new Error("Wallet não encontrada");

      const highlightCost = config?.highlight_cost_per_day ?? 5;
      let totalCost = 0;
      let description = "";

      if (boostType === "highlight" || boostType === "both") {
        const d = days ?? 7;
        totalCost += highlightCost * d;
        description += `Destaque ${d} dias`;
      }
      if (boostType === "cpc" || boostType === "both") {
        const budget = cpcBudget ?? 10;
        totalCost += budget;
        description += description ? ` + CPC ${budget} créditos` : `CPC ${budget} créditos`;
      }

      // Spend via RPC
      const { data, error } = await supabase.rpc("spend_boost_credits", {
        p_wallet_id: wallet.id,
        p_amount: totalCost,
        p_listing_id: listingId,
        p_description: description,
        p_workspace_id: wsId,
      });

      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string; new_balance?: number };
      if (!result.success) {
        throw new Error(
          result.error === "insufficient_credits"
            ? "Créditos insuficientes"
            : result.error || "Erro ao gastar créditos"
        );
      }

      // Create sponsored listing
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + (days ?? 7));

      const { error: insertError } = await supabase
        .from("c2c_sponsored_listings")
        .insert({
          workspace_id: wsId,
          listing_id: listingId,
          seller_id: wallet.seller_id,
          amount_paid: 0,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          is_active: true,
          boost_type: boostType,
          daily_cpc_budget: cpcBudget ?? 0,
        } as any);

      if (insertError) throw insertError;

      return result;
    },
    onSuccess: () => {
      toast.success("Impulso ativado com sucesso!");
      qc.invalidateQueries({ queryKey: ["boost-wallet"] });
      qc.invalidateQueries({ queryKey: ["boost-transactions"] });
      qc.invalidateQueries({ queryKey: ["c2c-my-boosts"] });
      qc.invalidateQueries({ queryKey: ["c2c-sponsored"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao ativar impulso");
    },
  });

  const balance = wallet?.balance ?? 0;
  const unitPrice = config?.credit_unit_price ?? 0.5;
  const highlightCostPerDay = config?.highlight_cost_per_day ?? 5;
  const cpcCostPerClick = config?.cpc_cost_per_click ?? 1;

  return {
    balance,
    wallet,
    walletLoading,
    transactions,
    txLoading,
    config,
    unitPrice,
    highlightCostPerDay,
    cpcCostPerClick,
    buyCredits,
    spendCredits,
    sellerId: seller?.id,
  };
}
