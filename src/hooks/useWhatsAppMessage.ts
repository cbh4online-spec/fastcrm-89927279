/**
 * Envio de mensagens WhatsApp a partir das fichas (Contacto, Lead, Empresa).
 *
 * Canais suportados:
 *  - "pro"   → motor FastCRM WhatsApp Pro (edge function `whatsapp-pro-send`)
 *  - "ghl"   → GoHighLevel (edge function `ghl-send-message`, requer conversa existente)
 *  - "link"  → deep link wa.me (envio assistido, sem confirmação de entrega)
 *
 * Todos os envios ficam registados na timeline (`entity_activities`) da entidade.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeWhatsAppNumber, type WhatsAppCallEntityType } from "@/hooks/useWhatsAppCall";

export type WhatsAppSendChannel = "pro" | "ghl" | "link";

export const WHATSAPP_MESSAGE_MAX_LENGTH = 4000;

const entityColumn: Record<WhatsAppCallEntityType, "contact_id" | "lead_id" | "company_id"> = {
  contact: "contact_id",
  lead: "lead_id",
  company: "company_id",
};

/** Aplica variáveis simples ({{nome}}, {{empresa}}, {{primeiro_nome}}) a um template. */
export function applyTemplateVariables(
  content: string,
  vars: { name?: string | null; company?: string | null },
): string {
  const name = (vars.name ?? "").trim();
  const first = name.split(/\s+/)[0] ?? "";
  const company = (vars.company ?? "").trim();
  return content
    .replace(/\{\{\s*(nome|name|contact_name|cliente)\s*\}\}/gi, name)
    .replace(/\{\{\s*(primeiro_nome|first_name)\s*\}\}/gi, first)
    .replace(/\{\{\s*(empresa|company|company_name)\s*\}\}/gi, company);
}

/**
 * Conversa WhatsApp existente para a entidade (necessária para enviar via GHL).
 */
export function useEntityWhatsAppConversation(
  entityType: WhatsAppCallEntityType,
  entityId?: string,
  phone?: string | null,
) {
  const { currentWorkspace } = useWorkspace();
  const normalized = normalizeWhatsAppNumber(phone);
  return useQuery({
    queryKey: ["entity-whatsapp-conversation", currentWorkspace?.id, entityType, entityId, normalized],
    enabled: !!currentWorkspace?.id && !!entityId,
    queryFn: async () => {
      const column = entityColumn[entityType];
      const { data, error } = await supabase
        .from("conversations")
        .select("id, channel, external_thread_id, last_message_at")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("channel", "whatsapp")
        .eq(column, entityId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as { id: string; channel: string; external_thread_id: string | null };

      if (!normalized) return null;
      const { data: byPhone, error: phoneError } = await supabase
        .from("conversations")
        .select("id, channel, external_thread_id, last_message_at")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("channel", "whatsapp")
        .ilike("external_thread_id", `%${normalized}%`)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (phoneError) throw phoneError;
      return (byPhone ?? null) as { id: string; channel: string; external_thread_id: string | null } | null;
    },
  });
}

/** Canal WhatsApp GHL activo no workspace actual. */
export function useGHLWhatsAppAvailable() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["ghl-whatsapp-active", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("workspace_ghl_social_channels")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace!.id)
        .eq("channel_type", "whatsapp")
        .eq("is_active", true);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

interface SendInput {
  channel: WhatsAppSendChannel;
  message: string;
  phone: string;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string | null;
  conversationId?: string | null;
  templateName?: string | null;
}

const channelLabel: Record<WhatsAppSendChannel, string> = {
  pro: "FastCRM WhatsApp",
  ghl: "WhatsApp (GHL)",
  link: "WhatsApp (envio assistido)",
};

/** Envia (ou regista) a mensagem e escreve na atividade da ficha. */
export function useSendWhatsAppMessage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendInput) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const normalized = normalizeWhatsAppNumber(input.phone);
      if (!normalized) throw new Error("Número de telefone inválido");
      const text = input.message.trim();
      if (!text) throw new Error("Escreva uma mensagem");
      if (text.length > WHATSAPP_MESSAGE_MAX_LENGTH)
        throw new Error(`A mensagem excede ${WHATSAPP_MESSAGE_MAX_LENGTH} caracteres`);

      let providerMessageId: string | null = null;

      if (input.channel === "pro") {
        const { data, error } = await supabase.functions.invoke("whatsapp-pro-send", {
          body: {
            workspaceId: currentWorkspace.id,
            phone: `+${normalized}`,
            messageType: "text",
            text,
            contactId: input.entityType === "contact" ? input.entityId : null,
            conversationId: input.conversationId ?? null,
            metadata: {
              source: "entity_detail",
              entity_type: input.entityType,
              entity_id: input.entityId,
            },
          },
        });
        if (error) throw new Error(await readEdgeError(error, "Falha ao enviar pelo canal FastCRM"));
        if (data?.error) throw new Error(data.error);
        providerMessageId = data?.providerMessageId ?? null;
      }

      if (input.channel === "ghl") {
        if (!input.conversationId)
          throw new Error("Sem conversa WhatsApp no GHL para este contacto. Use 'Abrir no WhatsApp' ou inicie no Inbox.");
        const { data, error } = await supabase.functions.invoke("ghl-send-message", {
          body: { conversationId: input.conversationId, message: text, channel: "whatsapp" },
        });
        if (error) throw new Error(await readEdgeError(error, "Falha ao enviar via GHL"));
        if (data?.error) throw new Error(data.error);
        providerMessageId = data?.messageId ?? null;
      }

      const { error: actError } = await supabase.from("entity_activities").insert({
        workspace_id: currentWorkspace.id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        activity_type: "message_sent",
        title:
          input.channel === "link"
            ? "Mensagem WhatsApp (envio assistido)"
            : `Mensagem WhatsApp enviada — ${channelLabel[input.channel]}`,
        description: [
          `Para +${normalized}`,
          input.templateName ? `template ${input.templateName}` : null,
          text.length > 280 ? `${text.slice(0, 280)}…` : text,
        ]
          .filter(Boolean)
          .join(" · "),
        metadata: {
          channel: "whatsapp",
          send_channel: input.channel,
          to_number: `+${normalized}`,
          provider_message_id: providerMessageId,
          template_name: input.templateName ?? null,
          assisted: input.channel === "link",
          message: text,
        },
        related_type: input.conversationId ? "conversation" : null,
        related_id: input.conversationId ?? null,
        created_by: user?.id ?? null,
      } as never);
      if (actError) throw actError;

      return { providerMessageId };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entity-activities"] });
      qc.invalidateQueries({ queryKey: ["entity-timeline"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages"] });
      toast.success(
        vars.channel === "link"
          ? "WhatsApp aberto e registo criado na atividade"
          : "Mensagem enviada e registada na atividade",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

async function readEdgeError(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context;
    if (ctx?.json) {
      const body = await ctx.json();
      if (body?.error) return body.error;
    }
  } catch {
    /* ignore */
  }
  return (error as Error)?.message || fallback;
}
