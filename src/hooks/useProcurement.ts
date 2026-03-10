import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18next from "i18next";

const t = (key: string, opts?: any) => i18next.t(`procurement:${key}`, opts);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success(t("supplierCreated")); },
    onError: () => toast.error(t("errorCreatingSupplier")),
  });

  const update = useMutation({
    mutationFn: async (values: { id: string; name?: string; vat_number?: string; address?: string; payment_terms?: string; iban?: string; email?: string; phone?: string; category?: string; status?: string; notes?: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase.from("suppliers").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success(t("supplierUpdated")); },
    onError: () => toast.error(t("errorUpdatingSupplier")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success(t("supplierRemoved")); },
    onError: () => toast.error(t("errorRemovingSupplier")),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success(t("requestCreated")); },
    onError: () => toast.error(t("errorCreatingRequest")),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success(t("requestApproved")); },
    onError: () => toast.error(t("errorApprovingRequest")),
  });

  const reject = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const updateData: Record<string, unknown> = { status: "rejected" };
      if (notes) updateData.notes = notes;
      const { error } = await supabase.from("purchase_requests").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); toast.success(t("requestRejected")); },
    onError: () => toast.error(t("errorRejectingRequest")),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success(t("orderCreated")); },
    onError: () => toast.error(t("errorCreatingOrder")),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success(t("statusUpdated")); },
    onError: () => toast.error(t("errorUpdatingStatus")),
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

  const create = useMutation({
    mutationFn: async ({ purchase_order_id, items, notes }: {
      purchase_order_id: string;
      items: { order_item_id: string; quantity_received: number }[];
      notes?: string;
    }) => {
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
      toast.success(t("receiptRegistered"));
    },
    onError: () => toast.error(t("errorRegisteringReceipt")),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-invoices"] }); toast.success(t("invoiceRegistered")); },
    onError: () => toast.error(t("errorRegisteringInvoice")),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("supplier_invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-invoices"] }); toast.success(t("invoiceStatusUpdated")); },
    onError: () => toast.error(t("errorUpdatingInvoiceStatus")),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success(t("catalogEntryCreated")); },
    onError: () => toast.error(t("errorCreatingCatalogEntry")),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("supplier_products").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success(t("catalogEntryUpdated")); },
    onError: () => toast.error(t("errorUpdatingCatalogEntry")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier-products"] }); toast.success(t("catalogEntryRemoved")); },
    onError: () => toast.error(t("errorRemovingCatalogEntry")),
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
      toast.success(t("ordersCreatedCount", { count: data.count }));
    },
    onError: () => toast.error(t("errorConvertingRequest")),
  });
}

// ============ CONVERT PO TO INVOICE ============
export function useConvertPOToInvoice(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, supplierId, totalAmount, poNumber }: { orderId: string; supplierId: string; totalAmount: number; poNumber?: string }) => {
      // Create supplier invoice linked to PO
      const { error: invErr } = await supabase.from("supplier_invoices").insert({
        workspace_id: workspaceId!,
        supplier_id: supplierId,
        purchase_order_id: orderId,
        invoice_number: poNumber ? `INV-${poNumber}` : undefined,
        invoice_date: new Date().toISOString().split("T")[0],
        total: totalAmount,
        status: "pending",
      });
      if (invErr) throw invErr;

      // Update PO status to closed
      const { error: poErr } = await supabase.from("purchase_orders")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (poErr) throw poErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      qc.invalidateQueries({ queryKey: ["procurement-kpis"] });
      toast.success(t("invoiceCreatedFromPO"));
    },
    onError: () => toast.error(t("errorConvertingToInvoice")),
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
        supabase.from("supplier_invoices").select("id, total, status").eq("workspace_id", workspaceId),
      ]);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalMonth = (orders.data || [])
        .filter(o => o.status !== "cancelled")
        .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

      const activeOrders = (orders.data || []).filter(o => !["closed", "cancelled"].includes(o.status)).length;

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