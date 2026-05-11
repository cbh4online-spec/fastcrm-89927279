import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type RecurrenceMode = "none" | "daily" | "weekly" | "monthly";

export interface InvoiceScheduledWhatsApp {
  id: string;
  workspace_id: string;
  to_phone: string;
  body: string;
  scheduled_at: string;
  status: string;
  attempts: number;
  last_error: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useInvoiceScheduledWhatsApp(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-scheduled-wa", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [] as InvoiceScheduledWhatsApp[];
      const { data, error } = await supabase
        .from("whatsapp_scheduled_messages" as never)
        .select(
          "id, workspace_id, to_phone, body, scheduled_at, status, attempts, last_error, metadata, created_at",
        )
        .eq("metadata->>invoice_id", invoiceId)
        .in("status", ["pending"])
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceScheduledWhatsApp[];
    },
    enabled: !!invoiceId,
  });
}

export function useScheduleInvoiceWhatsApp() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      phone: string;
      body: string;
      scheduledAt: Date;
      shareUrl: string;
      title?: string | null;
      recurrence: RecurrenceMode;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Sem utilizador autenticado");

      const { error } = await supabase
        .from("whatsapp_scheduled_messages" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: userId,
          to_phone: input.phone,
          body: input.body,
          scheduled_at: input.scheduledAt.toISOString(),
          status: "pending",
          metadata: {
            source: "invoice_payment_link",
            invoice_id: input.invoiceId,
            share_url: input.shareUrl,
            title: input.title ?? null,
            recurrence: input.recurrence,
            consent_confirmed: true,
          },
        } as never);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-scheduled-wa", vars.invoiceId] });
    },
  });
}

export function useCancelScheduledWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from("whatsapp_scheduled_messages" as never)
        .update({ status: "cancelled" } as never)
        .eq("id", input.id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-scheduled-wa", vars.invoiceId] });
    },
  });
}
