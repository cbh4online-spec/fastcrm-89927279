import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackLeadCreated } from "@/modules/growth-seo/lib/gtmEvents";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { supabase } from "@/integrations/supabase/client";
import { generateRequestId } from "@/lib/requestId";
import { LEADS_SELECT_COLUMNS } from "@/hooks/constants/selectColumns";

export type LeadType = "person" | "company";
export type LeadStatus = "new" | "in_progress" | "completed";
export type LeadSource = "instagram" | "whatsapp" | "email" | "form" | string;

export interface Lead {
  id: string;
  workspace_id: string;
  lead_type: LeadType;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource | null;
  status: LeadStatus;
  tags: string[];
  external_instagram_id: string | null;
  external_whatsapp_id: string | null;
  external_email: string | null;
  external_username: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  pinterest_url: string | null;
  whatsapp_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Avatar
  avatar_url: string | null;
  
  // Instagram Enrichment
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;
  instagram_bio: string | null;
  instagram_external_url: string | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_enriched_at: string | null;
  
  // AI Analysis
  inferred_type: string | null;
  inferred_profession: string | null;
  inferred_specialty: string | null;
  inferred_workplace: string | null;
  confidence_score: number | null;
  lead_score: number | null;
  lead_score_explanation: string | null;
  lead_score_factors: Record<string, unknown> | null;
  
  // Prospecting reference
  prospecting_profile_id: string | null;
  notes: string | null;
  
  // Location
  city: string | null;
  business_category: string | null;
  
  // Enrichment
  company_name: string | null;
  website: string | null;
  industry: string | null;
  number_of_employees: string | null;
  annual_revenue: number | null;
  contact_person: string | null;
  contact_person_role: string | null;

  // NIF enrichment fields
  tax_id: string | null;
  address: string | null;
  postal_code: string | null;
  cae_codes: string[] | null;
  cae_description: string | null;
  legal_nature: string | null;
  capital_social: string | null;
  founding_date: string | null;
  region: string | null;
  county: string | null;
  parish: string | null;
  fax: string | null;
  about: string | null;
  activity_description: string | null;
  racius_url: string | null;

  // Scores
  icp_fit_score: number | null;
  engagement_score: number | null;
  pare_score: number | null;
}

export interface CreateLeadInput {
  lead_type?: LeadType;
  name: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  tags?: string[];
  external_instagram_id?: string;
  external_whatsapp_id?: string;
  external_email?: string;
  external_username?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  pinterest_url?: string;
  whatsapp_url?: string;
  // Company fields
  company_name?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  number_of_employees?: string;
  annual_revenue?: number;
  contact_person?: string;
  contact_person_role?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  // NIF enrichment fields
  cae_codes?: string[];
  cae_description?: string;
  legal_nature?: string;
  capital_social?: string;
  founding_date?: string;
  region?: string;
  county?: string;
  parish?: string;
  fax?: string;
  about?: string;
  activity_description?: string;
  racius_url?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  id: string;
}

