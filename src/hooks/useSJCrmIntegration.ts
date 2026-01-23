import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SJProfile } from "@/types/studentJourney";

/**
 * Hook for integrating Student Journey profiles with CRM Core
 * Handles:
 * - Converting profiles to CRM contacts
 * - Linking profiles to existing contacts
 * - Creating opportunities from enrollments
 */
export function useSJCrmIntegration() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Convert a Student Journey profile to a CRM Contact
   * Creates the contact and updates the profile with the contact_id
   */
  const convertToContact = useMutation({
    mutationFn: async ({
      profile,
      additionalData,
    }: {
      profile: SJProfile;
      additionalData?: {
        company?: string;
        company_id?: string;
        job_title?: string;
        tags?: string[];
        notes?: string;
      };
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");
      if (profile.contact_id) throw new Error("Profile already linked to contact");

      // Create the CRM contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: profile.full_name,
          email: profile.email || null,
          phone: profile.phone || null,
          company: additionalData?.company || null,
          company_id: additionalData?.company_id || null,
          job_title: additionalData?.job_title || null,
          tags: additionalData?.tags || ["student-journey"],
          notes: additionalData?.notes || `Convertido do módulo Student Journey em ${new Date().toLocaleDateString("pt-PT")}`,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Update the profile with the contact_id
      const { error: profileError } = await supabase
        .from("sj_profiles")
        .update({ contact_id: contact.id })
        .eq("id", profile.id);

      if (profileError) {
        // Rollback: delete the contact if profile update fails
        await supabase.from("contacts").delete().eq("id", contact.id);
        throw profileError;
      }

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-profile"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto criado e ligado ao perfil");
    },
    onError: (error) => {
      console.error("Error converting to contact:", error);
      toast.error("Erro ao converter para contacto");
    },
  });

  /**
   * Link a Student Journey profile to an existing CRM Contact
   */
  const linkToContact = useMutation({
    mutationFn: async ({
      profileId,
      contactId,
    }: {
      profileId: string;
      contactId: string;
    }) => {
      const { error } = await supabase
        .from("sj_profiles")
        .update({ contact_id: contactId })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-profile"] });
      toast.success("Perfil ligado ao contacto");
    },
    onError: (error) => {
      console.error("Error linking to contact:", error);
      toast.error("Erro ao ligar ao contacto");
    },
  });

  /**
   * Unlink a profile from its CRM contact (doesn't delete the contact)
   */
  const unlinkFromContact = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from("sj_profiles")
        .update({ contact_id: null })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-profile"] });
      toast.success("Ligação ao contacto removida");
    },
    onError: (error) => {
      console.error("Error unlinking from contact:", error);
      toast.error("Erro ao remover ligação");
    },
  });

  /**
   * Create an opportunity in CRM from an enrollment
   * Optionally links the opportunity to the enrollment
   */
  const createOpportunityFromEnrollment = useMutation({
    mutationFn: async ({
      enrollmentId,
      courseId,
      courseName,
      contactId,
      companyId,
      value,
      billingType,
    }: {
      enrollmentId: string;
      courseId: string;
      courseName: string;
      contactId?: string;
      companyId?: string;
      value?: number;
      billingType?: string;
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // First, get the default stage_id for this workspace
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true })
        .limit(1);

      const stageId = (stages as { id: string }[] | null)?.[0]?.id;
      if (!stageId) throw new Error("No pipeline stages configured");

      // Create opportunity in CRM
      const { data: opportunity, error: oppError } = await supabase
        .from("opportunities")
        .insert({
          workspace_id: currentWorkspace.id,
          owner_id: user.id,
          stage_id: stageId,
          title: `Inscrição: ${courseName}`,
          contact_id: contactId || null,
          company_id: companyId || null,
          value: value || 0,
          source: "student_journey",
          billing_type: (billingType || "one_time") as "one_time" | "recurring",
          notes: `Criado a partir do módulo Student Journey - Curso: ${courseName}`,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Update enrollment with opportunity_id (if the column exists)
      // This is optional - we don't fail if it doesn't work
      try {
        await supabase
          .from("sj_enrollments")
          .update({ opportunity_id: opportunity.id } as Record<string, unknown>)
          .eq("id", enrollmentId);
      } catch (e) {
        console.warn("Could not link opportunity to enrollment:", e);
      }

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating opportunity:", error);
      toast.error("Erro ao criar oportunidade");
    },
  });

  return {
    convertToContact,
    linkToContact,
    unlinkFromContact,
    createOpportunityFromEnrollment,
  };
}
