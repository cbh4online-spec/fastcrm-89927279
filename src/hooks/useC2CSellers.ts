import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CSeller {
  id: string;
  user_id: string;
  workspace_id: string;
  display_name: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
  iban: string | null;
  bank_name: string | null;
  account_holder: string | null;
  nif: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  total_sales: number;
  total_revenue: number;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface C2CCommission {
  id: string;
  workspace_id: string;
  seller_id: string;
  listing_id: string;
  buyer_id: string | null;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  seller_amount: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
}

// Check if current user is already a seller in a workspace
export function useMySellerProfile(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-seller", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      const { data, error } = await supabase
        .from("c2c_sellers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as C2CSeller | null;
    },
    enabled: !!workspaceId && !!user,
  });
}

// Register as seller
export function useRegisterSeller(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      display_name: string;
      bio?: string;
      phone?: string;
      location?: string;
      iban?: string;
      bank_name?: string;
      account_holder?: string;
      nif?: string;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem workspace ou utilizador");
      const { error } = await supabase.from("c2c_sellers").insert({
        ...data,
        workspace_id: workspaceId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-my-seller"] });
      toast.success("Candidatura submetida com sucesso!");
      console.log('[MARKETPLACE] Seller registered');
    },
    onError: (err: any) => {
      console.warn('[MARKETPLACE] SELLER_REGISTER_FAILED', err.message);
      if (err.message?.includes("duplicate")) {
        toast.error("Já tens uma candidatura registada");
      } else {
        toast.error("Erro ao submeter candidatura");
      }
    },
  });
}

// Admin: list all sellers
export function useC2CSellers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-sellers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_sellers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2CSeller[];
    },
    enabled: !!workspaceId,
  });
}

// Admin: approve/reject seller
export function useUpdateSellerStatus(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sellerId, status, rejectionReason }: {
      sellerId: string;
      status: "approved" | "rejected" | "suspended";
      rejectionReason?: string;
    }) => {
      const updates: any = { status };
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      if (status === "rejected" && rejectionReason) {
        updates.rejection_reason = rejectionReason;
      }
      const { error } = await supabase
        .from("c2c_sellers")
        .update(updates)
        .eq("id", sellerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-sellers"] });
      toast.success("Estado do vendedor atualizado");
      console.log('[MARKETPLACE] Seller status updated');
    },
    onError: (err: Error) => {
      console.warn('[MARKETPLACE] SELLER_STATUS_UPDATE_FAILED', err.message);
      toast.error("Erro ao atualizar vendedor");
    },
  });
}

// Admin: list commissions
export function useC2CCommissions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-commissions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_commissions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2CCommission[];
    },
    enabled: !!workspaceId,
  });
}
