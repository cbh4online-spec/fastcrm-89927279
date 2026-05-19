import type { AppMode } from "@/config/appModes";

export interface UseAppModeResult {
  mode: AppMode;
  isLeadChefOnly: false;
  isLoading: false;
}

/**
 * Modo de interface activo. Após a remoção do LeadChef, é sempre `fastcrm`.
 */
export function useAppMode(): UseAppModeResult {
  return { mode: "fastcrm", isLeadChefOnly: false, isLoading: false };
}
