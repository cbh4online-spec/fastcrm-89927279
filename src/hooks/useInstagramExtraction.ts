import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type ExtractionSource =
  | "followers"
  | "following"
  | "hashtag"
  | "location"
  | "list"
  | "web_search";
export type ExtractionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface ExtractionJob {
  id: string;
  workspace_id: string;
  created_by: string | null;
  source: ExtractionSource;
  target: string;
  limit_count: number;
  status: ExtractionStatus;
  queued_count: number;
  processed_count: number;
  found_count: number;
  listing_done: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface ExtractedProfile {
  id: string;
  instagram_username: string | null;
  profile_url: string;
  profile_name: string | null;
  profile_bio: string | null;
  profile_image_url: string | null;
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_external_url: string | null;
  is_private: boolean | null;
  inferred_location: string | null;
  extracted_email: string | null;
  extracted_phone: string | null;
  contact_source: string | null;
  converted_lead_id: string | null;
  status: string;
  created_at: string;
}

const ACTIVE: ExtractionStatus[] = ["pending", "running"];

export function useInstagramExtractionJobs() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const jobsQuery = useQuery({
    queryKey: ["instagram-extraction-jobs", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const jobs = (query.state.data ?? []) as ExtractionJob[];
      return jobs.some((j) => ACTIVE.includes(j.status)) ? 4000 : false;
    },
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("instagram_extraction_jobs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as ExtractionJob[];
    },
  });

  const startJob = useMutation({
    mutationFn: async (input: {
      source: ExtractionSource;
      target: string;
      limit: number;
      usernames?: string[];
    }) => {
      if (!workspaceId) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase.functions.invoke("instagram-extract-start", {
        body: { workspaceId, ...input },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Não foi possível iniciar a recolha");
      return data.jobId as string;
    },
    onSuccess: () => {
      toast.success("Recolha iniciada", { description: "Os perfis vão aparecendo à medida que são recolhidos." });
      queryClient.invalidateQueries({ queryKey: ["instagram-extraction-jobs", workspaceId] });
    },
    onError: (error: Error) => toast.error("Falha ao iniciar", { description: error.message }),
  });

  const controlJob = useMutation({
    mutationFn: async (input: { jobId: string; action: "pause" | "resume" | "cancel" }) => {
      const { data, error } = await supabase.functions.invoke("instagram-extract-control", {
        body: input,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Não foi possível alterar o trabalho");
      return data.status as ExtractionStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-extraction-jobs", workspaceId] });
    },
    onError: (error: Error) => toast.error("Falha na operação", { description: error.message }),
  });

  return {
    jobs: jobsQuery.data ?? [],
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    activeJob: (jobsQuery.data ?? []).find((j) => ACTIVE.includes(j.status)) ?? null,
    startJob,
    controlJob,
  };
}

export function useInstagramExtractionResults(jobId: string | null, autoRefresh: boolean) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["instagram-extraction-results", workspaceId, jobId],
    enabled: !!workspaceId,
    refetchInterval: autoRefresh ? 4000 : false,
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("professional_prospecting_profiles")
        .select(
          "id, instagram_username, profile_url, profile_name, profile_bio, profile_image_url, instagram_followers_count, instagram_following_count, instagram_posts_count, instagram_category, instagram_is_verified, instagram_is_business, instagram_external_url, is_private, inferred_location, extracted_email, extracted_phone, contact_source, converted_lead_id, status, created_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("platform", "instagram")
        .not("instagram_username", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (jobId) query = query.eq("extraction_job_id", jobId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ExtractedProfile[];
    },
  });
}

/** Importa perfis selecionados como Leads, sem duplicar. */
export function useInstagramExtractionImport() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (profiles: ExtractedProfile[]) => {
      if (!workspaceId) throw new Error("Workspace não selecionado");
      const usable = profiles.filter((p) => !p.converted_lead_id && p.instagram_username);
      if (usable.length === 0) throw new Error("Nada para importar");

      const handles = usable.map((p) => `@${p.instagram_username}`);
      const { data: existing } = await supabase
        .from("leads")
        .select("id, instagram_url")
        .eq("workspace_id", workspaceId)
        .in("instagram_url", handles);

      const taken = new Set((existing ?? []).map((l) => (l.instagram_url ?? "").toLowerCase()));
      const created: { profileId: string; leadId: string }[] = [];
      let skipped = 0;

      for (const p of usable) {
        const handle = `@${p.instagram_username}`;
        if (taken.has(handle.toLowerCase())) {
          skipped += 1;
          continue;
        }
        const { data: lead, error } = await supabase
          .from("leads")
          .insert({
            workspace_id: workspaceId,
            name: p.profile_name || `@${p.instagram_username}`,
            email: p.extracted_email,
            phone: p.extracted_phone,
            instagram_url: handle,
            website: p.instagram_external_url,
            source: "instagram_extractor",
            instagram_bio: p.profile_bio,
            instagram_followers_count: p.instagram_followers_count,
            instagram_following_count: p.instagram_following_count,
            instagram_posts_count: p.instagram_posts_count,
            instagram_category: p.instagram_category,
            instagram_is_verified: p.instagram_is_verified,
            instagram_is_business: p.instagram_is_business,
            instagram_external_url: p.instagram_external_url,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        created.push({ profileId: p.id, leadId: lead.id });
        taken.add(handle.toLowerCase());
      }

      for (const c of created) {
        await supabase
          .from("professional_prospecting_profiles")
          .update({
            converted_lead_id: c.leadId,
            converted_at: new Date().toISOString(),
            status: "converted",
          })
          .eq("id", c.profileId)
          .eq("workspace_id", workspaceId);
      }

      return { created: created.length, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      toast.success(`${created} lead(s) criada(s)`, {
        description: skipped > 0 ? `${skipped} já existiam e foram ignorados.` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["instagram-extraction-results"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => toast.error("Falha na importação", { description: error.message }),
  });
}
