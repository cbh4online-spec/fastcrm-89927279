import { useLeadChefDashboard } from "./useLeadChefDashboard";

export interface LeadChefWeeklyFocusItem {
  id: string;
  title: string;
  hint?: string;
  to?: string;
}

export function useLeadChefWeeklyFocus(periodMonth?: string) {
  const { data, isLoading } = useLeadChefDashboard(periodMonth);
  const items: LeadChefWeeklyFocusItem[] = (data?.nextBestActions ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    hint: a.hint,
    to: a.to,
  }));
  return { items, isLoading };
}
