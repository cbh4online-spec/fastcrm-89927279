import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuoteSheetRow {
  rfq_item_id: string;
  line_number: number;
  product_name: string;
  sku: string;
  qty: number;
  unit: string;
  spec_notes: string;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  lead_time_days: number | null;
  min_order_qty: number | null;
  pack_size: number | null;
  notes: string;
  supplier_ref: string;
  status: string;
  has_existing_quote: boolean;
  excluded?: boolean;
}

export interface QuoteSheetData {
  rfq_id: string;
  supplier_id: string;
  workspace_id: string;
  currency: string;
  rows: QuoteSheetRow[];
  total_items: number;
  quoted_items: number;
}

export function useRFQQuoteSheet() {
  const queryClient = useQueryClient();
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  const fetchSheet = async (rfqId: string, supplierId: string): Promise<QuoteSheetData> => {
    setIsLoadingSheet(true);
    try {
      const { data, error } = await supabase.functions.invoke("rfq-get-supplier-quote-sheet", {
        body: { rfq_id: rfqId, supplier_id: supplierId },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao carregar dados");
      }
      if (data?.error) throw new Error(data.error);
      return data as QuoteSheetData;
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ rfq_id, supplier_id, rows }: { rfq_id: string; supplier_id: string; rows: any[] }) => {
      const { data, error } = await supabase.functions.invoke("rfq-upsert-quote-sheet", {
        body: { rfq_id, supplier_id, rows },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao guardar");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      toast.success(`Guardado: ${data.created} criadas, ${data.updated} atualizadas`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao guardar: ${err.message}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ rfq_id, supplier_id }: { rfq_id: string; supplier_id: string }) => {
      const { data, error } = await supabase.functions.invoke("rfq-submit-quote-sheet", {
        body: { rfq_id, supplier_id },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao submeter");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      toast.success(`Cotação submetida! ${data.submitted_count} itens.`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao submeter: ${err.message}`);
    },
  });

  return {
    fetchSheet,
    isLoadingSheet,
    upsertSheet: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    submitSheet: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}
