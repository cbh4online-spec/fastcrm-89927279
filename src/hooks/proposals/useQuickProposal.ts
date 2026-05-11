import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface QuickProposalLine {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
}

interface QuickProposalInput {
  opportunity_id: string;
  title: string;
  contact_id: string | null;
  company_id: string | null;
  currency: string;
  validity_days: number;
  payment_conditions: string | null;
  lines: QuickProposalLine[];
  send_whatsapp: boolean;
}

const slug = () => {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
};

export function useCreateQuickProposal() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: QuickProposalInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace inválido");
      if (input.lines.length === 0) throw new Error("Adicione pelo menos um produto/serviço");

      const subtotal = input.lines.reduce((a, l) => a + l.quantity * l.unit_price, 0);

      // 1. Criar proposta publicada
      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert({
          workspace_id: currentWorkspace.id,
          opportunity_id: input.opportunity_id,
          slug: slug(),
          title: input.title,
          status: "published",
          published_at: new Date().toISOString(),
          contact_id: input.contact_id,
          company_id: input.company_id,
          currency: input.currency,
          price: subtotal,
          validity_days: input.validity_days,
          payment_conditions: input.payment_conditions,
          expires_at: new Date(Date.now() + input.validity_days * 86400000).toISOString(),
          content_blocks: [],
          variables: {},
          styles: {},
          created_by: user?.id,
        } as never)
        .select("id, slug, public_token")
        .single();

      if (error) throw error;

      // 2. Inserir items
      const itemsPayload = input.lines.map((l, idx) => ({
        proposal_id: proposal.id,
        workspace_id: currentWorkspace.id,
        product_id: l.product_id,
        name: l.name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        position: idx,
      }));
      const { error: itemsErr } = await supabase.from("proposal_items").insert(itemsPayload as never);
      if (itemsErr) throw itemsErr;

      // 3. Enviar WhatsApp (best-effort)
      let whatsapp: { status: string; error?: string } = { status: "skipped" };
      if (input.send_whatsapp && input.contact_id) {
        const { data: c } = await supabase
          .from("contacts")
          .select("name, phone, whatsapp_number")
          .eq("id", input.contact_id)
          .maybeSingle();
        const phone = (c?.whatsapp_number || c?.phone || "").replace(/\D/g, "");
        if (phone.length >= 9) {
          const publicUrl = `${window.location.origin}/p/${proposal.slug}`;
          const total = new Intl.NumberFormat("pt-PT", { style: "currency", currency: input.currency }).format(subtotal);
          const message = `Olá ${c?.name || ""}, segue a proposta "${input.title}" no valor de ${total}. Pode consultar aqui: ${publicUrl}`;
          const { data: waData, error: waErr } = await supabase.functions.invoke("whatsapp-pro-send", {
            body: {
              workspaceId: currentWorkspace.id,
              contactId: input.contact_id,
              phone,
              messageType: "text",
              text: message,
              metadata: { proposal_id: proposal.id, source: "quick_proposal" },
            },
          });
          whatsapp = waErr ? { status: "failed", error: waErr.message } : { status: "sent" };
        } else {
          whatsapp = { status: "failed", error: "Sem WhatsApp no contacto" };
        }
      }

      return { proposalId: proposal.id, slug: proposal.slug, whatsapp, total: subtotal };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["opportunity"] });
      if (res.whatsapp.status === "sent") {
        toast.success("Proposta criada e enviada por WhatsApp ✓");
      } else if (res.whatsapp.status === "failed") {
        toast.warning(`Proposta criada. WhatsApp falhou: ${res.whatsapp.error}`);
      } else {
        toast.success("Proposta criada");
      }
    },
    onError: (e: Error) => {
      toast.error(`Falha: ${e.message}`);
    },
  });
}

export function useAdjudicateOpportunity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      const { data, error } = await supabase.functions.invoke("opportunity-adjudicate", {
        body: { opportunityId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha ao adjudicar");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["opportunity"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      const wa = data.whatsapp?.status;
      const ix = data.invoicexpress?.synced ? "InvoiceXpress sincronizado." : "";
      if (wa === "sent") {
        toast.success(`Fatura ${data.invoiceNumber} enviada por WhatsApp ✓ ${ix}`);
      } else {
        toast.warning(`Fatura ${data.invoiceNumber} criada. WhatsApp: ${data.whatsapp?.error || "não enviado"}`);
      }
    },
    onError: (e: Error) => toast.error(`Falha ao adjudicar: ${e.message}`),
  });
}
