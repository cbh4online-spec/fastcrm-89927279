import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRFQs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["rfqs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("rfqs")
        .select("*, procurement_projects:project_id(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useRFQDetail(rfqId: string | undefined) {
  const rfq = useQuery({
    queryKey: ["rfq", rfqId],
    queryFn: async () => {
      if (!rfqId) return null;
      const { data, error } = await supabase
        .from("rfqs")
        .select("*, procurement_projects:project_id(name, source_id, source_type)")
        .eq("id", rfqId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!rfqId,
  });

  // Fetch workspace info for buyer details
  const workspace = useQuery({
    queryKey: ["rfq-workspace", rfq.data?.workspace_id],
    queryFn: async () => {
      if (!rfq.data?.workspace_id) return null;
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, company_name, tax_id, billing_address, phone")
        .eq("id", rfq.data.workspace_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!rfq.data?.workspace_id,
  });

  const items = useQuery({
    queryKey: ["rfq-items", rfqId],
    queryFn: async () => {
      if (!rfqId) return [];
      const { data, error } = await supabase
        .from("rfq_items")
        .select("*, products:product_id(name, sku)")
        .eq("rfq_id", rfqId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!rfqId,
  });

  const suppliers = useQuery({
    queryKey: ["rfq-suppliers", rfqId],
    queryFn: async () => {
      if (!rfqId) return [];
      const { data, error } = await supabase
        .from("rfq_suppliers")
        .select("*, suppliers:supplier_id(name, email)")
        .eq("rfq_id", rfqId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!rfqId,
  });

  const quotes = useQuery({
    queryKey: ["rfq-quotes", rfqId],
    queryFn: async () => {
      if (!rfqId) return [];
      const { data, error } = await supabase
        .from("rfq_quotes")
        .select("*, suppliers:supplier_id(name), rfq_items:rfq_item_id(product_id, products:product_id(name))")
        .eq("rfq_id", rfqId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!rfqId,
  });

  return {
    rfq: rfq.data,
    items: items.data || [],
    suppliers: suppliers.data || [],
    quotes: quotes.data || [],
    workspace: workspace.data,
    isLoading: rfq.isLoading,
  };
}

export function useCreateRFQFromNeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; workspace_id: string; supplier_ids: string[]; title?: string; due_date?: string }) => {
      const { data, error } = await supabase.functions.invoke("rfq-create-from-needs", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      qc.invalidateQueries({ queryKey: ["procurement-needs"] });
      toast.success("RFQ criado com sucesso!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

export function useSendRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rfq_id: string) => {
      const { data, error } = await supabase.functions.invoke("rfq-send", { body: { rfq_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      qc.invalidateQueries({ queryKey: ["rfq"] });
      qc.invalidateQueries({ queryKey: ["rfq-suppliers"] });
      toast.success("RFQ enviado aos fornecedores!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

export function useAddRFQQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string; rfq_id: string; rfq_item_id: string; supplier_id: string;
      unit_price: number; lead_time_days?: number; min_order_qty?: number; notes?: string;
      discount_percent?: number; vat_percent?: number;
    }) => {
      const { error } = await supabase.from("rfq_quotes").insert({
        workspace_id: input.workspace_id,
        rfq_id: input.rfq_id,
        rfq_item_id: input.rfq_item_id,
        supplier_id: input.supplier_id,
        unit_price: input.unit_price,
        lead_time_days: input.lead_time_days,
        min_order_qty: input.min_order_qty,
        notes: input.notes,
        discount_percent: input.discount_percent || 0,
        vat_percent: input.vat_percent || 23,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfq-quotes"] });
      toast.success("Cotação registada!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

export function useAddRFQSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspace_id: string; rfq_id: string; supplier_id: string }) => {
      const { error } = await supabase.from("rfq_suppliers").insert({
        workspace_id: input.workspace_id,
        rfq_id: input.rfq_id,
        supplier_id: input.supplier_id,
        status: "invited",
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rfq-suppliers", vars.rfq_id] });
      toast.success("Fornecedor adicionado ao RFQ!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

export function useAwardRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rfq_id: string; selected_quote_ids: string[] }) => {
      const { data, error } = await supabase.functions.invoke("rfq-award-and-create-pos", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      qc.invalidateQueries({ queryKey: ["rfq"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["procurement-needs"] });
      toast.success(`${data?.count || 0} Ordem(ns) de Compra criada(s)!`);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUpdateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rfqId, updates }: { rfqId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("rfqs")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", rfqId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rfq", vars.rfqId] });
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("RFQ atualizado!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}
