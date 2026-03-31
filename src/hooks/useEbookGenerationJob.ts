import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCreateEbook } from "@/hooks/useEbooks";

export interface EbookGenerationJob {
  id: string;
  workspace_id: string;
  ebook_id: string | null;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "partial";
  current_step: string | null;
  steps_completed: string[];
  total_steps: number;
  progress: number;
  config: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  error_step: string | null;
  retry_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const STEP_LABELS: Record<string, string> = {
  generate_outline: "A gerar estrutura…",
  create_ebook: "A criar eBook…",
  generate_chapters: "A escrever capítulos…",
  generate_cover: "A gerar capa…",
  generate_images: "A gerar imagens…",
  finalize: "A finalizar…",
};

export function useEbookGenerationJob(jobId: string | null) {
  return useQuery({
    queryKey: ["ebook-generation-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await (supabase as any)
        .from("ebook_generation_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data as EbookGenerationJob | null;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data as EbookGenerationJob | null;
      if (!job) return false;
      if (job.status === "queued" || job.status === "running") return 2000;
      return false;
    },
  });
}

export function useStartEbookGeneration() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const createEbook = useCreateEbook();

  return useMutation({
    mutationFn: async (config: {
      prompt: string;
      chapterCount: number;
      tone: string;
      mode: string;
      audience?: string;
      objective?: string;
      depth?: string;
      specialElements?: string[];
      contentKeywords?: string[];
      theme?: string;
      imageStyle?: string;
      imageKeywords?: string[];
      generateImages?: boolean;
      templateId?: string;
      templateStyles?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      // Create the ebook first
      const ebook = await createEbook.mutateAsync({
        title: config.prompt.slice(0, 100),
        chapters: [],
        template_id: config.templateId,
        global_styles: config.templateStyles,
      });

      // Update status to generating
      await (supabase as any).from("ebooks").update({
        status: "generating",
        theme: config.theme,
        image_style: config.imageStyle,
        image_keywords: config.imageKeywords,
        updated_at: new Date().toISOString(),
      }).eq("id", ebook.id);

      // Insert generation job
      const { data: job, error } = await (supabase as any)
        .from("ebook_generation_jobs")
        .insert({
          workspace_id: currentWorkspace.id,
          ebook_id: ebook.id,
          config,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Invoke the edge function (fire & forget — it runs async)
      supabase.functions.invoke("ebook-generate", {
        body: { job_id: job.id },
      }).catch(console.error);

      return { jobId: job.id as string, ebookId: ebook.id as string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });
}

export function useRetryEbookGeneration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Reset job status for retry
      await (supabase as any).from("ebook_generation_jobs").update({
        status: "queued",
        error_message: null,
        retry_count: (supabase as any).rpc ? undefined : 0, // will be incremented by the function
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);

      // Re-invoke
      supabase.functions.invoke("ebook-generate", {
        body: { job_id: jobId },
      }).catch(console.error);

      return jobId;
    },
    onSuccess: (jobId) => {
      qc.invalidateQueries({ queryKey: ["ebook-generation-job", jobId] });
    },
  });
}

export function useCancelEbookGeneration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      await (supabase as any).from("ebook_generation_jobs").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
      return jobId;
    },
    onSuccess: (jobId) => {
      qc.invalidateQueries({ queryKey: ["ebook-generation-job", jobId] });
    },
  });
}

export function getStepLabel(step: string | null): string {
  if (!step) return "A preparar…";
  return STEP_LABELS[step] || step;
}
