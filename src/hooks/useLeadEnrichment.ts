import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
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

      // Emit ENRICH_REQUESTED before API call
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'LEAD.ENRICH_REQUESTED',
        entity_kind: 'lead',
        entity_id: lead.id,
        source_module: 'crm-lead-enricher',
        payload: {
          has_email: !!lead.email,
          has_phone: !!lead.phone,
          settings_sources: enricherSettings ? {
            google: enricherSettings.google_enabled,
            linkedin: enricherSettings.linkedin_enabled,
            webscraping: enricherSettings.webscraping_enabled,
          } : undefined,
        },
      });

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
            google_places_enabled: enricherSettings.google_places_enabled,
            nif_lookup_enabled: enricherSettings.nif_lookup_enabled,
            instagram_enrich_enabled: enricherSettings.instagram_enrich_enabled,
            icp_score_enabled: enricherSettings.icp_score_enabled,
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
      if (enrichment.country?.value && !enrichment.city?.value) updates.city = enrichment.country.value;
      if (enrichment.company?.confidence === "high") updates.confidence_score = 90;
      else if (enrichment.company?.confidence === "medium") updates.confidence_score = 70;
      else if (enrichment.company?.confidence === "low") updates.confidence_score = 40;

      // Expanded fields
      if (enrichment.industry?.value) updates.industry = enrichment.industry.value;
      if (enrichment.numberOfEmployees?.value) updates.number_of_employees = enrichment.numberOfEmployees.value;
      if (enrichment.annualRevenue?.value) updates.annual_revenue = enrichment.annualRevenue.value;
      if (enrichment.about?.value) updates.about = enrichment.about.value;
      if (enrichment.linkedinUrl?.value) updates.linkedin_url = enrichment.linkedinUrl.value;
      if (enrichment.facebookUrl?.value) updates.facebook_url = enrichment.facebookUrl.value;
      if (enrichment.instagramUrl?.value) updates.instagram_url = enrichment.instagramUrl.value;
      if (enrichment.twitterUrl?.value) updates.twitter_url = enrichment.twitterUrl.value;
      if (enrichment.address?.value) updates.address = enrichment.address.value;
      if (enrichment.city?.value) updates.city = enrichment.city.value;
      if (enrichment.postalCode?.value) updates.postal_code = enrichment.postalCode.value;
      if (enrichment.region?.value) updates.region = enrichment.region.value;
      // Fiscal
      if (enrichment.taxId?.value) updates.tax_id = enrichment.taxId.value;
      if (enrichment.caeCodes?.value) updates.cae_codes = enrichment.caeCodes.value;
      if (enrichment.caeDescription?.value) updates.cae_description = enrichment.caeDescription.value;
      if (enrichment.legalNature?.value) updates.legal_nature = enrichment.legalNature.value;
      if (enrichment.capitalSocial?.value) updates.capital_social = enrichment.capitalSocial.value;
      if (enrichment.foundingDate?.value) updates.founding_date = enrichment.foundingDate.value;
      // Instagram
      if (enrichment.instagramFollowers?.value != null) updates.instagram_followers_count = enrichment.instagramFollowers.value;
      if (enrichment.instagramBio?.value) updates.instagram_bio = enrichment.instagramBio.value;
      // ICP
      if (enrichment.icpFitScore?.value != null) updates.icp_fit_score = enrichment.icpFitScore.value;

      // Email validation if enabled
      let emailValidated = false;
      if (enricherSettings?.email_validation_enabled && lead.email) {
        try {
          const { data: validationResult } = await supabase.functions.invoke("validate-email", {
            body: { email: lead.email },
          });
          if (validationResult?.success && validationResult.data) {
            updates.email_verified = validationResult.data.status === "valid";
            emailValidated = true;
          }
        } catch (e) {
          console.warn('[ENRICHER] EMAIL_VALIDATION_FAILED', { leadId: lead.id, error: (e as Error).message });
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await workspaceClient
          .from("leads")
          .update(updates)
          .eq("id", lead.id);

        if (updateError) throw updateError;
      }

      // --- Propagate to Companies ---
      let companyId: string | null = null;
      if (updates.company_name) {
        const { data: existingCompany } = await workspaceClient
          .from("companies")
          .select("id, website, city")
          .eq("name", updates.company_name)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
          // Update missing fields on existing company
          const companyUpdates: Record<string, any> = {};
          if (!existingCompany.website && updates.website) companyUpdates.website = updates.website;
          if (!existingCompany.city && updates.city) companyUpdates.city = updates.city;
          if (Object.keys(companyUpdates).length > 0) {
            await workspaceClient
              .from("companies")
              .update(companyUpdates)
              .eq("id", existingCompany.id);
          }
        } else {
          // Create new company
          const userId = (await supabase.auth.getUser()).data.user?.id || "";
          const { data: newCompany } = await workspaceClient
            .from("companies")
            .insert({
              name: updates.company_name,
              website: updates.website || null,
              city: updates.city || null,
              source: "lead-enricher",
              created_by: userId,
              workspace_id: currentWorkspace.id,
            })
            .select("id")
            .single();
          if (newCompany) companyId = newCompany.id;
        }
      }

      // --- Propagate to Contacts ---
      if (lead.email || lead.phone) {
        let contactQuery = workspaceClient.from("contacts").select("id, company, company_id, job_title, city");
        if (lead.email) {
          contactQuery = contactQuery.eq("email", lead.email);
        } else if (lead.phone) {
          contactQuery = contactQuery.eq("phone", lead.phone);
        }
        const { data: matchingContacts } = await contactQuery;

        if (matchingContacts && matchingContacts.length > 0) {
          for (const contact of matchingContacts) {
            const contactUpdates: Record<string, any> = {};
            if (!contact.company && updates.company_name) contactUpdates.company = updates.company_name;
            if (!contact.company_id && companyId) contactUpdates.company_id = companyId;
            if (!contact.job_title && updates.inferred_profession) contactUpdates.job_title = updates.inferred_profession;
            if (!contact.city && updates.city) contactUpdates.city = updates.city;
            if (Object.keys(contactUpdates).length > 0) {
              await workspaceClient
                .from("contacts")
                .update(contactUpdates)
                .eq("id", contact.id);
            }
          }
        }
      }

      // Emit ENRICH_COMPLETED
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'LEAD.ENRICH_COMPLETED',
        entity_kind: 'lead',
        entity_id: lead.id,
        source_module: 'crm-lead-enricher',
        payload: {
          fields_updated: Object.keys(updates),
          confidence_score: updates.confidence_score,
          email_validated: emailValidated,
          company_synced: !!companyId,
          contacts_updated: !!(lead.email || lead.phone),
        },
      });

      console.log(`[ENRICHER] Lead enriched: ${lead.id}, fields: ${Object.keys(updates).join(', ')}, company_synced: ${!!companyId}`);

      return { ...lead, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error, lead) => {
      console.warn('[ENRICHER] ENRICH_FAILED', { leadId: lead.id, error: error.message });
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

      console.log(`[ENRICHER] Batch started: ${total} leads`);

      for (let i = 0; i < total; i++) {
        const lead = leads[i];
        onProgress(i, total, lead.name);
        try {
          await enrichLead.mutateAsync(lead);
          successCount++;
        } catch (e) {
          console.warn(`[ENRICHER] Batch item failed: ${lead.name}`, (e as Error).message);
        }
      }

      console.log(`[ENRICHER] Batch completed: ${successCount}/${total}`);
      onProgress(total, total, "");
      toast.success(`${successCount}/${total} leads enriquecidos com sucesso`);
      return successCount;
    },
  };
}
