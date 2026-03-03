import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ImportState {
  importId: string | null;
  status: "idle" | "uploading" | "parsing" | "validating" | "previewing" | "committing" | "done" | "error";
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  stats: { total: number; matched: number; unmatched: number; errors: number } | null;
  commitStats: { total_matched: number; updated: number; created: number; errors: number } | null;
  previewRows: any[];
}

export function useSupplierPriceImport() {
  const { currentWorkspace } = useWorkspace();
  const [state, setState] = useState<ImportState>({
    importId: null,
    status: "idle",
    columns: [],
    sampleRows: [],
    totalRows: 0,
    stats: null,
    commitStats: null,
    previewRows: [],
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
    }
  ) => {
    if (!currentWorkspace?.id) return;
    setState(s => ({ ...s, status: "uploading" }));

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "csv";
      const filePath = `${currentWorkspace.id}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("supplier-price-files")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Create import record
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
          status: "uploaded",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const importId = (importRecord as any).id;
      setState(s => ({ ...s, importId, status: "parsing" }));

      // Call parse edge function
      const { data: parseResult, error: parseErr } = await supabase.functions.invoke(
        "supplier-import-parse",
        { body: { import_id: importId } }
      );
      if (parseErr) throw parseErr;

      setState(s => ({
        ...s,
        status: "idle",
        columns: parseResult.columns || [],
        sampleRows: parseResult.sample_rows || [],
        totalRows: parseResult.total_rows || 0,
      }));

      return { importId, columns: parseResult.columns, sampleRows: parseResult.sample_rows };
    } catch (err: any) {
      setState(s => ({ ...s, status: "error" }));
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
    setState(s => ({ ...s, status: "validating" }));

    try {
      const { data, error } = await supabase.functions.invoke("supplier-import-validate", {
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

      // Load preview rows
      const { data: rows } = await supabase
        .from("supplier_price_import_rows" as any)
        .select("*")
        .eq("import_id", state.importId)
        .order("row_index")
        .limit(50);

      setState(s => ({
        ...s,
        status: "previewing",
        stats: data.stats,
        previewRows: (rows as any) || [],
      }));

      return data.stats;
    } catch (err: any) {
      setState(s => ({ ...s, status: "error" }));
      toast.error("Erro na validação: " + err.message);
      throw err;
    }
  }, [state.importId]);

  const commit = useCallback(async () => {
    if (!state.importId) return;
    setState(s => ({ ...s, status: "committing" }));

    try {
      const { data, error } = await supabase.functions.invoke("supplier-import-commit", {
        body: { import_id: state.importId },
      });
      if (error) throw error;

      setState(s => ({ ...s, status: "done", commitStats: data.stats }));
      toast.success("Importação concluída com sucesso!");
      return data.stats;
    } catch (err: any) {
      setState(s => ({ ...s, status: "error" }));
      toast.error("Erro no commit: " + err.message);
      throw err;
    }
  }, [state.importId]);

  const updateRowMatch = useCallback(async (rowId: string, productId: string) => {
    const { error } = await supabase
      .from("supplier_price_import_rows" as any)
      .update({ product_id: productId, match_status: "matched" } as any)
      .eq("id", rowId);
    if (error) { toast.error("Erro ao atualizar match"); return; }

    setState(s => ({
      ...s,
      previewRows: s.previewRows.map(r =>
        r.id === rowId ? { ...r, product_id: productId, match_status: "matched" } : r
      ),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      importId: null, status: "idle", columns: [], sampleRows: [],
      totalRows: 0, stats: null, commitStats: null, previewRows: [],
    });
  }, []);

  return { ...state, uploadAndParse, validate, commit, updateRowMatch, reset };
}
