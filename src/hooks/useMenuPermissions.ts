import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";

export interface MenuPermission {
  id: string;
  role: string;
  menu_key: string;
  can_access: boolean;
  can_edit: boolean;
}

interface ProfileMenuPerm {
  sales_function: string;
  menu_key: string;
  visible: boolean;
}

export function useMenuPermissions() {
  const { currentWorkspace, workspaces } = useWorkspace();
  const { salesFunction } = useAdaptiveDashboard();
  
  // Get current user's role in the workspace
  const currentUserRole = currentWorkspace 
    ? workspaces.find(w => w.id === currentWorkspace.id)?.role 
    : null;

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ["menu-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_permissions")
        .select("*");
      
      if (error) throw error;
      return data as MenuPermission[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: profilePerms } = useQuery({
    queryKey: ["profile-menu-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_menu_permissions")
        .select("sales_function, menu_key, visible");
      if (error) throw error;
      return data as ProfileMenuPerm[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Combined check: role permission ∩ profile permission
  const canAccessMenu = (menuKey: string): boolean => {
    // 1. Role-based check (existing logic — only applies to known role-menu entries)
    let roleAllowed = true;
    if (currentUserRole && permissions) {
      if (currentUserRole === "owner") {
        roleAllowed = true;
      } else {
        const permission = permissions.find(
          p => p.role === currentUserRole && p.menu_key === menuKey
        );
        // Only restrict if a role permission entry exists for this menu
        if (permission !== undefined) {
          roleAllowed = permission.can_access;
        }
      }
    }

    // 2. Profile-based check (checks both menuKey and route key)
    let profileAllowed = true;
    if (profilePerms && salesFunction) {
      const profilePerm = profilePerms.find(
        p => p.sales_function === salesFunction && p.menu_key === menuKey
      );
      if (profilePerm !== undefined) {
        profileAllowed = profilePerm.visible;
      }
    }

    return roleAllowed && profileAllowed;
  };

  const canEditMenu = (menuKey: string): boolean => {
    if (!currentUserRole || !permissions) return true;
    
    if (currentUserRole === "owner") return true;
    
    const permission = permissions.find(
      p => p.role === currentUserRole && p.menu_key === menuKey
    );
    
    return permission?.can_edit ?? false;
  };

  const getPermissionsForRole = (role: string): MenuPermission[] => {
    return permissions?.filter(p => p.role === role) || [];
  };

  const getAllPermissions = (): MenuPermission[] => {
    return permissions || [];
  };

  return {
    permissions,
    isLoading,
    error,
    currentUserRole,
    canAccessMenu,
    canEditMenu,
    getPermissionsForRole,
    getAllPermissions,
  };
}

export const MENU_KEYS = {
  DASHBOARD: 'dashboard',
  FEED: 'feed',
  PRODUCTIVITY: 'productivity',
  INBOX: 'inbox',
  CRM: 'crm',
  LEADS: 'leads',
  CONTACTS: 'contacts',
  COMPANIES: 'companies',
  PIPELINE: 'pipeline',
  PROPOSALS: 'proposals',
  INVOICES: 'invoices',
  PRODUCTS: 'products',
  MARKETING: 'marketing',
  AUTOMATIONS: 'automations',
  REPORTS: 'reports',
  CALENDAR: 'calendar',
  SETTINGS: 'settings',
  TEAM: 'team',
  INTEGRATIONS: 'integrations',
} as const;

export type MenuKey = typeof MENU_KEYS[keyof typeof MENU_KEYS];
