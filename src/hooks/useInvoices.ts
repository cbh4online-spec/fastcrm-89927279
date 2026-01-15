import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

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
  due_date?: string;
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
          *,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fatura criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Erro ao criar fatura");
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

// Invoice statistics hook
export function useInvoiceStats() {
  const { currentWorkspace } = useWorkspace();
  const { data: invoices } = useInvoices();

  const stats = {
    totalDraft: 0,
    totalSent: 0,
    totalPaid: 0,
    totalOverdue: 0,
    amountDraft: 0,
    amountSent: 0,
    amountPaid: 0,
    amountOverdue: 0,
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
      }
    });
  }

  return stats;
}
