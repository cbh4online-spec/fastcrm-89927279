import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerAccount, PartnerTier } from "@/types/partner";

export function usePartnerAccount(partnerAccountId: string | undefined) {
  const { data: account, isLoading } = useQuery({
    queryKey: ["partner-account", partnerAccountId],
    enabled: !!partnerAccountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_accounts")
        .select("*, partner_tiers(*), partner_price_lists(*)")
        .eq("id", partnerAccountId!)
        .single();

      if (error) throw error;

      return {
        ...data,
        tier: data.partner_tiers as PartnerTier | null,
        price_list: data.partner_price_lists,
      } as PartnerAccount;
    },
  });

  const creditAvailable = account
    ? account.credit_limit - account.current_credit_exposure
    : 0;

  const creditUsagePercent = account && account.credit_limit > 0
    ? (account.current_credit_exposure / account.credit_limit) * 100
    : 0;

  return {
    account,
    isLoading,
    creditAvailable,
    creditUsagePercent,
  };
}
