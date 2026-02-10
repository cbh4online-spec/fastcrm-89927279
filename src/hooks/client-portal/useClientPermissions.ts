import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";

export type ClientRole = "client_admin" | "client_financial" | "client_operational" | "client_viewer";

interface ClientPermissions {
  roles: ClientRole[];
  isLoading: boolean;
  // Permission flags
  canManageTeam: boolean;
  canApprove: boolean;
  canPurchase: boolean;
  canViewInvoices: boolean;
  canViewFinancials: boolean;
  canViewContracts: boolean;
  canCreateTickets: boolean;
  // Role checks
  isAdmin: boolean;
  isFinancial: boolean;
  isOperational: boolean;
  isViewer: boolean;
  // Limits
  spendingLimit: number | null;
  allowedCategories: string[] | null;
}

export function useClientPermissions(): ClientPermissions {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser, loading: authLoading } = useClientAuth({ workspaceId });

  const { data, isLoading } = useQuery({
    queryKey: ["client-user-roles", clientUser?.id],
    queryFn: async () => {
      if (!clientUser?.id) return { roles: [], spendingLimit: null, allowedCategories: null };

      const { data: roleRecords, error } = await supabase
        .from("client_user_roles")
        .select("role, spending_limit, allowed_product_categories")
        .eq("client_user_id", clientUser.id);

      if (error) {
        console.error("Error fetching client roles:", error);
        // Fallback to client_admin on error (e.g. RLS blocking) for resilience
        return { roles: ["client_admin" as ClientRole], spendingLimit: null, allowedCategories: null };
      }

      if (!roleRecords || roleRecords.length === 0) {
        // No roles assigned — treat as admin if they're the "first" user (backwards compat)
        return { roles: ["client_admin" as ClientRole], spendingLimit: null, allowedCategories: null };
      }

      const roles = roleRecords.map((r) => r.role as ClientRole);
      // Use the most permissive spending limit across roles
      const limits = roleRecords
        .map((r) => r.spending_limit)
        .filter((l): l is number => l !== null);
      const spendingLimit = limits.length > 0 ? Math.max(...limits) : null;

      // Merge allowed categories
      const allCats = roleRecords
        .map((r) => r.allowed_product_categories as string[] | null)
        .filter((c): c is string[] => c !== null)
        .flat();
      const allowedCategories = allCats.length > 0 ? [...new Set(allCats)] : null;

      return { roles, spendingLimit, allowedCategories };
    },
    enabled: !!clientUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const roles = data?.roles ?? [];
  const hasRole = (r: ClientRole) => roles.includes(r);

  const isAdmin = hasRole("client_admin");
  const isFinancial = hasRole("client_financial");
  const isOperational = hasRole("client_operational");
  const isViewer = hasRole("client_viewer");

  return {
    roles,
    isLoading: authLoading || isLoading,
    // Permissions
    canManageTeam: isAdmin,
    canApprove: isAdmin,
    canPurchase: isAdmin || isOperational,
    canViewInvoices: isAdmin || isFinancial,
    canViewFinancials: isAdmin || isFinancial,
    canViewContracts: isAdmin || isFinancial,
    canCreateTickets: isAdmin || isOperational || isFinancial,
    // Roles
    isAdmin,
    isFinancial,
    isOperational,
    isViewer,
    // Limits
    spendingLimit: data?.spendingLimit ?? null,
    allowedCategories: data?.allowedCategories ?? null,
  };
}
