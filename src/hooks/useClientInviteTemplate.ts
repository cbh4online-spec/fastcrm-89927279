import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientInviteTemplate {
  id: string;
  workspace_id: string;
  template_type: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  header_title: string;
  greeting_template: string;
  intro_text: string;
  features_title: string;
  features_list: string[];
  button_text: string;
  footer_text: string;
  custom_portal_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientInviteTemplate(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["client-invite-template", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from("workspace_email_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("template_type", "client_invitation")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          features_list: Array.isArray(data.features_list) 
            ? data.features_list 
            : [],
        } as ClientInviteTemplate;
      }
      
      return null;
    },
    enabled: !!workspaceId,
  });
}
