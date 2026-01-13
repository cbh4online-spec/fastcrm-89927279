import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Landing page created");
    },
    onError: (error) => {
      toast.error("Failed to create landing page: " + error.message);
    },
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();

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
      return data as LandingPage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["landing-page", data.id] });
      toast.success("Landing page updated");
    },
    onError: (error) => {
      toast.error("Failed to update landing page: " + error.message);
    },
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Landing page deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete landing page: " + error.message);
    },
  });
}

export function usePublishLandingPage() {
  const queryClient = useQueryClient();

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
      toast.success(data.is_published ? "Landing page published" : "Landing page unpublished");
    },
    onError: (error) => {
      toast.error("Failed to update publish status: " + error.message);
    },
  });
}
