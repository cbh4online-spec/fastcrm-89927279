import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type { Json } from "@/integrations/supabase/types";

export interface LandingPage {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_color: string | null;
  hero_image_url: string | null;
  features: Json;
  testimonials: Json;
  form_enabled: boolean | null;
  form_title: string | null;
  form_fields: Json;
  custom_css: string | null;
  is_published: boolean | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLandingPageInput {
  title: string;
  slug: string;
  headline?: string;
  subheadline?: string;
}

export interface UpdateLandingPageInput {
  title?: string;
  slug?: string;
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_color?: string;
  hero_image_url?: string;
  features?: Json;
  testimonials?: Json;
  form_enabled?: boolean;
  form_title?: string;
  form_fields?: Json;
  custom_css?: string;
  is_published?: boolean;
}

export function useLandingPages() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["landing-pages", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LandingPage[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useLandingPage(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["landing-page", id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (error) throw error;
      return data as LandingPage;
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateLandingPageInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !currentWorkspace?.id) {
        throw new Error("User not authenticated or workspace not selected");
      }

      const { data, error } = await supabase
        .from("landing_pages")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LandingPage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      console.log(`[LANDING] CREATED id=${data.id} slug=${data.slug}`);
      toast.success("Landing page created");

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LANDING.CREATED',
          entity_kind: 'landing_page',
          entity_id: data.id,
          source_module: 'mkt-landing-pages',
          payload: { landing_id: data.id, title: data.title, slug: data.slug },
        });
      }
    },
    onError: (error) => {
      console.warn(`[LANDING] CREATE_FAILED error=${error.message}`);
      toast.error("Failed to create landing page: " + error.message);
    },
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLandingPageInput & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      
      if (input.is_published === true) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("landing_pages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { page: data as LandingPage, changed_fields: Object.keys(input) };
    },
    onSuccess: ({ page, changed_fields }) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["landing-page", page.id] });
      console.log(`[LANDING] UPDATED id=${page.id} fields=${changed_fields.join(',')}`);
      toast.success("Landing page updated");

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LANDING.UPDATED',
          entity_kind: 'landing_page',
          entity_id: page.id,
          source_module: 'mkt-landing-pages',
          payload: { landing_id: page.id, changed_fields },
        });
      }
    },
    onError: (error) => {
      console.warn(`[LANDING] UPDATE_FAILED error=${error.message}`);
      toast.error("Failed to update landing page: " + error.message);
    },
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      console.log(`[LANDING] DELETED id=${id}`);
      toast.success("Landing page deleted");

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LANDING.DELETED',
          entity_kind: 'landing_page',
          entity_id: id,
          source_module: 'mkt-landing-pages',
          payload: { landing_id: id },
        });
      }
    },
    onError: (error) => {
      console.warn(`[LANDING] DELETE_FAILED error=${error.message}`);
      toast.error("Failed to delete landing page: " + error.message);
    },
  });
}

export function usePublishLandingPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { data, error } = await supabase
        .from("landing_pages")
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LandingPage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["landing-page", data.id] });
      const action = data.is_published ? 'PUBLISHED' : 'UNPUBLISHED';
      console.log(`[LANDING] ${action} id=${data.id} slug=${data.slug}`);
      toast.success(data.is_published ? "Landing page published" : "Landing page unpublished");

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: `LANDING.${action}`,
          entity_kind: 'landing_page',
          entity_id: data.id,
          source_module: 'mkt-landing-pages',
          payload: { landing_id: data.id, slug: data.slug },
        });
      }
    },
    onError: (error) => {
      console.warn(`[LANDING] PUBLISH_FAILED error=${error.message}`);
      toast.error("Failed to update publish status: " + error.message);
    },
  });
}
