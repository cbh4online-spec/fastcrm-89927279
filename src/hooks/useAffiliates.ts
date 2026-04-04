import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ── My Affiliate (current user) ──
export function useMyAffiliate(workspaceId?: string) {
  return useQuery({
    queryKey: ["my-affiliate", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("affiliates")
        .select("*, affiliate_balances(*), affiliate_program_tiers(*)")
        .eq("workspace_id", workspaceId!)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });
}

// ── All Affiliates (admin) ──
export function useAllAffiliates(status?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["all-affiliates", currentWorkspace?.id, status],
    queryFn: async () => {
      let q = (supabase as any)
        .from("affiliates")
        .select("*, affiliate_balances(*), affiliate_programs(name), affiliate_program_tiers(name)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

// ── Register as affiliate ──
export function useRegisterAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      workspace_id: string;
      program_id?: string;
      email: string;
      full_name: string;
      phone?: string;
      company_name?: string;
      website_url?: string;
      parent_code?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Autenticação necessária");

      let parent_affiliate_id = null;
      if (payload.parent_code) {
        const { data: parent } = await (supabase as any)
          .from("affiliates")
          .select("id")
          .eq("workspace_id", payload.workspace_id)
          .eq("affiliate_code", payload.parent_code)
          .eq("status", "active")
          .maybeSingle();
        parent_affiliate_id = parent?.id ?? null;
      }

      // Check auto-approve
      const { data: settings } = await (supabase as any)
        .from("affiliate_settings")
        .select("auto_approve_affiliates")
        .eq("workspace_id", payload.workspace_id)
        .maybeSingle();

      const status = settings?.auto_approve_affiliates ? "active" : "pending";

      const { data, error } = await (supabase as any)
        .from("affiliates")
        .insert({
          workspace_id: payload.workspace_id,
          user_id: user.id,
          program_id: payload.program_id,
          email: payload.email,
          full_name: payload.full_name,
          phone: payload.phone,
          company_name: payload.company_name,
          website_url: payload.website_url,
          parent_affiliate_id,
          status,
          affiliate_code: "", // trigger will generate
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-affiliate"] });
      toast.success(
        data.status === "active"
          ? "Registo aprovado automaticamente!"
          : "Candidatura submetida! Aguarde aprovação."
      );
    },
    onError: (e: Error) => toast.error(e.message || "Erro no registo"),
  });
}

// ── Approve/Reject/Suspend affiliate (admin) ──
export function useUpdateAffiliateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "active") {
        const { data: { user } } = await supabase.auth.getUser();
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      const { error } = await (supabase as any).from("affiliates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-affiliates"] });
      toast.success("Estado actualizado");
    },
  });
}

// ── Affiliate Links ──
export function useAffiliateLinks(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-links", affiliateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateId,
  });
}

export function useCreateAffiliateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: Record<string, unknown>) => {
      const { data, error } = await (supabase as any)
        .from("affiliate_links")
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-links"] });
      toast.success("Link criado");
    },
  });
}

// ── Conversions ──
export function useAffiliateConversions(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-conversions", affiliateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_conversions")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .order("converted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateId,
  });
}

export function useAllConversions(status?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["all-affiliate-conversions", currentWorkspace?.id, status],
    queryFn: async () => {
      let q = (supabase as any)
        .from("affiliate_conversions")
        .select("*, affiliates(full_name, affiliate_code)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("converted_at", { ascending: false })
        .limit(200);
      if (status && status !== "all") q = q.eq("status", status);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateConversionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "approved") {
        const { data: { user } } = await supabase.auth.getUser();
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      const { error } = await (supabase as any).from("affiliate_conversions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-affiliate-conversions"] });
      qc.invalidateQueries({ queryKey: ["affiliate-conversions"] });
      toast.success("Conversão actualizada");
    },
  });
}

// ── Payouts ──
export function useAffiliatePayouts(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-payouts", affiliateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateId,
  });
}

export function useAllPayouts() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["all-affiliate-payouts", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_payouts")
        .select("*, affiliates(full_name, affiliate_code)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (payout: { affiliate_id: string; amount: number; method: string; reference_note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("affiliate_payouts")
        .insert({
          ...payout,
          workspace_id: currentWorkspace!.id,
          processed_by: user?.id,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-affiliate-payouts"] });
      toast.success("Payout criado");
    },
  });
}

export function useUpdatePayoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") {
        const { data: { user } } = await supabase.auth.getUser();
        updates.processed_at = new Date().toISOString();
        updates.processed_by = user?.id;
      }
      const { error } = await (supabase as any).from("affiliate_payouts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-affiliate-payouts"] });
      qc.invalidateQueries({ queryKey: ["affiliate-payouts"] });
      toast.success("Payout actualizado");
    },
  });
}

// ── Notifications ──
export function useAffiliateNotifications(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-notifications", affiliateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_notifications")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!affiliateId,
  });
}

// ── Payout Methods ──
export function usePayoutMethods(affiliateId?: string) {
  return useQuery({
    queryKey: ["affiliate-payout-methods", affiliateId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("affiliate_payout_methods")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateId,
  });
}

export function useUpsertPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (method: Record<string, unknown>) => {
      const { data, error } = method.id
        ? await (supabase as any).from("affiliate_payout_methods").update(method).eq("id", method.id).select().single()
        : await (supabase as any).from("affiliate_payout_methods").insert(method).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-payout-methods"] });
      toast.success("Método de pagamento guardado");
    },
  });
}
