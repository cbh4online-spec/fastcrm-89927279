import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export type WorkspaceRole = "owner" | "admin" | "agent" | "viewer" | "agency";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  created_at: string;
  isAgencyManaged?: boolean;
  logo_url?: string | null;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  isSuperAdmin: boolean;
  ownWorkspaces: Workspace[];
  managedWorkspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<{ error: Error | null; workspace: Workspace | null }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      setIsSuperAdmin(false);
      return;
    }

    try {
      // Check if user is super admin
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      const isAdmin = !!superAdminCheck;
      setIsSuperAdmin(isAdmin);

      let workspaceList: Workspace[] = [];

      if (isAdmin) {
        // Super admin: fetch ALL workspaces
        const { data: allWorkspaces, error: wsError } = await supabase
          .from("workspaces")
          .select("id, name, slug, created_at, logo_url")
          .order("name");

        if (wsError) throw wsError;

        // Also get user's own memberships to know which are "own" vs "managed"
        const { data: ownMemberships } = await supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", user.id);

        const ownMembershipMap = new Map(
          (ownMemberships || []).map((m) => [m.workspace_id, m.role as WorkspaceRole])
        );

        workspaceList = (allWorkspaces || []).map((ws) => ({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          created_at: ws.created_at,
          role: ownMembershipMap.get(ws.id) || ("agency" as WorkspaceRole),
          isAgencyManaged: !ownMembershipMap.has(ws.id),
          logo_url: ws.logo_url,
        }));
      } else {
        // Normal user: fetch only workspaces where they are members
        const { data, error } = await supabase
          .from("workspace_members")
          .select(`
            role,
            workspace:workspaces(id, name, slug, created_at, managed_by_workspace_id)
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const ownWorkspacesList = (data || [])
          .filter((item) => item.workspace)
          .map((item) => ({
            id: (item.workspace as any).id,
            name: (item.workspace as any).name,
            slug: (item.workspace as any).slug,
            role: item.role as WorkspaceRole,
            created_at: (item.workspace as any).created_at,
            isAgencyManaged: false,
            logo_url: (item.workspace as any).logo_url,
          }));

        // Check if user is part of an agency workspace (has agency plan)
        const userAgencyWorkspaceIds = ownWorkspacesList
          .filter(ws => ws.role === "owner" || ws.role === "admin")
          .map(ws => ws.id);

        // Fetch workspaces managed by the user's agency workspaces
        let managedByAgencyList: Workspace[] = [];
        if (userAgencyWorkspaceIds.length > 0) {
          const { data: managedWorkspaces } = await supabase
            .from("workspaces")
            .select("id, name, slug, created_at, managed_by_workspace_id, logo_url")
            .in("managed_by_workspace_id", userAgencyWorkspaceIds);

          managedByAgencyList = (managedWorkspaces || []).map((ws) => ({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            created_at: ws.created_at,
            role: "agency" as WorkspaceRole,
            isAgencyManaged: true,
            logo_url: ws.logo_url,
          }));
        }

        workspaceList = [...ownWorkspacesList, ...managedByAgencyList];
      }

      setWorkspaces(workspaceList);

      // Set current workspace from localStorage or first in list
      const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
      const savedWorkspace = workspaceList.find((w) => w.id === savedWorkspaceId);
      
      if (savedWorkspace) {
        setCurrentWorkspace(savedWorkspace);
      } else if (workspaceList.length > 0) {
        // Clear invalid workspace ID from localStorage
        if (savedWorkspaceId) {
          console.warn("Saved workspace ID not found in user's workspaces, clearing:", savedWorkspaceId);
          localStorage.removeItem("currentWorkspaceId");
        }
        setCurrentWorkspace(workspaceList[0]);
        localStorage.setItem("currentWorkspaceId", workspaceList[0].id);
      } else {
        // No workspaces available, clear localStorage
        localStorage.removeItem("currentWorkspaceId");
        setCurrentWorkspace(null);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem("currentWorkspaceId", workspace.id);
  };

  const createWorkspace = async (name: string) => {
    if (!user) return { error: new Error("Not authenticated"), workspace: null };

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    try {
      // Usar função RPC SECURITY DEFINER para criar workspace e owner atomicamente
      const { data, error } = await supabase.rpc('create_workspace_with_owner', {
        p_name: name,
        p_slug: slug,
      });

      if (error) throw error;

      const workspaceData = data as { id: string; name: string; slug: string; created_at: string };

      const newWorkspace: Workspace = {
        id: workspaceData.id,
        name: workspaceData.name,
        slug: workspaceData.slug,
        role: "owner",
        created_at: workspaceData.created_at,
      };

      setWorkspaces((prev) => [...prev, newWorkspace]);
      handleSetCurrentWorkspace(newWorkspace);

      console.log(`[WORKSPACES] Created workspace: ${newWorkspace.id}`);
      emitKernelEvent({
        workspace_id: newWorkspace.id,
        type: 'WORKSPACE.CREATED',
        entity_kind: 'workspace',
        entity_id: newWorkspace.id,
        source_module: 'admin-workspaces',
        payload: { workspace_name: name, slug },
      });

      return { error: null, workspace: newWorkspace };
    } catch (error) {
      console.warn('[WORKSPACES] CREATE_FAILED', (error as Error).message);
      return { error: error as Error, workspace: null };
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  // Separate own workspaces from agency-managed ones
  const ownWorkspaces = workspaces.filter((w) => !w.isAgencyManaged);
  const managedWorkspaces = workspaces.filter((w) => w.isAgencyManaged);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        isSuperAdmin,
        ownWorkspaces,
        managedWorkspaces,
        setCurrentWorkspace: handleSetCurrentWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
