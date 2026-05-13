import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AmbassadorProfile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  slug: string;
  iban: string | null;
  current_tier: "iniciante" | "bronze" | "prata" | "ouro" | "diamante";
  monthly_revenue_generated: number;
  lifetime_revenue_generated: number;
  total_earned: number;
  total_paid: number;
  available_balance: number;
  active_referrals_count: number;
  is_active: boolean;
}

export function useAmbassadorProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ambassador-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AmbassadorProfile | null> => {
      const { data, error } = await supabase
        .from("ambassadors" as any)
        .select("*")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error && (error as any).code !== "PGRST116") throw error;
      return (data as unknown as AmbassadorProfile | null) ?? null;
    },
  });
}

export function useAmbassadorReferrals(ambassadorId?: string) {
  return useQuery({
    queryKey: ["ambassador-referrals", ambassadorId],
    enabled: !!ambassadorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_referrals" as any)
        .select("*")
        .eq("ambassador_id", ambassadorId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useAmbassadorPayouts(ambassadorId?: string) {
  return useQuery({
    queryKey: ["ambassador-payouts", ambassadorId],
    enabled: !!ambassadorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_payouts" as any)
        .select("*")
        .eq("ambassador_id", ambassadorId!)
        .order("requested_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}
