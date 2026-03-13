import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export function useMyVerificationRequest(workspaceId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-verification", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      const { data, error } = await supabase
        .from("c2c_verification_requests")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      seller_id: string;
      user_id: string;
      document_type: string;
      document_urls: string[];
      business_name?: string;
      tax_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("c2c_verification_requests")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-my-verification"] });
      toast.success("Pedido de verificação submetido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVerificationRequests(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-verification-requests", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_verification_requests")
        .select("*, c2c_sellers(display_name, avatar_url)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status, rejectionReason, sellerId }: {
      requestId: string;
      status: "approved" | "rejected";
      rejectionReason?: string;
      sellerId: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Update request
      const { error: reqErr } = await supabase
        .from("c2c_verification_requests")
        .update({
          status,
          rejection_reason: rejectionReason || null,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (reqErr) throw reqErr;

      // Update seller verification status
      const sellerUpdate: any = {
        verification_status: status === "approved" ? "verified" : "rejected",
        is_verified: status === "approved",
      };
      if (status === "approved") {
        sellerUpdate.verified_at = new Date().toISOString();
        sellerUpdate.verified_by = userData.user?.id;
      }
      const { error: sellerErr } = await supabase
        .from("c2c_sellers")
        .update(sellerUpdate)
        .eq("id", sellerId);
      if (sellerErr) throw sellerErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-verification-requests"] });
      toast.success("Verificação processada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
