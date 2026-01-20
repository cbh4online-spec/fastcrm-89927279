import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface MenuPermission {
  id: string;
  role: string;
  menu_key: string;
  can_access: boolean;
  can_edit: boolean;
}

export function useMenuPermissions() {
  const { currentWorkspace, workspaces } = useWorkspace();
  
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const canAccessMenu = (menuKey: string): boolean => {
    if (!currentUserRole || !permissions) return true; // Default to allow if loading
    
    // Super admins and owners have full access
    if (currentUserRole === "owner") return true;
    
    const permission = permissions.find(
      p => p.role === currentUserRole && p.menu_key === menuKey
    );
    
    return permission?.can_access ?? false;
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
