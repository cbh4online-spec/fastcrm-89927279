import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CEndorsement {
  id: string;
  seller_id: string;
  endorser_id: string;
  message: string | null;
  workspace_id: string;
  created_at: string;
}

export function useSellerEndorsements(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-endorsements", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_seller_endorsements")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as C2CEndorsement[];
    },
    enabled: !!sellerId,
  });
}

export function useToggleEndorsement() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sellerId,
      workspaceId,
      message,
    }: {
      sellerId: string;
      workspaceId: string;
      message?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      // Check if already endorsed
      const { data: existing } = await supabase
        .from("c2c_seller_endorsements")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("endorser_id", user.id)
        .maybeSingle();

      if (existing) {
        // Remove endorsement
        const { error } = await supabase
          .from("c2c_seller_endorsements")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "removed" as const };
      } else {
        // Add endorsement
        const { error } = await supabase
          .from("c2c_seller_endorsements")
          .insert({
            seller_id: sellerId,
            endorser_id: user.id,
            workspace_id: workspaceId,
            message: message || null,
          });
        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["c2c-endorsements", vars.sellerId] });
      toast.success(
        result.action === "added"
          ? "Recomendação adicionada!"
          : "Recomendação removida"
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao processar recomendação");
    },
  });
}
