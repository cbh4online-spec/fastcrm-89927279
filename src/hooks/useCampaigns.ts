import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type CampaignMechanic =
  | "percentage_discount"
  | "fixed_amount_discount"
  | "fixed_price"
  | "bogo"
  | "buy_n_get_n_pct"
  | "bundle"
  | "volume_tiered"
  | "free_shipping"
  | "gift_product"
  | "cashback"
  | "store_credit"
  | "cart_progressive"
  | "flash_sale"
  | "happy_hour"
  | "seasonal"
  | "launch_price"
  | "clearance"
  | "first_purchase"
  | "birthday"
  | "referral"
  | "loyalty";

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";
export type CampaignChannel = "store_b2c" | "marketplace_c2c" | "b2b" | "crm" | "all";
export type CampaignAudience =
  | "all"
  | "new_customers"
  | "returning"
  | "vip"
  | "segment"
  | "b2b_tier"
  | "geo"
  | "birthday"
  | "referral"
  | "custom";

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  internal_code: string | null;
  mechanic: CampaignMechanic;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  weekdays: number[] | null;
  hour_start: number | null;
  hour_end: number | null;
  priority: number;
  stackable: boolean;
  exclusive_group: string | null;
  channels: CampaignChannel[];
  audience: CampaignAudience;
  audience_config: Record<string, any>;
  requires_coupon: boolean;
  mechanic_config: Record<string, any>;
  target_scope: string;
  product_ids: string[] | null;
  category_slugs: string[] | null;
  brand_slugs: string[] | null;
  tag_slugs: string[] | null;
  excluded_product_ids: string[] | null;
  max_total_uses: number | null;
  max_uses_per_customer: number | null;
  max_total_budget: number | null;
  min_cart_value: number | null;
  min_quantity: number | null;
  ab_variant: string | null;
  ab_traffic_pct: number;
  enforce_omnibus: boolean;
  uses_count: number;
  revenue_generated: number;
  discount_given: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type CampaignInput = Partial<Omit<Campaign, "id" | "workspace_id" | "uses_count" | "revenue_generated" | "discount_given" | "created_at" | "updated_at">> &
  Pick<Campaign, "name" | "mechanic">;

export function useCampaigns() {
  const { currentWorkspace: workspace } = useWorkspace();
  return useQuery({
    queryKey: ["campaigns", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Campaign[];
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { currentWorkspace: workspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: CampaignInput) => {
      if (!workspace?.id) throw new Error("Sem workspace activo");
      const payload = {
        ...input,
        workspace_id: workspace.id,
        status: input.status ?? "draft",
        mechanic_config: input.mechanic_config ?? {},
        audience_config: input.audience_config ?? {},
        channels: input.channels ?? ["all"],
      };
      const { data, error } = await supabase.from("campaigns").insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro a criar campanha"),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase.from("campaigns").update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro a actualizar"),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro a eliminar"),
  });
}

export function useToggleCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase.from("campaigns").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