export function useLeads(filters?: { status?: LeadStatus; search?: string }) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["leads", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("leads")
        .select(LEADS_SELECT_COLUMNS)
        .eq("workspace_id", currentWorkspace.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useLead(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("leads")
        .select(LEADS_SELECT_COLUMNS)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data, error } = await workspaceClient
        .from("leads")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          lead_type: input.lead_type || "person",
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          source: input.source || null,
          status: input.status || "new",
          linkedin_url: input.linkedin_url || null,
          facebook_url: input.facebook_url || null,
          instagram_url: input.instagram_url || null,
          twitter_url: input.twitter_url || null,
          company_name: input.company_name || null,
          tax_id: input.tax_id || null,
          website: input.website || null,
          industry: input.industry || null,
          number_of_employees: input.number_of_employees || null,
          annual_revenue: input.annual_revenue || null,
          contact_person: input.contact_person || null,
          contact_person_role: input.contact_person_role || null,
          address: input.address || null,
          city: input.city || null,
          postal_code: input.postal_code || null,
          // NIF enrichment fields
          cae_codes: input.cae_codes || null,
          cae_description: input.cae_description || null,
          legal_nature: input.legal_nature || null,
          capital_social: input.capital_social || null,
          founding_date: input.founding_date || null,
          region: input.region || null,
          county: input.county || null,
          parish: input.parish || null,
          fax: input.fax || null,
          about: input.about || null,
          activity_description: input.activity_description || null,
          racius_url: input.racius_url || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505" && (error.message || "").includes("email")) {
          throw new Error("DUPLICATE_EMAIL");
        }
        throw error;
      }
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
      
      // Track lead creation in GTM
      trackLeadCreated({
        lead_id: data.id,
        lead_name: data.name,
        lead_email: data.email || undefined,
        lead_source: data.source || undefined,
        workspace_id: data.workspace_id,
      });

      // Kernel event: lead created
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LEAD.CREATED',
          entity_kind: 'lead',
          entity_id: data.id,
          actor_type: 'user',
          actor_id: user?.id,
          payload: { name: data.name, source: data.source, status: data.status },
          source_module: 'crm-leads',
          correlation_id: generateRequestId(),
        });
      }
      // Fire-and-forget: generate AI tag suggestions
      supabase.functions.invoke('ai-entity-tags', {
        body: { entity_type: 'lead', entity_id: data.id, workspace_id: currentWorkspace?.id },
      }).catch(() => {});
    },
    onError: (error) => {
      console.error("Error creating lead:", error);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe um lead com este email neste workspace.");
      }
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateLeadInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505" && (error.message || "").includes("email")) {
          throw new Error("DUPLICATE_EMAIL");
        }
        throw error;
      }
      return data as Lead;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });

      if (currentWorkspace?.id) {
        const changedFields = Object.keys(variables).filter(k => k !== 'id');
        const correlationId = generateRequestId();

        // Kernel event: lead updated / status changed
        const eventType = variables.status ? 'LEAD.STATUS_CHANGED' : 'LEAD.UPDATED';
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: eventType,
          entity_kind: 'lead',
          entity_id: data.id,
          actor_type: 'user',
          payload: { name: data.name, status: data.status, changed_fields: changedFields },
          source_module: 'crm-leads',
          correlation_id: correlationId,
        });

        // Kernel event: lead tagged (when tags changed)
        if (variables.tags !== undefined) {
          emitKernelEvent({
            workspace_id: currentWorkspace.id,
            type: 'LEAD.TAGGED',
            entity_kind: 'lead',
            entity_id: data.id,
            actor_type: 'user',
            payload: { tags: data.tags },
            source_module: 'crm-leads',
            correlation_id: correlationId,
          });
        }
      }
    },
    onError: (error) => {
      console.error("Error updating lead:", error);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe um lead com este email neste workspace.");
      }
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
    },
  });
}

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: Record<string, unknown> }) => {
      if (!ids.length) return;
      // For tags we merge instead of replace
      if (changes.tags && Array.isArray(changes.tags)) {
        const newTags = changes.tags as string[];
        // Fetch current tags for each lead
        const { data: currentLeads } = await workspaceClient
          .from("leads")
          .select("id, tags")
          .in("id", ids);
        if (currentLeads) {
          for (const lead of currentLeads) {
            const existing = (lead as any).tags || [];
            const merged = [...new Set([...existing, ...newTags])];
            await workspaceClient
              .from("leads")
              .update({ tags: merged })
              .eq("id", lead.id);
          }
        }
        const { tags, ...rest } = changes;
        if (Object.keys(rest).length > 0) {
          const { error } = await workspaceClient
            .from("leads")
            .update(rest)
            .in("id", ids);
          if (error) throw error;
        }
      } else {
        const { error } = await workspaceClient
          .from("leads")
          .update(changes)
          .in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
    },
  });
}

export function useDeleteLeads() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await workspaceClient
        .from("leads")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
    },
  });
}
