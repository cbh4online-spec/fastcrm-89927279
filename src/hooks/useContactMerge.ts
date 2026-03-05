import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
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

      console.log(`[CONTACTS] Merge started: primary=${primaryContactId}, duplicates=${duplicateContactIds.length}`);

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

      const fieldsEnriched: string[] = [];
      fieldsToMerge.forEach(field => {
        if (!primaryContact[field]) {
          for (const dup of duplicates || []) {
            if (dup[field]) {
              updateData[field] = dup[field];
              fieldsEnriched.push(field);
              break;
            }
          }
        }
      });

      if (fieldsEnriched.length > 0) {
        console.log(`[CONTACTS] Merge field enrichment: ${fieldsEnriched.join(', ')}`);
      }

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
      console.log(`[CONTACTS] Merge references migrated for ${duplicateContactIds.length} duplicate(s)`);

      // Delete duplicate contacts
      const { error: deleteError } = await supabase
        .from("contacts")
        .delete()
        .in("id", duplicateContactIds);

      if (deleteError) throw deleteError;

      return {
        primaryContact: primaryContact as Contact,
        mergedCount: duplicateContactIds.length,
        fieldsEnriched,
        tagsMergedCount: allTags.size - (primaryContact.tags || []).length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["smart-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-duplicate-groups"] });
      console.log(`[CONTACTS] Merge complete: ${result.mergedCount} contact(s) merged into ${result.primaryContact.id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.MERGED',
          entity_kind: 'contact',
          entity_id: result.primaryContact.id,
          source_module: 'crm-contacts',
          payload: {
            primary_id: result.primaryContact.id,
            merged_count: result.mergedCount,
            fields_enriched: result.fieldsEnriched,
            tags_merged_count: result.tagsMergedCount,
            references_migrated: true,
          },
        });
      }
      toast.success(`${result.mergedCount} contacto(s) fundido(s) com ${result.primaryContact.name}`);
    },
    onError: (error, variables) => {
      console.warn('[CONTACTS] MERGE_FAILED', { primaryContactId: variables.primaryContactId, duplicateCount: variables.duplicateContactIds.length, error: error.message });
      toast.error("Erro ao fundir contactos");
    },
  });
}
