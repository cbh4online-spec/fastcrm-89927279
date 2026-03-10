import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits_amount: number;
  price: number;
  currency: string;
  stripe_price_id: string | null;
  is_active: boolean;
}

export function useCreditPurchase() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceId = currentWorkspace?.id;

  // Fetch active packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ["credit-packages"],
    queryFn: async (): Promise<CreditPackage[]> => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("credits_amount", { ascending: true });
      if (error) throw error;
      return data as CreditPackage[];
    },
    staleTime: 5 * 60_000,
  });

  // Purchase mutation
  const purchaseCredits = useMutation({
    mutationFn: async (packageId: string) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("module-purchase-credits", {
        body: { workspaceId, packageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string; sessionId: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar compra");
    },
  });

  // Verify purchase mutation
  const verifyPurchase = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("verify-credit-purchase", {
        body: { sessionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; credits?: number; already_processed?: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["credit-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["credit-ledger"] });
      if (data.success && !data.already_processed) {
        toast.success(`${data.credits} créditos adicionados à sua carteira!`);
      } else if (data.already_processed) {
        toast.info("Esta compra já foi processada.");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao verificar compra");
    },
  });

  // Auto-verify on return from Stripe
  useEffect(() => {
    const purchase = searchParams.get("purchase");
    const sessionId = searchParams.get("session_id");
    if (purchase === "success" && sessionId) {
      verifyPurchase.mutate(sessionId);
      // Clean URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("purchase");
      newParams.delete("session_id");
      newParams.delete("credits");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  return {
    packages,
    packagesLoading,
    purchaseCredits,
    verifyPurchase,
  };
}
