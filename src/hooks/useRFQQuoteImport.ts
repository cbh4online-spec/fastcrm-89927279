import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ImportLine {
  id: string;
  line_no: number;
  raw_text: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  vat_percent: number | null;
  discount_percent: number | null;
  lead_time_days: number | null;
  moq: number | null;
  pack_size: number | null;
  currency: string;
  computed_unit_price: number | null;
  parse_confidence: number;
  match_rfq_item_id: string | null;
  match_score: number;
  match_method: string;
  match_status: string;
  error_text: string | null;
}

export function useRFQQuoteImport(rfqId: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const [importId, setImportId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);

  const parseInvokeError = async (error: any, fallback = "Processing failed") => {
    const context = error?.context;

    try {
      if (context && typeof context.json === "function") {
        const payload = await context.json();
        if (payload?.error) return payload.error;
        if (payload?.message) return payload.message;
      }

      if (context && typeof context.text === "function") {
        const text = await context.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed?.error) return parsed.error;
            if (parsed?.message) return parsed.message;
          } catch {
            return text;
          }
        }
      }

      if (context && typeof context === "object") {
        if (typeof context.error === "string") return context.error;
        if (typeof context.message === "string") return context.message;
      }
    } catch {
      // ignore and use fallback chain
    }

    return error?.message || fallback;
  };

  // Upload file and create import record
  const uploadAndCreate = async (file: File, supplierId: string, meta: Record<string, any> = {}) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const filePath = `${workspaceId}/${rfqId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("rfq-quote-files")
      .upload(filePath, file);
    if (uploadErr) throw new Error("Upload failed: " + uploadErr.message);

    const fileType = ["jpg", "jpeg"].includes(ext) ? "jpg" : ext === "png" ? "png" : "pdf";

    const { data: record, error: insertErr } = await supabase
      .from("rfq_quote_imports" as any)
      .insert({
        workspace_id: workspaceId,
        rfq_id: rfqId,
        supplier_id: supplierId,
        file_url: filePath,
        file_name: file.name,
        file_type: fileType,
        meta_json: meta,
      })
      .select("id")
      .single();
    if (insertErr) throw new Error("Create record failed: " + insertErr.message);

    setImportId((record as any).id);
    return (record as any).id;
  };

  // Process (OCR + Parse + Match)
  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("rfq-quote-ocr-parse", {
        body: { import_id: id },
      });
      if (error) {
        const msg = await parseInvokeError(error, "Processing failed");
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setProcessResult(data);
      setIsProcessing(false);
      toast.success(`Extraídas ${data.lines_count} linhas: ${data.matched} matched, ${data.needs_review} para rever`);
    },
    onError: (err: Error) => {
      setIsProcessing(false);
      toast.error(`Erro no processamento: ${err.message}`);
    },
  });

  // Fetch import lines
  const linesQuery = useQuery({
    queryKey: ["rfq-quote-import-lines", importId],
    queryFn: async () => {
      if (!importId) return [];
      const { data, error } = await supabase
        .from("rfq_quote_import_lines" as any)
        .select("*")
        .eq("import_id", importId)
        .order("line_no");
      if (error) throw error;
      return (data || []) as unknown as ImportLine[];
    },
    enabled: !!importId,
  });

  // Update match
  const updateMatchMutation = useMutation({
    mutationFn: async ({ lineId, rfqItemId }: { lineId: string; rfqItemId: string | null }) => {
      const { data, error } = await supabase.functions.invoke("rfq-quote-update-match", {
        body: { line_id: lineId, rfq_item_id: rfqItemId },
      });
      if (error) {
        const msg = await parseInvokeError(error, "Erro ao atualizar match");
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-quote-import-lines", importId] });
    },
  });

  // Apply
  const applyMutation = useMutation({
    mutationFn: async (mode: "draft" | "submitted") => {
      if (!importId) throw new Error("No import to apply");
      const { data, error } = await supabase.functions.invoke("rfq-quote-apply", {
        body: { import_id: importId, mode },
      });
      if (error) {
        const msg = await parseInvokeError(error, "Erro ao aplicar");
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      toast.success(`Aplicado: ${data.created} criadas, ${data.updated} atualizadas${data.errors?.length ? `, ${data.errors.length} erros` : ""}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao aplicar: ${err.message}`);
    },
  });

  return {
    importId,
    setImportId,
    uploadAndCreate,
    process: processMutation.mutateAsync,
    isProcessing,
    processResult,
    lines: linesQuery.data || [],
    isLoadingLines: linesQuery.isLoading,
    refetchLines: linesQuery.refetch,
    updateMatch: updateMatchMutation.mutateAsync,
    apply: applyMutation.mutateAsync,
    isApplying: applyMutation.isPending,
  };
}
