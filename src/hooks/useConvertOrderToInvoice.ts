import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OrderNote } from "@/types/order-note";
import type { Invoice, CreateInvoiceItemInput } from "@/hooks/useInvoices";
import { toast } from "sonner";

interface ConvertToInvoiceInput {
  order: OrderNote;
  taxRate?: number;
  notes?: string;
  terms?: string;
  dueInDays?: number;
}

export function useConvertOrderToInvoice() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      order,
      taxRate = 23,
      notes,
      terms,
      dueInDays = 30,
    }: ConvertToInvoiceInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");
      if (!order.client_user) throw new Error("Dados do cliente não disponíveis");

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase.rpc(
        "generate_invoice_number",
        { p_workspace_id: currentWorkspace.id }
      );

      if (numberError) throw numberError;

      // Get user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) throw new Error("User not authenticated");

      // Build client address from order
      const billingAddress = order.billing_address || {};
      const clientAddress = [
        billingAddress.street,
        billingAddress.postal_code,
        billingAddress.city,
        billingAddress.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Calculate due date
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          workspace_id: currentWorkspace.id,
          invoice_number: invoiceNumber as string,
          status: "draft",
          client_name: order.client_user.name || "Cliente",
          client_email: order.client_user.email || null,
          client_address: clientAddress || null,
          client_tax_id: order.client_user.tax_id || null,
          issue_date: issueDate.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          subtotal: order.total_net,
          tax_rate: taxRate,
          tax_amount: order.total_vat,
          discount_amount: 0,
          total: order.total_gross,
          currency: order.currency || "EUR",
          notes: notes || `Fatura gerada a partir da Nota de Encomenda #${order.order_number}`,
          terms: terms || null,
          created_by: userId,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from order items
      if (order.items && order.items.length > 0) {
        const invoiceItems = order.items.map((item, index) => ({
          invoice_id: invoice.id,
          product_id: item.product_id || null,
          description: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price_net,
          discount_percent: 0,
          tax_rate: item.vat_rate || taxRate,
          total: item.line_total_gross,
          position: index,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItems);

        if (itemsError) {
          // Rollback: delete the invoice if items fail
          await supabase.from("invoices").delete().eq("id", invoice.id);
          throw itemsError;
        }
      }

      // Update order note status to invoiced and link to invoice
      const { error: orderError } = await supabase
        .from("order_notes")
        .update({
          status: "invoiced",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) {
        console.error("Error updating order status:", orderError);
        // Don't fail the whole operation, invoice was created successfully
      }

      return invoice as Invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      queryClient.invalidateQueries({ queryKey: ["order-note"] });
      toast.success(`Fatura #${invoice.invoice_number} criada com sucesso`);
    },
    onError: (error) => {
      console.error("Error converting order to invoice:", error);
      toast.error("Erro ao converter encomenda para fatura");
    },
  });
}
