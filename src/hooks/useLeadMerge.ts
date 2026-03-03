import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { Lead } from "./useLeads";

export interface MergeLeadsInput {
  primaryLeadId: string;
  duplicateLeadIds: string[];
}

export function useLeadMerge() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryLeadId, duplicateLeadIds }: MergeLeadsInput) => {
      if (!currentWorkspace) throw new Error("No workspace");
      if (duplicateLeadIds.length === 0) throw new Error("No duplicates to merge");

      const { data: primary, error: pErr } = await supabase.from("leads").select("*").eq("id", primaryLeadId).single();
      if (pErr) throw pErr;

      const { data: duplicates, error: dErr } = await supabase.from("leads").select("*").in("id", duplicateLeadIds);
      if (dErr) throw dErr;

      // Merge tags
      const allTags = new Set<string>(primary.tags || []);
      duplicates?.forEach(d => (d.tags || []).forEach((t: string) => allTags.add(t)));

      // Merge notes
      let mergedNotes = primary.notes || "";
      duplicates?.forEach(d => {
        if (d.notes?.trim()) {
          mergedNotes += `\n\n--- Notas de ${d.name} (${new Date(d.created_at).toLocaleDateString()}) ---\n${d.notes}`;
        }
      });

      const updateData: Record<string, unknown> = {
        tags: Array.from(allTags),
        notes: mergedNotes.trim() || null,
      };

      // Fill empty fields
      const fields = ["email", "phone", "source", "company_name", "website", "linkedin_url", "facebook_url", "instagram_url", "twitter_url", "city", "business_category"] as const;
      fields.forEach(field => {
        if (!primary[field]) {
          for (const d of duplicates || []) {
            if (d[field]) { updateData[field] = d[field]; break; }
          }
        }
      });

      await supabase.from("leads").update(updateData).eq("id", primaryLeadId);

      // Migrate references
      for (const dupId of duplicateLeadIds) {
        await supabase.from("opportunities").update({ lead_id: primaryLeadId } as any).eq("lead_id", dupId);
        await (supabase.from("proposals") as any).update({ lead_id: primaryLeadId }).eq("lead_id", dupId);
        await supabase.from("conversations").update({ lead_id: primaryLeadId } as any).eq("lead_id", dupId);
      }

      // Delete duplicates
      const { error: delErr } = await supabase.from("leads").delete().in("id", duplicateLeadIds);
      if (delErr) throw delErr;

      return { primaryLead: primary as Lead, mergedCount: duplicateLeadIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-duplicate-groups"] });
      toast.success(`${result.mergedCount} lead(s) fundido(s) com ${result.primaryLead.name}`);
    },
    onError: (error) => {
      console.error("Error merging leads:", error);
      toast.error("Erro ao fundir leads");
    },
  });
}
