import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ SUPPLIERS ============
export function useSuppliers(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["suppliers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (values: { name: string; vat_number?: string; address?: string; payment_terms?: string; iban?: string; email?: string; phone?: string; category?: string; status?: string; notes?: string }) => {
      const { error } = await supabase.from("suppliers").insert({
        workspace_id: workspaceId!,
        name: values.name,
        vat_number: values.vat_number,
        address: values.address,
        payment_terms: values.payment_terms,
        iban: values.iban,
        email: values.email,
        phone: values.phone,
        category: values.category,
        status: values.status,
        notes: values.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Fornecedor criado"); },
    onError: () => toast.error("Erro ao criar fornecedor"),
  });

  const update = useMutation({
    mutationFn: async (values: { id: string; name?: string; vat_number?: string; address?: string; payment_terms?: string; iban?: string; email?: string; phone?: string; category?: string; status?: string; notes?: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase.from("suppliers").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Fornecedor atualizado"); },
    onError: () => toast.error("Erro ao atualizar fornecedor"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Fornecedor removido"); },
    onError: () => toast.error("Erro ao remover fornecedor"),
  });

  return { ...query, create: create.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync };
}

// ============ PURCHASE REQUESTS ============
interface PurchaseRequestItemInput {
  product_id?: string;
  variant_id?: string;
  description: string;
  quantity: number;
  estimated_unit_price?: number;
  suggested_supplier_id?: string;
  suggested_unit_price?: number;
  suggestion_json?: any;
  chosen_supplier_id?: string;
  chosen_unit_price?: number;
}

export function usePurchaseRequests(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["purchase-requests", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*, supplier:suppliers(id, name), items:purchase_request_items(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async ({ items, ...values }: {
      items: PurchaseRequestItemInput[];
      supplier_id?: string;
      status?: string;
      total_estimated?: number;
      urgency?: string;
      cost_center?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: req, error } = await supabase
        .from("purchase_requests")
        .insert({
          workspace_id: workspaceId!,
          created_by: user.user?.id,
          supplier_id: values.supplier_id,
          status: values.status || "pending",
          total_estimated: values.total_estimated,
          urgency: values.urgency || "medium",
          cost_center: values.cost_center,
          notes: values.notes,
        })
        .select()
        .single();
      if (error) throw error;
      if (items?.length) {
        const { error: ie } = await supabase
          .from("purchase_request_items")
          .insert(items.map((i) => ({
            request_id: req.id,
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            description: i.description,
            quantity: i.quantity,
            estimated_unit_price: i.estimated_unit_price,
            suggested_supplier_id: i.suggested_supplier_id || null,
            suggested_unit_price: i.suggested_unit_price || null,
            suggestion_json: i.suggestion_json || null,
            chosen_supplier_id: i.chosen_supplier_id || null,
            chosen_unit_price: i.chosen_unit_price || null,
          })));
        if (ie) throw ie;
      }
      return req;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success("Requisição criada"); },
    onError: () => toast.error("Erro ao criar requisição"),
  });

  const approve = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = {
        status: "approved",
        approved_by: user.user?.id,
        approved_at: new Date().toISOString(),
      };
      if (notes) updateData.notes = notes;
      const { error } = await supabase.from("purchase_requests").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success("Requisição aprovada"); },
    onError: () => toast.error("Erro ao aprovar"),
  });

  const reject = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const updateData: Record<string, unknown> = { status: "rejected" };
      if (notes) updateData.notes = notes;
      const { error } = await supabase.from("purchase_requests").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success("Requisição rejeitada"); },
    onError: () => toast.error("Erro ao rejeitar"),
  });

  return { ...query, create: create.mutateAsync, approve: approve.mutateAsync, reject: reject.mutateAsync };
}

