import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OnboardingProfile {
  company_name: string;
  team_type: string;
  selling_sector: string;
}

export interface OnboardingICP {
  company_type: string;
  industry: string;
  geography: string;
  size_band: string;
  notes: string;
}

export interface OnboardingAccount {
  name: string;
  domain: string;
  notes?: string;
}

export function useAccountBriefOnboarding() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: workspaceConfig, isLoading } = useQuery({
    queryKey: ["account-brief-workspace", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from("account_brief_workspaces")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const isOnboardingComplete = !!workspaceConfig?.onboarding_completed_at;

  const completeOnboarding = useMutation({
    mutationFn: async ({
      profile,
      icp,
      accounts,
    }: {
      profile: OnboardingProfile;
      icp: OnboardingICP;
      accounts: OnboardingAccount[];
    }) => {
      if (!workspaceId || !user) throw new Error("Workspace não encontrado");

      // 1. Upsert workspace config
      await supabase.from("account_brief_workspaces").upsert({
        workspace_id: workspaceId,
        is_enabled: true,
        onboarding_completed_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });

      // 2. Save profile
      await supabase.from("account_brief_profiles").upsert({
        workspace_id: workspaceId,
        company_name: profile.company_name,
        team_type: profile.team_type,
        selling_sector: profile.selling_sector,
        created_by: user.id,
      }, { onConflict: "workspace_id" });

      // 3. Save ICP
      await supabase.from("account_brief_icp_profiles").insert({
        workspace_id: workspaceId,
        company_type: icp.company_type,
        industry: icp.industry,
        geography: icp.geography,
        size_band: icp.size_band,
        notes: icp.notes,
        is_default: true,
      });

      // 4. Create accounts
      for (const acc of accounts) {
        if (!acc.domain) continue;
        const normalized = acc.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
        await supabase.from("account_brief_accounts").insert({
          workspace_id: workspaceId,
          name: acc.name || normalized,
          domain: acc.domain,
          normalized_domain: normalized,
          created_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Onboarding concluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro no onboarding");
    },
  });

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
  };
}
