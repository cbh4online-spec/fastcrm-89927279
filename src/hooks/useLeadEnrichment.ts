import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import type { Lead } from "@/hooks/useLeads";
import type { LeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";

export type EnrichmentStatus = "enriched" | "partial" | "pending";

const ENRICHMENT_FIELDS: (keyof Lead)[] = [
  "company_name" as keyof Lead,
  "linkedin_url",
  "city",
  "inferred_profession",
  "instagram_bio",
];

export function getEnrichmentStatus(lead: Lead): EnrichmentStatus {
  const filledFields = ENRICHMENT_FIELDS.filter(
    (f) => lead[f] != null && lead[f] !== ""
  ).length;

  const hasCompany = !!lead.company_name;

  if (hasCompany && filledFields >= 3) return "enriched";
  if (filledFields >= 1) return "partial";
  return "pending";
}

export function getEnrichmentStats(leads: Lead[]) {
  let enriched = 0;
  let partial = 0;
  let pending = 0;

  for (const lead of leads) {
    const status = getEnrichmentStatus(lead);
    if (status === "enriched") enriched++;
    else if (status === "partial") partial++;
    else pending++;
  }

  const total = leads.length;
  const successRate = total > 0 ? Math.round(((enriched + partial) / total) * 100) : 0;

  return { total, enriched, partial, pending, successRate };
}

export function useEnrichLead(enricherSettings?: LeadEnricherSettings) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Lead) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("contact-enrich", {
        body: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          workspaceId: currentWorkspace.id,
          settings: enricherSettings ? {
            google_enabled: enricherSettings.google_enabled,
            linkedin_enabled: enricherSettings.linkedin_enabled,
            webscraping_enabled: enricherSettings.webscraping_enabled,
          } : undefined,
        },
      });

      if (error) throw new Error(error.message || "Erro ao enriquecer");
      if (!data?.success) throw new Error(data?.error || "Erro ao enriquecer");

      const enrichment = data.data;
      if (!enrichment) return lead;

      // Map enrichment result to lead fields
      const updates: Record<string, any> = {};
      if (enrichment.company?.value) updates.company_name = enrichment.company.value;
      if (enrichment.companyWebsite) updates.website = enrichment.companyWebsite;
      if (enrichment.jobTitle?.value) updates.inferred_profession = enrichment.jobTitle.value;
      if (enrichment.country?.value) updates.city = enrichment.country.value;
      if (enrichment.company?.confidence === "high") updates.confidence_score = 90;
      else if (enrichment.company?.confidence === "medium") updates.confidence_score = 70;
      else if (enrichment.company?.confidence === "low") updates.confidence_score = 40;

      // Email validation if enabled
      if (enricherSettings?.email_validation_enabled && lead.email) {
        try {
          const { data: validationResult } = await supabase.functions.invoke("validate-email", {
            body: { email: lead.email },
          });
          if (validationResult?.success && validationResult.data) {
            updates.email_verified = validationResult.data.status === "valid";
          }
        } catch (e) {
          console.error("Email validation failed:", e);
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await workspaceClient
          .from("leads")
          .update(updates)
          .eq("id", lead.id);

        if (updateError) throw updateError;
      }

      return { ...lead, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível enriquecer o lead");
    },
  });
}

export function useEnrichLeadsBatch(enricherSettings?: LeadEnricherSettings) {
  const { currentWorkspace } = useWorkspace();
  const enrichLead = useEnrichLead(enricherSettings);

  return {
    enrichBatch: async (
      leads: Lead[],
      onProgress: (done: number, total: number, currentName: string) => void
    ) => {
      const total = leads.length;
      let successCount = 0;

      for (let i = 0; i < total; i++) {
        const lead = leads[i];
        onProgress(i, total, lead.name);
        try {
          await enrichLead.mutateAsync(lead);
          successCount++;
        } catch (e) {
          console.error(`Failed to enrich ${lead.name}:`, e);
        }
      }

      onProgress(total, total, "");
      toast.success(`${successCount}/${total} leads enriquecidos com sucesso`);
      return successCount;
    },
  };
}
