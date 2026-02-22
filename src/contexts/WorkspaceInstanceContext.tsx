import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as mainSupabase } from "@/integrations/supabase/client";
import { createDynamicClient } from "@/lib/dynamicSupabase";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceStatus = "active" | "suspended" | "inactive" | "pending";

interface WorkspaceInstanceData {
  id: string;
  workspace_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  status: WorkspaceStatus;
  metadata: Record<string, unknown>;
}

interface ControlPlaneConfig {
  url: string;
  enabled: boolean;
}

interface ControlPlaneResponse {
  success: boolean;
  workspace?: {
    id: string;
    status: WorkspaceStatus;
    supabase_url: string;
    supabase_anon_key: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

interface WorkspaceInstanceContextType {
  // The Supabase client to use for CRM/Inbox data
  workspaceClient: SupabaseClient<Database>;
  // The main Supabase client (for admin operations)
  mainClient: SupabaseClient<Database>;
  // Current workspace instance data
  instanceData: WorkspaceInstanceData | null;
  // Workspace status
  workspaceStatus: WorkspaceStatus | null;
  // Loading state
  isLoading: boolean;
  // Error message if any
  error: string | null;
  // Refresh workspace instance
  refreshInstance: () => Promise<void>;
  // Whether using external Control Plane
  isUsingControlPlane: boolean;
}

const WorkspaceInstanceContext = createContext<WorkspaceInstanceContextType | undefined>(
  undefined
);

export function WorkspaceInstanceProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [instanceData, setInstanceData] = useState<WorkspaceInstanceData | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus | null>(null);
  const [workspaceClient, setWorkspaceClient] = useState<SupabaseClient<Database>>(mainSupabase);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlPlaneConfig, setControlPlaneConfig] = useState<ControlPlaneConfig | null>(null);
  const [isUsingControlPlane, setIsUsingControlPlane] = useState(false);
  const hasResolved = useRef(false);
  const lastWorkspaceId = useRef<string | null>(null);

  // Fetch Control Plane configuration from admin_settings
  const fetchControlPlaneConfig = useCallback(async () => {
    try {
      const { data, error } = await mainSupabase
        .from("admin_settings")
        .select("value")
        .eq("key", "control_plane")
        .maybeSingle();

      if (error) {
        console.error("Error fetching control plane config:", error);
        return null;
      }

      if (data?.value) {
        const config = data.value as unknown as ControlPlaneConfig;
        setControlPlaneConfig(config);
        return config;
      }

      return null;
    } catch (err) {
      console.error("Error fetching control plane config:", err);
      return null;
    }
  }, []);

  // Call external Control Plane API
  const callControlPlane = useCallback(
    async (config: ControlPlaneConfig, workspaceId: string): Promise<ControlPlaneResponse | null> => {
      if (!config.enabled || !config.url || !session?.access_token) {
        return null;
      }

      try {
        const response = await fetch(`${config.url}/resolve-workspace`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Control Plane error:", errorText);
          return { success: false, error: `Control Plane error: ${response.status}` };
        }

        return await response.json();
      } catch (err) {
        console.error("Error calling Control Plane:", err);
        return { success: false, error: "Failed to connect to Control Plane" };
      }
    },
    [session?.access_token]
  );

  // Fetch workspace instance from local database
  const fetchLocalInstance = useCallback(
    async (workspaceId: string): Promise<WorkspaceInstanceData | null> => {
      try {
        const { data, error } = await mainSupabase
          .from("workspace_instances")
          .select("*")
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching workspace instance:", error);
          return null;
        }

        return data as WorkspaceInstanceData | null;
      } catch (err) {
        console.error("Error fetching workspace instance:", err);
        return null;
      }
    },
    []
  );

  // Main function to resolve workspace instance
  const resolveWorkspaceInstance = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setIsLoading(false);
      return;
    }

    // Only show loading spinner on first resolution
    if (!hasResolved.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // First, check Control Plane config
      const config = controlPlaneConfig ?? (await fetchControlPlaneConfig());

      // Try Control Plane first if enabled
      if (config?.enabled && config?.url) {
        setIsUsingControlPlane(true);
        const cpResponse = await callControlPlane(config, currentWorkspace.id);

        if (cpResponse?.success && cpResponse.workspace) {
          const { workspace } = cpResponse;
          
          // Check workspace status
          if (workspace.status === "suspended" || workspace.status === "inactive") {
            setWorkspaceStatus(workspace.status);
            setInstanceData(null);
            setWorkspaceClient(mainSupabase);
            setIsLoading(false);
            return;
          }

          // Create dynamic client for the workspace
          const client = createDynamicClient(
            workspace.supabase_url,
            workspace.supabase_anon_key
          );

          setInstanceData({
            id: workspace.id,
            workspace_id: currentWorkspace.id,
            supabase_url: workspace.supabase_url,
            supabase_anon_key: workspace.supabase_anon_key,
            status: workspace.status,
            metadata: workspace.metadata ?? {},
          });
          setWorkspaceStatus(workspace.status);
          setWorkspaceClient(client);
          setIsLoading(false);
          return;
        }

        if (cpResponse?.error) {
          setError(cpResponse.error);
        }
      }

      // Fallback to local workspace_instances table
      setIsUsingControlPlane(false);
      const localInstance = await fetchLocalInstance(currentWorkspace.id);

      if (localInstance) {
        // Check workspace status
        if (localInstance.status === "suspended" || localInstance.status === "inactive") {
          setWorkspaceStatus(localInstance.status);
          setInstanceData(localInstance);
          setWorkspaceClient(mainSupabase);
          setIsLoading(false);
          return;
        }

        // Create dynamic client for the workspace
        const client = createDynamicClient(
          localInstance.supabase_url,
          localInstance.supabase_anon_key
        );

        setInstanceData(localInstance);
        setWorkspaceStatus(localInstance.status);
        setWorkspaceClient(client);
      } else {
        // No instance configured, use main Supabase client
        setInstanceData(null);
        setWorkspaceStatus("active");
        setWorkspaceClient(mainSupabase);
      }
    } catch (err) {
      console.error("Error resolving workspace instance:", err);
      setError("Failed to resolve workspace configuration");
      setWorkspaceClient(mainSupabase);
    } finally {
      hasResolved.current = true;
      setIsLoading(false);
    }
  }, [
    currentWorkspace?.id,
    controlPlaneConfig,
    fetchControlPlaneConfig,
    callControlPlane,
    fetchLocalInstance,
  ]);

  // Reset hasResolved when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastWorkspaceId.current) {
      hasResolved.current = false;
      lastWorkspaceId.current = currentWorkspace.id;
    }
  }, [currentWorkspace?.id]);

  // Resolve workspace instance when workspace changes
  useEffect(() => {
    if (user && currentWorkspace?.id) {
      resolveWorkspaceInstance();
    } else {
      setIsLoading(false);
      setWorkspaceClient(mainSupabase);
    }
  }, [user, currentWorkspace?.id, resolveWorkspaceInstance]);

  const refreshInstance = useCallback(async () => {
    await resolveWorkspaceInstance();
  }, [resolveWorkspaceInstance]);

  return (
    <WorkspaceInstanceContext.Provider
      value={{
        workspaceClient,
        mainClient: mainSupabase,
        instanceData,
        workspaceStatus,
        isLoading,
        error,
        refreshInstance,
        isUsingControlPlane,
      }}
    >
      {children}
    </WorkspaceInstanceContext.Provider>
  );
}

export function useWorkspaceInstance() {
  const context = useContext(WorkspaceInstanceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaceInstance must be used within a WorkspaceInstanceProvider"
    );
  }
  return context;
}
