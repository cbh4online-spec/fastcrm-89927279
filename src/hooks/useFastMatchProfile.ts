import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface FastMatchProfile {
  id: string;
  workspace_id: string;
  user_id: string;
  member_id: string | null;
  company_name: string | null;
  industry: string | null;
  target_audience: string | null;
  ticket_range: string | null;
  services_offered: string[] | null;
  services_needed: string[] | null;
  bio: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  reputation_score: number;
  reputation_count: number;
  is_verified: boolean;
  is_founder: boolean;
  founder_quota_override: number | null;
  founder_expiry_date: string | null;
  match_quota_monthly: number;
  match_used_current_period: number;
  extra_credits_balance: number;
  period_reset_date: string;
  strategic_score: number | null;
  strategic_reasons: any | null;
  last_score_update: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFastMatchProfile() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["fastmatch-profile", currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!user || !currentWorkspace) return null;

      const { data, error } = await supabase
        .from("fastmatch_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as FastMatchProfile | null;
    },
    enabled: !!user && !!currentWorkspace,
  });
}

export function useUpdateFastMatchProfile() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user || !currentWorkspace) throw new Error("Not authenticated");

      // Check if profile exists
      const { data: existing } = await supabase
        .from("fastmatch_profiles")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("fastmatch_profiles")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return { data, is_new: false, fields_changed: Object.keys(updates) };
      } else {
        const { data, error } = await supabase
          .from("fastmatch_profiles")
          .insert({
            workspace_id: currentWorkspace.id,
            user_id: user.id,
            ...updates,
          } as any)
          .select()
          .single();
        if (error) throw error;
        return { data, is_new: true, fields_changed: Object.keys(updates) };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-profile", currentWorkspace?.id, user?.id] });

      emitKernelEvent({
        workspace_id: currentWorkspace!.id,
        type: 'FASTMATCH.PROFILE_UPDATED',
        entity_kind: 'fastmatch_profile',
        entity_id: result.data.id,
        actor_id: user!.id,
        source_module: 'crm-fastmatch',
        payload: {
          fields_changed: result.fields_changed,
          is_new: result.is_new,
        },
      });
      console.log(`[FASTMATCH] Profile ${result.is_new ? 'created' : 'updated'}: ${result.data.id}`);
    },
    onError: (err: any) => {
      console.warn('[FASTMATCH] PROFILE_UPDATE_FAILED', err?.message);
    },
  });
}
