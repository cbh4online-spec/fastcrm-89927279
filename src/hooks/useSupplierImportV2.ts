import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ImportV2State {
  importId: string | null;
  status: "idle" | "uploading" | "parsing" | "validating" | "previewing" | "committing" | "done" | "error";
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  parseErrors: number;
  stats: { total: number; matched: number; unmatched: number; errors: number; duplicates: number } | null;
  commitStats: { total_matched: number; updated: number; created: number; unchanged: number; errors: number } | null;
  previewRows: any[];
  currentStep: string;
  progressPercent: number;
}

export function useSupplierImportV2() {
  const { currentWorkspace } = useWorkspace();
  const [state, setState] = useState<ImportV2State>({
    importId: null,
    status: "idle",
    columns: [],
    sampleRows: [],
    totalRows: 0,
    parseErrors: 0,
    stats: null,
    commitStats: null,
    previewRows: [],
    currentStep: "idle",
    progressPercent: 0,
  });

  const uploadAndParse = useCallback(async (
    supplierId: string,
    file: File,
    pricingMode: string,
    currency: string,
    options: {
      globalDiscountPercent?: number;
      marginPercent?: number;
      basePriceField?: string;
      priceIsPerPack?: boolean;
      categoryDiscountsJson?: Record<string, number>;
      profileId?: string;
      mappingJson?: Record<string, string>;
    }
  ) => {
    if (!currentWorkspace?.id) return;
    setState(s => ({ ...s, status: "uploading", currentStep: "uploading", progressPercent: 10 }));

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "csv";
      const filePath = `${currentWorkspace.id}/${Date.now()}_${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("supplier-price-files")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const user = (await supabase.auth.getUser()).data.user;
      const { data: importRecord, error: insertErr } = await supabase
        .from("supplier_price_imports" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          supplier_id: supplierId,
          file_url: filePath,
          file_name: file.name,
          file_type: fileExt,
          pricing_mode: pricingMode,
          currency,
          global_discount_percent: options.globalDiscountPercent ?? null,
          margin_percent: options.marginPercent ?? null,
          base_price_field: options.basePriceField ?? null,
          price_is_per_pack: options.priceIsPerPack ?? false,
          category_discounts_json: options.categoryDiscountsJson ?? null,
          profile_id: options.profileId ?? null,
          status: "uploaded",
          current_step: "uploaded",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const importId = (importRecord as any).id;
      setState(s => ({ ...s, importId, status: "parsing", currentStep: "parsing", progressPercent: 20 }));

      const { data: parseResult, error: parseErr } = await supabase.functions.invoke(
        "supplier-import-parse-v2",
        { body: { import_id: importId, mapping_json: options.mappingJson || null, profile_id: options.profileId || null } }
      );
      if (parseErr) throw parseErr;
      if (parseResult?.error) throw new Error(parseResult.error);

      setState(s => ({
        ...s,
        status: "idle",
        currentStep: "parsed",
        progressPercent: 30,
        columns: parseResult.columns || [],
        sampleRows: parseResult.sample_rows || [],
        totalRows: parseResult.total_rows || 0,
        parseErrors: parseResult.parse_errors || 0,
      }));

      return { importId, columns: parseResult.columns, sampleRows: parseResult.sample_rows, totalRows: parseResult.total_rows };
    } catch (err: any) {
      setState(s => ({ ...s, status: "error", currentStep: "error" }));
      toast.error("Erro no upload: " + err.message);
      throw err;
    }
  }, [currentWorkspace]);

  const validate = useCallback(async (
    mappingJson: Record<string, string>,
    pricingMode: string,
    options: {
      globalDiscountPercent?: number;
      marginPercent?: number;
      basePriceField?: string;
      priceIsPerPack?: boolean;
      categoryDiscountsJson?: Record<string, number>;
    }
  ) => {
    if (!state.importId) return;
    setState(s => ({ ...s, status: "validating", currentStep: "matching", progressPercent: 50 }));

    try {
      const { data, error } = await supabase.functions.invoke("supplier-import-validate-v2", {
        body: {
          import_id: state.importId,
          mapping_json: mappingJson,
          pricing_mode: pricingMode,
          global_discount_percent: options.globalDiscountPercent ?? null,
          margin_percent: options.marginPercent ?? null,
          base_price_field: options.basePriceField ?? null,
          price_is_per_pack: options.priceIsPerPack ?? false,
          category_discounts_json: options.categoryDiscountsJson ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Load preview rows
      const { data: rows } = await supabase
        .from("supplier_price_import_rows" as any)
        .select("*")
        .eq("import_id", state.importId)
        .order("row_index")
        .limit(100);

      setState(s => ({
        ...s,
        status: "previewing",
        currentStep: "ready_for_review",
        progressPercent: 70,
        stats: data.stats,
        previewRows: (rows as any) || [],
      }));

      return data.stats;
    } catch (err: any) {
      setState(s => ({ ...s, status: "error", currentStep: "error" }));
      toast.error("Erro na validação: " + err.message);
      throw err;
    }
  }, [state.importId]);

  const commit = useCallback(async () => {
    if (!state.importId) return;
    setState(s => ({ ...s, status: "committing", currentStep: "committing", progressPercent: 85 }));

    try {
      const { data, error } = await supabase.functions.invoke("supplier-import-commit-v2", {
        body: { import_id: state.importId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setState(s => ({ ...s, status: "done", currentStep: "committed", progressPercent: 100, commitStats: data.stats }));
      toast.success("Importação concluída com sucesso!");
      return data.stats;
    } catch (err: any) {
      setState(s => ({ ...s, status: "error", currentStep: "error" }));
      toast.error("Erro no commit: " + err.message);
      throw err;
    }
  }, [state.importId]);

  const updateRowMatch = useCallback(async (rowId: string, productId: string) => {
    const { error } = await supabase
      .from("supplier_price_import_rows" as any)
      .update({ product_id: productId, match_status: "matched", match_method: "manual", match_confidence: 1.0 } as any)
      .eq("id", rowId);
    if (error) { toast.error("Erro ao atualizar match"); return; }
    setState(s => ({
      ...s,
      previewRows: s.previewRows.map(r =>
        r.id === rowId ? { ...r, product_id: productId, match_status: "matched", match_method: "manual" } : r
      ),
    }));
  }, []);

  const loadPreviewRows = useCallback(async (filter?: string) => {
    if (!state.importId) return;
    let query = supabase
      .from("supplier_price_import_rows" as any)
      .select("*")
      .eq("import_id", state.importId)
      .order("row_index");

    if (filter === "matched") query = query.eq("match_status", "matched");
    else if (filter === "unmatched") query = query.eq("match_status", "unmatched");
    else if (filter === "needs_review") query = query.eq("match_status", "needs_review");
    else if (filter === "duplicates") query = query.not("duplicate_key", "is", null);
    else if (filter === "errors") query = query.neq("error_text", null);

    const { data } = await query.limit(100);
    setState(s => ({ ...s, previewRows: (data as any) || [] }));
  }, [state.importId]);

  const reset = useCallback(() => {
    setState({
      importId: null, status: "idle", columns: [], sampleRows: [],
      totalRows: 0, parseErrors: 0, stats: null, commitStats: null, previewRows: [],
      currentStep: "idle", progressPercent: 0,
    });
  }, []);

  return { ...state, uploadAndParse, validate, commit, updateRowMatch, loadPreviewRows, reset };
}
