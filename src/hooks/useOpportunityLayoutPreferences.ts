import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const DEFAULT_HIGHLIGHTS = ['stage', 'owner', 'company', 'documents', 'value'];
export const DEFAULT_SIDEBAR_ORDER = ['communication', 'dealInfo', 'associations', 'companyInfo', 'lists', 'intelligence'];

export interface OpportunityLayoutPreferences {
  id: string;
  workspace_id: string;
  user_id: string;
  visible_highlights: string[];
  highlights_order: string[] | null;
  sidebar_order: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useOpportunityLayoutPreferences() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['opportunity-layout-preferences', currentWorkspace?.id, user?.id],
    queryFn: async (): Promise<OpportunityLayoutPreferences | null> => {
      if (!currentWorkspace?.id || !user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('opportunity_layout_preferences')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching layout preferences:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });
}

export function useUpdateOpportunityLayoutPreferences() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { t } = useTranslation("crm");

  return useMutation({
    mutationFn: async (prefs: {
      visible_highlights?: string[];
      highlights_order?: string[] | null;
      sidebar_order?: string[] | null;
    }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('No workspace/user');

      const { data, error } = await (supabase as any)
        .from('opportunity_layout_preferences')
        .upsert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['opportunity-layout-preferences', currentWorkspace?.id, user?.id],
      });
      toast.success(t("oppLayout_saved"));
    },
    onError: (error) => {
      console.error('Error updating layout preferences:', error);
      toast.error("Error saving layout");
    },
  });
}

export function getVisibleHighlights(prefs: OpportunityLayoutPreferences | null | undefined): string[] {
  if (!prefs) return DEFAULT_HIGHLIGHTS;
  const order = prefs.highlights_order ?? DEFAULT_HIGHLIGHTS;
  return order.filter(h => prefs.visible_highlights.includes(h));
}

export function getSidebarOrder(prefs: OpportunityLayoutPreferences | null | undefined): string[] {
  if (!prefs?.sidebar_order) return DEFAULT_SIDEBAR_ORDER;
  return prefs.sidebar_order;
}
