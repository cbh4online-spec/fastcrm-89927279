import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type { Company } from "./useCompanies";

export interface MergeCompaniesInput {
  primaryCompanyId: string;
  duplicateCompanyIds: string[];
}

export function useCompanyMerge() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryCompanyId, duplicateCompanyIds }: MergeCompaniesInput) => {
      if (!currentWorkspace) throw new Error("No workspace");
      if (duplicateCompanyIds.length === 0) throw new Error("No duplicates");

      console.log(`[COMPANIES] Merge started: primary=${primaryCompanyId}, duplicates=${duplicateCompanyIds.length}`);

      const { data: primary, error: pErr } = await supabase.from("companies").select("*").eq("id", primaryCompanyId).single();
      if (pErr) throw pErr;

      const { data: duplicates, error: dErr } = await supabase.from("companies").select("*").in("id", duplicateCompanyIds);
      if (dErr) throw dErr;

      // Merge tags
      const allTags = new Set<string>(primary.tags || []);
      duplicates?.forEach(d => (d.tags || []).forEach((t: string) => allTags.add(t)));
      const tagsMergedCount = allTags.size - (primary.tags || []).length;

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
      const fields = ["tax_id", "website", "email", "phone", "industry", "size", "address", "linkedin_url", "facebook_url", "instagram_url", "twitter_url", "domain", "description"] as const;
      const fieldsEnriched: string[] = [];
      fields.forEach(field => {
        if (!primary[field]) {
          for (const d of duplicates || []) {
            if (d[field]) { updateData[field] = d[field]; fieldsEnriched.push(field); break; }
          }
        }
      });

      if (fieldsEnriched.length > 0) {
        console.log(`[COMPANIES] Merge field enrichment: ${fieldsEnriched.join(', ')}`);
      }

      await supabase.from("companies").update(updateData).eq("id", primaryCompanyId);

      // Migrate references
      const migrations = duplicateCompanyIds.flatMap(dupId => [
        supabase.from("contacts").update({ company_id: primaryCompanyId }).eq("company_id", dupId),
        supabase.from("opportunities").update({ company_id: primaryCompanyId }).eq("company_id", dupId),
        supabase.from("invoices").update({ company_id: primaryCompanyId }).eq("company_id", dupId),
        supabase.from("proposals").update({ company_id: primaryCompanyId }).eq("company_id", dupId),
      ]);
      await Promise.all(migrations);

      console.log('[COMPANIES] Merge references migrated');

      // Delete duplicates
      const { error: delErr } = await supabase.from("companies").delete().in("id", duplicateCompanyIds);
      if (delErr) throw delErr;

      return { primaryCompany: primary as Company, mergedCount: duplicateCompanyIds.length, fieldsEnriched, tagsMergedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["smart-companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-duplicate-groups"] });
      toast.success(`${result.mergedCount} empresa(s) fundida(s) com ${result.primaryCompany.name}`);
      console.log(`[COMPANIES] Merge completed: primary=${result.primaryCompany.id}, merged=${result.mergedCount}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'COMPANY.MERGED',
          entity_kind: 'company',
          entity_id: result.primaryCompany.id,
          source_module: 'crm-companies',
          payload: {
            primary_id: result.primaryCompany.id,
            merged_count: result.mergedCount,
            fields_enriched: result.fieldsEnriched,
            tags_merged_count: result.tagsMergedCount,
          },
        });
      }
    },
    onError: (error, variables) => {
      console.warn('[COMPANIES] MERGE_FAILED', { primaryCompanyId: variables.primaryCompanyId, duplicateCount: variables.duplicateCompanyIds.length, error: error.message });
      toast.error("Erro ao fundir empresas");
    },
  });
}
