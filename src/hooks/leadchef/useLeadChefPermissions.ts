import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace, type WorkspaceRole } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";

export type LeadChefRole = "admin" | "manager" | "agent";

export interface LeadChefPermissions {
  isLoading: boolean;
  userId: string | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  leadchefRole: LeadChefRole;
  isAgent: boolean;
  isManager: boolean;
  isAdmin: boolean;
  canViewTeam: boolean;
  canViewAllLeadChefData: boolean;
  canEditTeamGoals: boolean;
  canAssignLeads: boolean;
  canViewPermissionsPage: boolean;
}

export function useLeadChefPermissions(): LeadChefPermissions {
  const { user } = useAuth();
  const { currentWorkspace, loading: wsLoading, isSuperAdmin } = useWorkspace();
  const { isLoading: roleLoading } = useUserRole();

  return useMemo(() => {
    const role = currentWorkspace?.role ?? null;
    let leadchefRole: LeadChefRole = "agent";
    if (isSuperAdmin || role === "owner" || role === "admin") leadchefRole = "admin";
    else if (role === "agency" || role === "hr") leadchefRole = "manager";
    else leadchefRole = "agent";

    const isAdmin = leadchefRole === "admin";
    const isManager = leadchefRole === "manager" || isAdmin;
    const isAgent = !isManager;

    return {
      isLoading: wsLoading || roleLoading,
      userId: user?.id ?? null,
      workspaceId: currentWorkspace?.id ?? null,
      workspaceRole: role,
      leadchefRole,
      isAgent,
      isManager,
      isAdmin,
      canViewTeam: isManager,
      canViewAllLeadChefData: isManager,
      canEditTeamGoals: isAdmin,
      canAssignLeads: isAdmin,
      canViewPermissionsPage: isManager,
    };
  }, [user?.id, currentWorkspace, isSuperAdmin, wsLoading, roleLoading]);
}
