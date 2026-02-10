import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SponsorApplication {
  id: string;
  workspace_id: string;
  user_id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  tier: "gold" | "silver" | "bronze";
  status: "pending" | "approved" | "rejected" | "active" | "expired";
  rejection_reason: string | null;
  stripe_payment_id: string | null;
  amount_paid: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// Get my sponsor applications for a workspace
export function useMyApplications(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor-my-apps", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("sponsor_applications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SponsorApplication[];
    },
    enabled: !!workspaceId && !!user,
  });
}

// Submit a sponsor application
export function useSubmitSponsorApplication(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      company_name: string;
      contact_email: string;
      contact_phone?: string;
      website_url?: string;
      logo_url?: string;
      description?: string;
      tier: "gold" | "silver" | "bronze";
    }) => {
      if (!workspaceId || !user) throw new Error("Sem workspace ou utilizador");
      const { error } = await supabase.from("sponsor_applications").insert({
        ...data,
        workspace_id: workspaceId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-my-apps"] });
      toast.success("Candidatura de parceiro submetida!");
    },
    onError: () => toast.error("Erro ao submeter candidatura"),
  });
}

// Checkout for sponsor tier
export function useSponsorCheckout() {
  return useMutation({
    mutationFn: async ({ workspaceId, applicationId, tier }: {
      workspaceId: string;
      applicationId?: string;
      tier: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-sponsor-checkout", {
        body: { workspaceId, applicationId, tier },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar checkout de sponsor");
    },
  });
}

// Admin: list all applications for workspace
export function useAdminSponsorApplications(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["sponsor-admin-apps", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("sponsor_applications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SponsorApplication[];
    },
    enabled: !!workspaceId,
  });
}

// Admin: approve/reject application
export function useUpdateSponsorApplication(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, status, rejectionReason }: {
      applicationId: string;
      status: "approved" | "rejected" | "active" | "expired";
      rejectionReason?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
        const starts = new Date();
        const ends = new Date(starts);
        ends.setMonth(ends.getMonth() + 1);
        updates.starts_at = starts.toISOString();
        updates.ends_at = ends.toISOString();
      }
      if (status === "rejected" && rejectionReason) {
        updates.rejection_reason = rejectionReason;
      }
      // When approved, also create/update store_sponsors entry
      if (status === "approved" || status === "active") {
        const { data: app } = await supabase
          .from("sponsor_applications")
          .select("*")
          .eq("id", applicationId)
          .single();
        if (app && workspaceId) {
          await supabase.from("store_sponsors").insert({
            workspace_id: workspaceId,
            name: app.company_name,
            logo_url: app.logo_url,
            website_url: app.website_url,
            description: app.description,
            tier: app.tier,
            is_active: true,
            sort_order: app.tier === "gold" ? 1 : app.tier === "silver" ? 2 : 3,
          });
        }
      }
      const { error } = await supabase
        .from("sponsor_applications")
        .update(updates)
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-admin-apps"] });
      qc.invalidateQueries({ queryKey: ["admin-store-sponsors"] });
      toast.success("Candidatura atualizada");
    },
    onError: () => toast.error("Erro ao atualizar candidatura"),
  });
}
