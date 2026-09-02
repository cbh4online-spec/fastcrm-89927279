import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { trackPaymentReceived } from "@/modules/growth-seo/lib/gtmEvents";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  company_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  proposal_id: string | null;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  client_tax_id: string | null;
  renewal_contract_id: string | null;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  sent_at: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  footer_text: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  company?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total: number;
  position: number;
  created_at: string;
  product?: { id: string; name: string } | null;
}

export interface CreateInvoiceInput {
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  proposal_id?: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  client_tax_id?: string;
  issue_date?: string;
  due_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  currency?: string;
  notes?: string;
  terms?: string;
  items: CreateInvoiceItemInput[];
}

export interface CreateInvoiceItemInput {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
}

export interface UpdateInvoiceInput {
  id: string;
  status?: InvoiceStatus;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_tax_id?: string;
  issue_date?: string;
  due_date?: string | null;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  paid_at?: string;
  amount_paid?: number;
}

export function useInvoices(filters?: {
  status?: InvoiceStatus;
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["invoices", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("invoices")
        .select(`
          *, renewal_contract_id,
          company:companies(id, name),
          contact:contacts(id, name),
          lead:leads(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.company_id) {
        query = query.eq("company_id", filters.company_id);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.lead_id) {
        query = query.eq("lead_id", filters.lead_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useInvoice(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("invoices")
        .select(`
          *,
          company:companies(id, name),
          contact:contacts(id, name),
          lead:leads(id, name)
        `)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Invoice | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await workspaceClient
        .from("invoice_items")
        .select(`
          *,
          product:products(id, name)
        `)
        .eq("invoice_id", invoiceId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      // Generate invoice number
      const { data: numberData, error: numberError } = await workspaceClient
        .rpc("generate_invoice_number", { p_workspace_id: currentWorkspace.id });

      if (numberError) throw numberError;

      const invoiceNumber = numberData as string;

      // Calculate item totals
      const items = input.items.map((item, index) => {
        const discountMultiplier = 1 - (item.discount_percent || 0) / 100;
        const itemTotal = item.quantity * item.unit_price * discountMultiplier;
        return {
          ...item,
          total: itemTotal,
          position: index,
          tax_rate: item.tax_rate ?? input.tax_rate ?? 23,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = items.reduce(
        (sum, item) => sum + (item.total * (item.tax_rate || 0)) / 100,
        0
      );
      const total = subtotal + taxAmount - (input.discount_amount || 0);

      // Create invoice
      const { data: invoice, error: invoiceError } = await workspaceClient
        .from("invoices")
        .insert({
          workspace_id: currentWorkspace.id,
          invoice_number: invoiceNumber,
          status: "draft",
          company_id: input.company_id || null,
          contact_id: input.contact_id || null,
          lead_id: input.lead_id || null,
          opportunity_id: input.opportunity_id || null,
          proposal_id: input.proposal_id || null,
          client_name: input.client_name,
          client_email: input.client_email || null,
          client_address: input.client_address || null,
          client_tax_id: input.client_tax_id || null,
          issue_date: input.issue_date || new Date().toISOString().split("T")[0],
          due_date: input.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          tax_rate: input.tax_rate ?? 23,
          discount_amount: input.discount_amount || 0,
          subtotal,
          tax_amount: taxAmount,
          total,
          currency: input.currency || "EUR",
          notes: input.notes || null,
          terms: input.terms || null,
          created_by: (await workspaceClient.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (items.length > 0) {
        const { error: itemsError } = await workspaceClient
          .from("invoice_items")
          .insert(
            items.map((item) => ({
              invoice_id: invoice.id,
              product_id: item.product_id || null,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent || 0,
              tax_rate: item.tax_rate || 23,
              total: item.total,
              position: item.position,
            }))
          );

        if (itemsError) throw itemsError;
      }

      return invoice as Invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fatura criada com sucesso");

      // Kernel event: invoice created
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: "INVOICE.CREATED",
        entity_kind: "invoice",
        entity_id: data.id,
        actor_type: "user",
        source_module: "billing",
        payload: {
          invoice_number: data.invoice_number,
          total: data.total,
          currency: data.currency,
          status: data.status,
          company_id: data.company_id,
          contact_id: data.contact_id,
          opportunity_id: data.opportunity_id,
        },
      });
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Erro ao criar fatura");
    },
  });
}

export interface UpdateInvoiceItemsInput {
  invoiceId: string;
  discount_amount?: number;
  items: {
    id?: string;
    product_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    tax_rate?: number;
  }[];
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function useUpdateInvoiceItems() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateInvoiceItemsInput) => {
      const { invoiceId } = input;

      const { data: current, error: fetchError } = await workspaceClient
        .from("invoices")
        .select("id, status, amount_paid, total, external_provider")
        .eq("id", invoiceId)
        .single();
      if (fetchError) throw fetchError;

      if (current.status === "paid" || current.status === "cancelled") {
        throw new Error("Não é possível editar uma fatura paga ou cancelada");
      }
      if ((current as any).external_provider) {
        throw new Error("Fatura já enviada para faturação certificada — não pode ser editada aqui");
      }

      const computed = input.items.map((item, index) => {
        const discountMultiplier = 1 - (item.discount_percent || 0) / 100;
        const precisePrice = round6(item.unit_price || 0);
        const total = round2(item.quantity * precisePrice * discountMultiplier);
        return {
          ...item,
          unit_price: round2(precisePrice),
          unit_price_precise: precisePrice,
          discount_percent: item.discount_percent || 0,
          tax_rate: item.tax_rate ?? 23,
          total,
          position: index,
        };
      });

      const subtotal = round2(computed.reduce((sum, item) => sum + item.total, 0));
      const taxAmount = round2(
        computed.reduce((sum, item) => sum + (item.total * (item.tax_rate || 0)) / 100, 0)
      );
      const discountAmount = round2(input.discount_amount || 0);
      const total = round2(subtotal + taxAmount - discountAmount);

      const alreadyPaid = round2(current.amount_paid || 0);
      if (alreadyPaid > 0 && total < alreadyPaid) {
        throw new Error(
          `O novo total (${total.toFixed(2)} €) é inferior ao valor já pago (${alreadyPaid.toFixed(2)} €)`
        );
      }

      // Diff existing items
      const { data: existing, error: existingError } = await workspaceClient
        .from("invoice_items")
        .select("id")
        .eq("invoice_id", invoiceId);
      if (existingError) throw existingError;

      const keptIds = computed.map((item) => item.id).filter(Boolean) as string[];
      const toDelete = (existing || [])
        .map((row) => row.id as string)
        .filter((id) => !keptIds.includes(id));

      if (toDelete.length > 0) {
        const { error } = await workspaceClient.from("invoice_items").delete().in("id", toDelete);
        if (error) throw error;
      }

      for (const item of computed) {
        const payload = {
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_price_precise: item.unit_price_precise,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate,
          total: item.total,
          position: item.position,
        };

        if (item.id) {
          const { error } = await workspaceClient
            .from("invoice_items")
            .update(payload)
            .eq("id", item.id);
          if (error) throw error;
        } else {
          const { error } = await workspaceClient
            .from("invoice_items")
            .insert({ ...payload, invoice_id: invoiceId });
          if (error) throw error;
        }
      }

      const { data: updated, error: updateError } = await workspaceClient
        .from("invoices")
        .update({ subtotal, tax_amount: taxAmount, discount_amount: discountAmount, total })
        .eq("id", invoiceId)
        .select()
        .single();
      if (updateError) throw updateError;

      return { invoice: updated as Invoice, previousTotal: round2(current.total || 0) };
    },
    onSuccess: ({ invoice, previousTotal }) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-items", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["financial-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-products"] });
      toast.success("Itens da fatura atualizados");

      emitKernelEvent({
        workspace_id: invoice.workspace_id,
        type: "INVOICE.UPDATED",
        entity_kind: "invoice",
        entity_id: invoice.id,
        actor_type: "user",
        source_module: "billing",
        payload: {
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          total: invoice.total,
          previous_total: previousTotal,
          change: "items_edited",
        },
      });
    },
    onError: (error: Error) => {
      console.warn("[INVOICES] ITEMS_UPDATE_FAILED", error.message);
      toast.error(error.message || "Erro ao atualizar itens da fatura");
    },
  });
}

export function useUpdateInvoice() {

  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateInvoiceInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      toast.success("Fatura atualizada");

      // Kernel event: invoice updated
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: "INVOICE.UPDATED",
        entity_kind: "invoice",
        entity_id: data.id,
        actor_type: "user",
        source_module: "billing",
        payload: { invoice_number: data.invoice_number, status: data.status, total: data.total },
      });
    },
    onError: (error) => {
      console.error("Error updating invoice:", error);
      toast.error("Erro ao atualizar fatura");
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, amount_paid }: { id: string; amount_paid?: number }) => {
      // Get current invoice
      const { data: invoice, error: fetchError } = await workspaceClient
        .from("invoices")
        .select("total")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await workspaceClient
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          amount_paid: amount_paid ?? invoice.total,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      toast.success("Fatura marcada como paga");
      
      // Track payment in GTM
      trackPaymentReceived({
        invoice_id: data.id,
        value: data.total,
        currency: 'EUR',
        customer_id: data.company_id || data.contact_id || data.lead_id || undefined,
        workspace_id: data.workspace_id,
      });

      // Kernel event: invoice paid
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: "INVOICE.PAID",
        entity_kind: "invoice",
        entity_id: data.id,
        actor_type: "user",
        source_module: "billing",
        payload: {
          invoice_number: data.invoice_number,
          total: data.total,
          currency: data.currency,
          company_id: data.company_id,
          opportunity_id: data.opportunity_id,
        },
      });
    },
    onError: (error) => {
      console.error("Error marking invoice as paid:", error);
      toast.error("Erro ao marcar fatura como paga");
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await workspaceClient
        .from("invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      toast.success("Fatura marcada como enviada");

      // Kernel event: invoice sent
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: "INVOICE.SENT",
        entity_kind: "invoice",
        entity_id: data.id,
        actor_type: "user",
        source_module: "billing",
        payload: { invoice_number: data.invoice_number, total: data.total },
      });
    },
    onError: (error) => {
      console.error("Error sending invoice:", error);
      toast.error("Erro ao enviar fatura");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", currentWorkspace?.id] });
      toast.success("Fatura eliminada");
    },
    onError: (error) => {
      console.error("Error deleting invoice:", error);
      toast.error("Erro ao eliminar fatura");
    },
  });
}

// Force invoice status change (super admin only)
export function useForceInvoiceStatus() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const updates: Record<string, any> = { status };

      // Estado atual necessário para acertar o montante recebido.
      const { data: current, error: currentError } = await workspaceClient
        .from("invoices")
        .select("total, amount_paid")
        .eq("id", id)
        .maybeSingle();
      if (currentError) throw currentError;

      // Reset paid fields when moving away from paid
      if (status !== "paid") {
        updates.paid_at = null;
        // Só zera o recebido se o pagamento tinha sido registado pelo próprio estado.
        if (status === "draft" || status === "cancelled") updates.amount_paid = 0;
      }
      // Set paid_at + amount_paid when forcing to paid (KPI "Recebido" usa amount_paid)
      if (status === "paid") {
        updates.paid_at = new Date().toISOString();
        updates.amount_paid = Number((current as any)?.total ?? 0);
      }
      // Set sent_at when forcing to sent
      if (status === "sent") {
        updates.sent_at = new Date().toISOString();
      }

      const { data, error } = await workspaceClient
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      toast.success(`Estado da fatura alterado para "${data.status}"`);

      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: "INVOICE.STATUS_FORCED",
        entity_kind: "invoice",
        entity_id: data.id,
        actor_type: "user",
        source_module: "billing",
        payload: {
          invoice_number: data.invoice_number,
          new_status: data.status,
          forced: true,
        },
      });
    },
    onError: (error) => {
      console.error("Error forcing invoice status:", error);
      toast.error("Erro ao alterar estado da fatura");
    },
  });
}

// Invoice statistics hook
export function useInvoiceStats() {
  const { currentWorkspace } = useWorkspace();
  const { data: invoices } = useInvoices();

  const stats = {
    totalDraft: 0,
    totalSent: 0,
    totalPaid: 0,
    totalOverdue: 0,
    totalPartiallyPaid: 0,
    amountDraft: 0,
    amountSent: 0,
    amountPaid: 0,
    amountOverdue: 0,
    amountPartiallyPaid: 0,
  };

  if (invoices) {
    invoices.forEach((inv) => {
      switch (inv.status) {
        case "draft":
          stats.totalDraft++;
          stats.amountDraft += inv.total;
          break;
        case "sent":
          stats.totalSent++;
          stats.amountSent += inv.total;
          break;
        case "paid":
          stats.totalPaid++;
          stats.amountPaid += inv.total;
          break;
        case "overdue":
          stats.totalOverdue++;
          stats.amountOverdue += inv.total;
          break;
        case "partially_paid":
          stats.totalPartiallyPaid++;
          stats.amountPartiallyPaid += inv.total;
          break;
      }
    });
  }

  return stats;
}
