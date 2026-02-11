import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackLeadCreated } from "@/modules/growth-seo/lib/gtmEvents";

export type LeadStatus = "new" | "in_progress" | "completed";
export type LeadSource = "instagram" | "whatsapp" | "email" | "form" | string;

export interface Lead {
  id: string;
  workspace_id: string;
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
}

export interface CreateLeadInput {
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
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
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
        .select("*")
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
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          source: input.source || null,
          status: input.status || "new",
          linkedin_url: input.linkedin_url || null,
          facebook_url: input.facebook_url || null,
          instagram_url: input.instagram_url || null,
          twitter_url: input.twitter_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      
      // Track lead creation in GTM
      trackLeadCreated({
        lead_id: data.id,
        lead_name: data.name,
        lead_email: data.email || undefined,
        lead_source: data.source || undefined,
        workspace_id: data.workspace_id,
      });
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

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
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
    },
  });
}