// ============ PURCHASE ORDERS ============
interface PurchaseOrderItemInput {
  product_id?: string;
  variant_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function usePurchaseOrders(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["purchase-orders", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, supplier:suppliers(id, name), items:purchase_order_items(*), rfqs:rfq_id(id, title, rfq_number), procurement_projects:project_id(id, name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async ({ items, ...values }: {
      items: PurchaseOrderItemInput[];
      supplier_id: string;
      request_id?: string;
      total_amount?: number;
      expected_delivery?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({
          workspace_id: workspaceId!,
          supplier_id: values.supplier_id,
          request_id: values.request_id,
          total_amount: values.total_amount,
          expected_delivery: values.expected_delivery,
          notes: values.notes,
          created_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      if (items?.length) {
        const { error: ie } = await supabase
          .from("purchase_order_items")
          .insert(items.map((i) => ({
            order_id: po.id,
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })));
        if (ie) throw ie;
      }
      return po;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success("Ordem de compra criada"); },
    onError: () => toast.error("Erro ao criar ordem de compra"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success("Estado atualizado"); },
    onError: () => toast.error("Erro ao atualizar estado"),
  });

  return { ...query, create: create.mutateAsync, updateStatus: updateStatus.mutateAsync };
}

// ============ GOODS RECEIPTS ============
export function useGoodsReceipts(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["goods-receipts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("goods_receipts")
        .select("*, purchase_order:purchase_orders(id, po_number, supplier:suppliers(id, name)), items:goods_receipt_items(*, order_item:purchase_order_items(id, description, quantity))")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Note: receipts are now created via edge function in GoodsReceiptForm
  // This create is kept for backward compatibility but should not be used directly
  const create = useMutation({
    mutationFn: async ({ purchase_order_id, items, notes }: {
      purchase_order_id: string;
      items: { order_item_id: string; quantity_received: number }[];
      notes?: string;
    }) => {
      // Use edge function for atomic receipt + stock + cost update
      const { data, error } = await supabase.functions.invoke("procurement-receive-items", {
        body: {
          workspace_id: workspaceId!,
          purchase_order_id,
          items,
          notes,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["product-inventory"] });
      qc.invalidateQueries({ queryKey: ["procurement-kpis"] });
      toast.success("Receção registada");
    },
    onError: () => toast.error("Erro ao registar receção"),
  });

  return { ...query, create: create.mutateAsync };
}

// ============ SUPPLIER INVOICES ============
export function useSupplierInvoices(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["supplier-invoices", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select("*, supplier:suppliers(id, name), purchase_order:purchase_orders(id, po_number)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (values: {
      supplier_id: string;
      purchase_order_id?: string;
      invoice_number?: string;
      invoice_date?: string;
      due_date?: string;
      total?: number;
      status?: string;
      file_url?: string;
    }) => {
      const { error } = await supabase.from("supplier_invoices").insert({
        workspace_id: workspaceId!,
        supplier_id: values.supplier_id,
        purchase_order_id: values.purchase_order_id,
        invoice_number: values.invoice_number,
        invoice_date: values.invoice_date,
        due_date: values.due_date,
        total: values.total,
        status: values.status || "pending",
        file_url: values.file_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-invoices"] }); toast.success("Fatura registada"); },
    onError: () => toast.error("Erro ao registar fatura"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("supplier_invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-invoices"] }); toast.success("Estado da fatura atualizado"); },
    onError: () => toast.error("Erro ao atualizar fatura"),
  });

  return { ...query, create: create.mutateAsync, updateStatus: updateStatus.mutateAsync };
}

// ============ SUPPLIER PRODUCTS ============
export function useSupplierProducts(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["supplier-products", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*, supplier:suppliers(id, name), product:products(id, name, sku)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("supplier_products").insert({
        workspace_id: workspaceId!,
        ...values,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success("Entrada de catálogo criada"); },
    onError: () => toast.error("Erro ao criar entrada"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("supplier_products").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success("Entrada atualizada"); },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success("Entrada removida"); },
    onError: () => toast.error("Erro ao remover"),
  });

  return { ...query, create: create.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync };
}

// ============ SUGGEST SUPPLIERS ============
export function useSuggestSuppliers() {
  return useMutation({
    mutationFn: async ({ workspaceId, items }: { workspaceId: string; items: { product_id: string; variant_id?: string; requested_qty: number }[] }) => {
      const { data, error } = await supabase.functions.invoke("procurement-suggest-suppliers", {
        body: { workspace_id: workspaceId, items },
      });
      if (error) throw error;
      return data as { item_suggestions: any[] };
    },
  });
}

// ============ CONVERT REQUEST TO PO ============
export function useConvertRequestToPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, requestId }: { workspaceId: string; requestId: string }) => {
      const { data, error } = await supabase.functions.invoke("procurement-create-po-from-request", {
        body: { workspace_id: workspaceId, request_id: requestId },
      });
      if (error) throw error;
      return data as { purchase_order_ids: string[]; count: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(`${data.count} ordem(ns) de compra criada(s)`);
    },
    onError: () => toast.error("Erro ao converter requisição em ordem de compra"),
  });
}

// ============ PROCUREMENT KPIS ============
export function useProcurementKPIs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["procurement-kpis", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { totalMonth: 0, pendingRequests: 0, unpaidInvoices: 0, activeOrders: 0 };

      const [orders, requests, invoices] = await Promise.all([
        supabase.from("purchase_orders").select("total_amount, status").eq("workspace_id", workspaceId),
        supabase.from("purchase_requests").select("id, status").eq("workspace_id", workspaceId).eq("status", "pending"),
        supabase.from("supplier_invoices").select("total, status").eq("workspace_id", workspaceId),
      ]);

      const totalMonth = (orders.data || [])
        .filter(o => !["cancelled", "draft"].includes(o.status))
        .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

      const activeOrders = (orders.data || []).filter(o => ["sent", "confirmed", "partial"].includes(o.status)).length;

      return {
        totalMonth,
        pendingRequests: requests.data?.length || 0,
        unpaidInvoices: (invoices.data || []).filter(i => i.status !== "paid").reduce((s, i) => s + (Number(i.total) || 0), 0),
        activeOrders,
      };
    },
    enabled: !!workspaceId,
  });
}
