import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentJob {
  id: string;
  workspace_id: string;
  created_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_hash: string | null;
  status: JobStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_engine: string | null;
  ocr_pages: number | null;
  ocr_duration_ms: number | null;
  document_type: string | null;
  document_subtype: string | null;
  classification_confidence: number | null;
  classification_reasoning: string | null;
  extracted_data: Record<string, unknown>;
  extracted_entities: ExtractedEntity[];
  extraction_confidence: number | null;
  extraction_schema: string | null;
  knowledge_document_id: string | null;
  indexed_at: string | null;
  source: string;
  source_reference: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | "pending"
  | "processing"
  | "ocr"
  | "classifying"
  | "extracting"
  | "embedding"
  | "completed"
  | "failed"
  | "cancelled";

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface UploadDocumentParams {
  file: File;
  source?: string;
  tags?: string[];
  extractionTemplateId?: string;
  priority?: "low" | "normal" | "high";
}

export interface DocumentFilters {
  status?: JobStatus | JobStatus[];
  documentType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

const QK = "document-processing-jobs";

export function useDocumentJobs(filters?: DocumentFilters) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [QK, currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = (supabase
        .from("document_processing_jobs" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false }) as any);

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.documentType) {
        query = query.eq("document_type", filters.documentType);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      if (filters?.search) {
        query = query.or(
          `file_name.ilike.%${filters.search}%,ocr_text.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DocumentJob[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: (query) => {
      const docs = query.state.data as DocumentJob[] | undefined;
      const hasProcessing = docs?.some(
        (j) => !["completed", "failed", "cancelled"].includes(j.status)
      );
      return hasProcessing ? 3000 : 30000;
    },
  });
}

export function useDocumentJob(jobId: string | null) {
  return useQuery({
    queryKey: [QK, "detail", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await (supabase
        .from("document_processing_jobs" as any)
        .select("*")
        .eq("id", jobId)
        .single() as any);
      if (error) throw error;
      return data as DocumentJob;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data as DocumentJob | null | undefined;
      if (!job) return false;
      return ["pending", "processing", "ocr", "classifying", "extracting", "embedding"].includes(job.status)
        ? 2000
        : false;
    },
  });
}

export function useDocumentStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [QK, "stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await (supabase
        .from("document_processing_jobs" as any)
        .select("status, document_type, created_at")
        .eq("workspace_id", currentWorkspace.id) as any);

      if (error) throw error;
      const jobs = (data || []) as { status: string; document_type: string | null; created_at: string }[];

      const total = jobs.length;
      const byStatus = jobs.reduce((acc, j) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byType = jobs.reduce((acc, j) => {
        if (j.document_type) acc[j.document_type] = (acc[j.document_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30Days = jobs.filter((j) => new Date(j.created_at) >= thirtyDaysAgo).length;

      return {
        total,
        byStatus,
        byType,
        last30Days,
        successRate: total > 0 ? ((byStatus.completed || 0) / total) * 100 : 0,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload to storage
      const fileExt = params.file.name.split(".").pop() || "bin";
      const filePath = `${currentWorkspace.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("document-intelligence")
        .upload(filePath, params.file, { contentType: params.file.type });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 2. Create job record
      const { data: job, error: jobError } = await (supabase
        .from("document_processing_jobs" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          file_name: params.file.name,
          file_path: filePath,
          file_size: params.file.size,
          file_type: params.file.type || `application/${fileExt}`,
          status: "pending",
          source: params.source || "upload",
          tags: params.tags || [],
          custom_fields: {
            extraction_template_id: params.extractionTemplateId,
            priority: params.priority || "normal",
          },
        } as any)
        .select()
        .single() as any);

      if (jobError) throw new Error(`Job creation failed: ${jobError.message}`);

      // 3. Trigger processing
      supabase.functions.invoke("document-intelligence-process", {
        body: { job_id: (job as any).id, workspace_id: currentWorkspace.id },
      }).catch(console.error);

      return job as DocumentJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("Documento enviado para processamento");
    },
    onError: (error: Error) => {
      toast.error("Erro ao processar documento", { description: error.message });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      await (supabase
        .from("document_processing_jobs" as any)
        .update({
          status: "pending",
          progress: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
        } as any)
        .eq("id", jobId) as any);

      const { error } = await supabase.functions.invoke("document-intelligence-process", {
        body: { job_id: jobId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("Reprocessamento iniciado");
    },
    onError: (err: Error) => toast.error("Erro ao reprocessar", { description: err.message }),
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from("document_processing_jobs" as any)
        .update({ status: "cancelled", completed_at: new Date().toISOString() } as any)
        .eq("id", jobId)
        .in("status", ["pending", "processing", "ocr", "classifying", "extracting"]) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.info("Processamento cancelado");
    },
  });
}

export function useUpdateExtractedData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, extractedData }: { jobId: string; extractedData: Record<string, unknown> }) => {
      const { error } = await (supabase
        .from("document_processing_jobs" as any)
        .update({ extracted_data: extractedData, updated_at: new Date().toISOString() } as any)
        .eq("id", jobId) as any);
      if (error) throw error;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [QK, "detail", jobId] });
      toast.success("Dados actualizados");
    },
  });
}

export function useDeleteDocumentJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data: job } = await (supabase
        .from("document_processing_jobs" as any)
        .select("file_path")
        .eq("id", jobId)
        .single() as any);

      if ((job as any)?.file_path) {
        await supabase.storage.from("document-intelligence").remove([(job as any).file_path]);
      }

      const { error } = await (supabase
        .from("document_processing_jobs" as any)
        .delete()
        .eq("id", jobId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
      toast.success("Documento eliminado");
    },
  });
}

// ============================================================================
// COMPOSITE HOOK
// ============================================================================

export function useDocumentProcessing(filters?: DocumentFilters) {
  const jobs = useDocumentJobs(filters);
  const stats = useDocumentStats();
  const uploadDocument = useUploadDocument();
  const reprocessDocument = useReprocessDocument();
  const cancelJob = useCancelJob();
  const updateExtractedData = useUpdateExtractedData();
  const deleteJob = useDeleteDocumentJob();

  return {
    jobs: jobs.data ?? [],
    isLoading: jobs.isLoading,
    error: jobs.error,
    stats: stats.data,

    uploadDocument: uploadDocument.mutateAsync,
    isUploading: uploadDocument.isPending,
    reprocessDocument: reprocessDocument.mutate,
    cancelJob: cancelJob.mutate,
    updateExtractedData: updateExtractedData.mutate,
    deleteJob: deleteJob.mutate,

    refetch: jobs.refetch,
  };
}
