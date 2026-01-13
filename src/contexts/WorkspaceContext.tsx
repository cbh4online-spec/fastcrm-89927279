import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type WorkspaceRole = "owner" | "admin" | "agent" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
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

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          role,
          workspace:workspaces(id, name, slug, created_at)
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const workspaceList: Workspace[] = (data || [])
        .filter((item) => item.workspace)
        .map((item) => ({
          id: (item.workspace as any).id,
          name: (item.workspace as any).name,
          slug: (item.workspace as any).slug,
          role: item.role as WorkspaceRole,
          created_at: (item.workspace as any).created_at,
        }));

      setWorkspaces(workspaceList);

      // Set current workspace from localStorage or first in list
      const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
      const savedWorkspace = workspaceList.find((w) => w.id === savedWorkspaceId);
      
      if (savedWorkspace) {
        setCurrentWorkspace(savedWorkspace);
      } else if (workspaceList.length > 0) {
        setCurrentWorkspace(workspaceList[0]);
        localStorage.setItem("currentWorkspaceId", workspaceList[0].id);
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
      // Create workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({ name, slug })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add current user as owner
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceData.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      const newWorkspace: Workspace = {
        id: workspaceData.id,
        name: workspaceData.name,
        slug: workspaceData.slug,
        role: "owner",
        created_at: workspaceData.created_at,
      };

      setWorkspaces((prev) => [...prev, newWorkspace]);
      handleSetCurrentWorkspace(newWorkspace);

      return { error: null, workspace: newWorkspace };
    } catch (error) {
      return { error: error as Error, workspace: null };
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
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
