import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface B2BWorkspacePayload {
  name: string;
  company_name?: string;
  tax_id?: string;
  team_size?: string;
  business_type?: string;
  primary_objective?: string;
  my_title?: string;
}

export function useOnboardingActions() {
  const { refreshWorkspaces, setCurrentWorkspace, workspaces } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);

  const createB2B = async (payload: B2BWorkspacePayload) => {
    setSubmitting(true);
    try {
      const slug = payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { data, error } = await supabase.rpc("create_workspace_b2b", {
        p_name: payload.name,
        p_slug: slug,
        p_company_name: payload.company_name ?? null,
        p_tax_id: payload.tax_id ?? null,
        p_team_size: payload.team_size ?? null,
        p_business_type: payload.business_type ?? null,
        p_primary_objective: payload.primary_objective ?? null,
        p_my_title: payload.my_title ?? null,
      });
      if (error) throw error;
      const ws = data as { id: string; name: string; slug: string };
      await refreshWorkspaces();
      // setCurrentWorkspace via id after refresh
      localStorage.setItem("currentWorkspaceId", ws.id);
      toast.success("Organização criada!");
      return ws;
    } catch (e: any) {
      console.error("[onboarding] createB2B failed", e);
      toast.error(e?.message ?? "Não foi possível criar a organização");
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const acceptInvite = async (token: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: token });
      if (error) throw error;
      const res = data as { workspace_id: string; role: string };
      await refreshWorkspaces();
      localStorage.setItem("currentWorkspaceId", res.workspace_id);
      toast.success("Convite aceite!");
      return res;
    } catch (e: any) {
      console.error("[onboarding] acceptInvite failed", e);
      toast.error(e?.message ?? "Não foi possível aceitar o convite");
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const selectExisting = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) setCurrentWorkspace(ws);
  };

  return { createB2B, acceptInvite, selectExisting, submitting };
}
