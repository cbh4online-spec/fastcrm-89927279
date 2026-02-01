import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { Contact } from "./useContacts";

export interface MergeContactsInput {
  primaryContactId: string;
  duplicateContactIds: string[];
}

export function useContactMerge() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryContactId, duplicateContactIds }: MergeContactsInput) => {
      if (!currentWorkspace) throw new Error("No workspace");
      if (duplicateContactIds.length === 0) throw new Error("No duplicates to merge");

      // Get primary contact data
      const { data: primaryContact, error: primaryError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", primaryContactId)
        .single();

      if (primaryError) throw primaryError;

      // Get duplicate contacts data
      const { data: duplicates, error: dupError } = await supabase
        .from("contacts")
        .select("*")
        .in("id", duplicateContactIds);

      if (dupError) throw dupError;

      // Merge tags from all contacts
      const allTags = new Set<string>(primaryContact.tags || []);
      duplicates?.forEach(dup => {
        (dup.tags || []).forEach((tag: string) => allTags.add(tag));
      });

      // Merge notes (concatenate)
      let mergedNotes = primaryContact.notes || "";
      duplicates?.forEach(dup => {
        if (dup.notes && dup.notes.trim()) {
          mergedNotes += `\n\n--- Notas de ${dup.name} (${new Date(dup.created_at).toLocaleDateString()}) ---\n${dup.notes}`;
        }
      });

      // Update primary contact with merged data
      const updateData: Record<string, unknown> = {
        tags: Array.from(allTags),
        notes: mergedNotes.trim() || null,
      };

      // Fill empty fields from duplicates (prefer more complete data)
      const fieldsToMerge = [
        "email", "phone", "company", "job_title", "tax_id", "client_number",
        "linkedin_url", "facebook_url", "instagram_url", "twitter_url"
      ] as const;

      fieldsToMerge.forEach(field => {
        if (!primaryContact[field]) {
          for (const dup of duplicates || []) {
            if (dup[field]) {
              updateData[field] = dup[field];
              break;
            }
          }
        }
      });

      await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", primaryContactId);

      // Migrate all references from duplicates to primary
      const migrationPromises = duplicateContactIds.flatMap(dupId => [
        supabase.from("opportunities").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("proposals").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("invoices").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("meetings").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("calendar_events").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("conversations").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("contact_documents").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("contact_linkedin_data").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("subscriptions").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
        supabase.from("sj_profiles").update({ contact_id: primaryContactId }).eq("contact_id", dupId),
      ]);

      await Promise.all(migrationPromises);

      // Delete duplicate contacts
      const { error: deleteError } = await supabase
        .from("contacts")
        .delete()
        .in("id", duplicateContactIds);

      if (deleteError) throw deleteError;

      return {
        primaryContact: primaryContact as Contact,
        mergedCount: duplicateContactIds.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["smart-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-duplicate-groups"] });
      toast.success(`${result.mergedCount} contacto(s) fundido(s) com ${result.primaryContact.name}`);
    },
    onError: (error) => {
      console.error("Error merging contacts:", error);
      toast.error("Erro ao fundir contactos");
    },
  });
}
