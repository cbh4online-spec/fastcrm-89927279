import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useEffect } from "react";

const sb = supabase as any;

export type GoogleService = "gmail" | "calendar" | "drive" | "docs_sheets";

export interface GoogleConnection {
  id: string;
  workspace_id: string;
  service: GoogleService;
  google_email: string | null;
  google_user_id: string | null;
  token_expires_at: string | null;
  scopes: string[];
  is_active: boolean;
  last_error: string | null;
  has_refresh_token: boolean;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useGoogleWorkspaceConnections() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["google-workspace-connections", wid],
    enabled: !!wid,
    queryFn: async (): Promise<GoogleConnection[]> => {
      const { data, error } = await sb
        .from("workspace_google_connections_safe")
        .select("*")
        .eq("workspace_id", wid);
      if (error) throw error;
      return (data || []) as GoogleConnection[];
    },
  });
}

export function useConnectGoogleService() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  // Listen for the popup's success message and refresh
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "google-oauth-success") {
        toast.success("Conta Google ligada");
        qc.invalidateQueries({ queryKey: ["google-workspace-connections"] });
      } else if (e.data?.type === "google-oauth-error") {
        toast.error(e.data.message || "Erro na ligação Google");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc]);

  return useMutation({
    mutationFn: async (service: GoogleService) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke(
        "google-workspace-oauth-start",
        {
          body: {
            workspace_id: currentWorkspace.id,
            service,
            redirect_to: window.location.pathname,
          },
        },
      );
      if (error) throw error;
      const authUrl = (data as any)?.auth_url as string;
      if (!authUrl) throw new Error("URL de autorização não recebida");
      const w = window.open(
        authUrl,
        "google-oauth",
        "width=520,height=680,menubar=no,toolbar=no",
      );
      if (!w) {
        // Popup blocked → fallback to redirect
        window.location.href = authUrl;
      }
      return true;
    },
    onError: (e: any) => toast.error(e.message || "Erro a iniciar OAuth"),
  });
}

export function useDisconnectGoogleService() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: GoogleService) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke(
        "google-workspace-disconnect",
        { body: { workspace_id: currentWorkspace.id, service } },
      );
      if (error) throw error;
      if ((data as any)?.error && !(data as any)?.ok) {
        throw new Error((data as any).error);
      }
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-workspace-connections"] });
      toast.success("Ligação Google removida");
    },
    onError: (e: any) => toast.error(e.message || "Erro a desligar"),
  });
}
