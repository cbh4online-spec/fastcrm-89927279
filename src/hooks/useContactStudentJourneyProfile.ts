import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ContactStudentJourneyProfile {
  id: string;
  full_name: string;
  lifecycle_stage: string;
}

export function useContactStudentJourneyProfile(contactId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ["sj-profile-by-contact", contactId, currentWorkspace?.id],
    queryFn: async () => {
      if (!contactId || !currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from("sj_profiles")
        .select("id, full_name, lifecycle_stage")
        .eq("contact_id", contactId)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contactId && !!currentWorkspace?.id,
  });
}
