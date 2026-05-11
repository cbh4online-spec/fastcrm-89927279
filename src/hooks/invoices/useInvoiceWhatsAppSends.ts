import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface InvoiceWhatsAppSend {
  id: string;
  workspace_id: string;
  invoice_id: string;
  phone: string;
  message_text: string | null;
  share_url: string | null;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  agent_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  metadata: Record<string, unknown>;
}

export function useInvoiceWhatsAppSends(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-whatsapp-sends", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [] as InvoiceWhatsAppSend[];
      const { data, error } = await supabase
        .from("invoice_whatsapp_sends" as never)
        .select(
          "id, workspace_id, invoice_id, phone, message_text, share_url, status, provider_message_id, error_message, agent_id, sent_at, delivered_at, read_at, clicked_at, failed_at, metadata",
        )
        .eq("invoice_id", invoiceId)
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceWhatsAppSend[];
    },
    enabled: !!invoiceId,
  });
}

export function useLogInvoiceWhatsAppSend() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      phone: string;
      messageText: string;
      shareUrl: string;
      status: "sent" | "failed";
      providerMessageId?: string | null;
      errorMessage?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data: userRes } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("invoice_whatsapp_sends" as never)
        .insert({
          workspace_id: currentWorkspace.id,
          invoice_id: input.invoiceId,
          phone: input.phone,
          message_text: input.messageText,
          share_url: input.shareUrl,
          status: input.status,
          provider_message_id: input.providerMessageId ?? null,
          error_message: input.errorMessage ?? null,
          agent_id: userRes?.user?.id ?? null,
          sent_at: now,
          failed_at: input.status === "failed" ? now : null,
          metadata: input.metadata ?? {},
        } as never);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-whatsapp-sends", vars.invoiceId] });
    },
  });
}
