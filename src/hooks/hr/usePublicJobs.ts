import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolvePublicCareersSlug } from "@/lib/publicCareers";
import { toast } from "sonner";

export type PublicJobPosting = {
  id: string;
  title: string;
  description: string;
  employment_type: string | null;
  location: string | null;
  remote_option: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  slug: string | null;
  published_at: string | null;
  workspace_id: string;
};

export type WorkspaceBranding = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  company_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  website: string | null;
};

export function usePublicWorkspace(workspaceSlug: string | undefined) {
  const resolvedWorkspaceSlug = resolvePublicCareersSlug(workspaceSlug);

  return useQuery({
    queryKey: ["public-workspace", resolvedWorkspaceSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workspaces")
        .select("id, name, slug, logo_url, company_name, primary_color, secondary_color, website")
        .eq("slug", resolvedWorkspaceSlug!)
        .single();
      if (error) throw error;
      return data as WorkspaceBranding;
    },
    enabled: !!resolvedWorkspaceSlug,
  });
}

export function usePublicJobs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-jobs", workspaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_job_postings")
        .select("id, title, description, employment_type, location, remote_option, salary_min, salary_max, currency, requirements, nice_to_have, slug, published_at, workspace_id")
        .eq("workspace_id", workspaceId!)
        .eq("status", "active")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as PublicJobPosting[];
    },
    enabled: !!workspaceId,
  });
}

export type ExternalJobOffer = {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  source_url: string | null;
  source_platform: string | null;
  skills: string[];
  extracted_data: Record<string, any>;
  created_at: string;
};

export function usePublicExternalJobs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-external-jobs", workspaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_talent_results")
        .select("id, title, description, location, source_url, source_platform, skills, extracted_data, created_at")
        .eq("workspace_id", workspaceId!)
        .eq("search_type", "job_offer")
        .in("status", ["new", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ExternalJobOffer[];
    },
    enabled: !!workspaceId,
  });
}

export function usePublicJob(workspaceSlug: string | undefined, jobSlug: string | undefined) {
  const resolvedWorkspaceSlug = resolvePublicCareersSlug(workspaceSlug);

  return useQuery({
    queryKey: ["public-job", resolvedWorkspaceSlug, jobSlug],
    queryFn: async () => {
      const { data: ws, error: wsErr } = await (supabase as any)
        .from("workspaces")
        .select("id")
        .eq("slug", resolvedWorkspaceSlug!)
        .single();
      if (wsErr) throw wsErr;

      const { data, error } = await (supabase as any)
        .from("hr_job_postings")
        .select("id, title, description, employment_type, location, remote_option, salary_min, salary_max, currency, requirements, nice_to_have, slug, published_at, workspace_id")
        .eq("workspace_id", ws.id)
        .eq("slug", jobSlug!)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data as PublicJobPosting;
    },
    enabled: !!resolvedWorkspaceSlug && !!jobSlug,
  });
}

interface ApplicationData {
  job_posting_id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  cover_letter_url?: string;
  cv_url?: string;
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: async (data: ApplicationData) => {
      const { error } = await (supabase as any)
        .from("hr_candidates")
        .insert({
          ...data,
          source: "careers_page",
          stage: "new",
          status: "active",
          applied_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Candidatura submetida com sucesso!"),
    onError: () => toast.error("Erro ao submeter candidatura"),
  });
}
