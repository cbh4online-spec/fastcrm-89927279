import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { recordMessage, checkMessageLoop } from "@/lib/inboxSafety";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { generateRequestId } from "@/lib/requestId";

export type MessageDirection = "inbound" | "outbound";

export interface MessageAttachment {
  type: "image" | "file" | "audio" | "video";
  url: string;
  name?: string;
  size?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  workspace_id: string;
  direction: MessageDirection;
  content: string;
  attachments: MessageAttachment[];
  sender_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  email_subject: string | null;
  email_message_id: string | null;
  email_in_reply_to: string | null;
}

export function useMessages(conversationId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("workspace_id", currentWorkspace.id)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Message type
      return (data || []).map((msg) => ({
        ...msg,
        direction: msg.direction as MessageDirection,
        attachments: (msg.attachments || []) as unknown as MessageAttachment[],
      })) as Message[];
    },
    enabled: !!conversationId && !!currentWorkspace,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId || !currentWorkspace) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // delivery / read receipts (✓/✓✓)
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentWorkspace, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient, mainClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachments = [],
      isAutomated = false,
      skipSafetyCheck = false,
    }: {
      conversationId: string;
      content: string;
      attachments?: MessageAttachment[];
      isAutomated?: boolean;
      skipSafetyCheck?: boolean;
    }) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Safety check for automated messages (manual messages are always allowed but tracked)
      if (isAutomated && !skipSafetyCheck) {
        const safetyCheck = checkMessageLoop(conversationId);
        if (!safetyCheck.canExecute) {
          throw new Error(safetyCheck.reason || "Mensagem bloqueada por controlo de segurança");
        }
      }

      // Get conversation to check channel and email details
      const { data: conversation, error: convError } = await workspaceClient
        .from("conversations")
        .select("channel, channel_metadata, external_thread_id, lead:leads(email, ghl_contact_id, phone), contact:contacts(email, ghl_contact_id, phone)")
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;

      // Check if this is a GHL-linked conversation (SMS/WhatsApp/Messenger/Instagram from GHL)
      const channelMeta = conversation.channel_metadata as Record<string, unknown> | null;
      const pickOne = <T,>(v: unknown) => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
      type Party = { email: string | null; ghl_contact_id: string | null; phone: string | null };
      const lead = pickOne<Party>(conversation.lead);
      const contact = pickOne<Party>((conversation as { contact?: unknown }).contact);
      const isGHLConversation = Boolean(
        channelMeta?.source === "ghl" || 
        channelMeta?.source === "ghl_sync" ||
        channelMeta?.ghl_contact_id || 
        lead?.ghl_contact_id ||
        contact?.ghl_contact_id ||
        // Conversas sincronizadas do GHL têm o thread com prefixo "ghl_"
        (typeof conversation.external_thread_id === "string" && conversation.external_thread_id.startsWith("ghl_"))
      );


      // For GHL-linked conversations (SMS, WhatsApp, Instagram, Messenger, Facebook, or "other" with GHL metadata), use the GHL send function
      if (isGHLConversation && ["sms", "whatsapp", "instagram", "messenger", "facebook", "other"].includes(conversation.channel)) {
        const { data, error } = await mainClient.functions.invoke("ghl-send-message", {
          body: { conversationId, message: content, channel: conversation.channel },
        });

        if (error) {
          let errorMsg = "Falha ao enviar mensagem";
          try {
            const ctx = (error as any)?.context;
            if (ctx?.json) {
              const body = await ctx.json();
              errorMsg = body?.error || errorMsg;
            } else if (data?.error) {
              errorMsg = data.error;
            } else {
              errorMsg = error.message || errorMsg;
            }
          } catch {
            errorMsg = data?.error || error.message || errorMsg;
          }
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);

        // Message is saved by the edge function
        return {
          id: data.messageId || crypto.randomUUID(),
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as MessageDirection,
          content,
          attachments: [],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          created_at: new Date().toISOString(),
          email_subject: null,
          email_message_id: null,
          email_in_reply_to: null,
        } as Message;
      }

      // For WhatsApp (Z-API primary, supports DMs and groups)
      if (conversation.channel === "whatsapp" && !isGHLConversation) {
        const isGroup = (channelMeta as any)?.is_group === true;
        const groupId = (channelMeta as any)?.group_id as string | undefined;
        const recipientPhone =
          (channelMeta?.phone as string) ||
          (lead as any)?.phone ||
          (!isGroup ? conversation.external_thread_id : "") ||
          "";

        if (!isGroup && !recipientPhone) {
          throw new Error("Número de telefone não encontrado para esta conversa");
        }
        if (isGroup && !groupId) {
          throw new Error("ID do grupo não encontrado para esta conversa");
        }

        // Fase D: canónico via whatsapp-pro-send
        const { data, error } = await mainClient.functions.invoke("whatsapp-pro-send", {
          body: {
            workspaceId: currentWorkspace.id,
            conversationId,
            ...(isGroup ? { groupId } : { phone: recipientPhone }),
            messageType: "text",
            text: content,
          },
        });

        if (error) {
          let errorMsg = "Falha ao enviar mensagem WhatsApp";
          try {
            const ctx = (error as any)?.context;
            if (ctx?.json) {
              const body = await ctx.json();
              errorMsg = body?.error || errorMsg;
            } else if (data?.error) {
              errorMsg = data.error;
            } else {
              errorMsg = error.message || errorMsg;
            }
          } catch {
            errorMsg = data?.error || error.message || errorMsg;
          }
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);

        // whatsapp-pro-send já persistiu a mensagem outbound e atualizou preview.
        return {
          id: data?.providerMessageId || data?.externalMessageId || crypto.randomUUID(),
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as MessageDirection,
          content,
          attachments: [],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          created_at: new Date().toISOString(),
          email_subject: null,
          email_message_id: null,
          email_in_reply_to: null,
        } as Message;
      }

      // For SMS via Twilio (source = "twilio" in channel_metadata)
      const isTwilioConversation = conversation.channel === "sms" && channelMeta?.source === "twilio";
      if (isTwilioConversation) {
        const recipientPhone =
          (channelMeta?.phone as string) ||
          (lead as any)?.phone ||
          "";

        if (!recipientPhone) {
          throw new Error("Número de telefone não encontrado para esta conversa");
        }

        const { data, error } = await mainClient.functions.invoke("twilio-send-sms", {
          body: {
            workspaceId: currentWorkspace.id,
            conversationId,
            to: recipientPhone,
            message: content,
          },
        });

        if (error) {
          let errorMsg = "Falha ao enviar SMS via Twilio";
          try {
            const ctx = (error as any)?.context;
            if (ctx?.json) {
              const body = await ctx.json();
              errorMsg = body?.error || errorMsg;
            } else if (data?.error) {
              errorMsg = data.error;
            } else {
              errorMsg = error.message || errorMsg;
            }
          } catch {
            errorMsg = data?.error || error.message || errorMsg;
          }
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);

        // Message saved by edge function
        return {
          id: data.messageId || crypto.randomUUID(),
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as MessageDirection,
          content,
          attachments: [],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          created_at: new Date().toISOString(),
          email_subject: null,
          email_message_id: null,
          email_in_reply_to: null,
        } as Message;
      }

      // For Instagram, use the edge function to send via Instagram API
      if (conversation.channel === "instagram") {
        const { data, error } = await mainClient.functions.invoke("instagram-send-message", {
          body: { conversationId, message: content },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Message is saved by the edge function, just invalidate queries
        return {
          id: data.messageId || crypto.randomUUID(),
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as MessageDirection,
          content,
          attachments: [],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          created_at: new Date().toISOString(),
        } as Message;
      }

      // For Email, use the email-send edge function with SMTP
      if (conversation.channel === "email") {
        // Get active email connection
        const { data: emailConnection, error: connError } = await workspaceClient
          .from("email_connections")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("is_active", true)
          .maybeSingle();

        if (connError) throw connError;
        if (!emailConnection) throw new Error("Nenhuma conexão de email ativa configurada");

        // Get recipient email from lead or channel_metadata
        const channelMeta = conversation.channel_metadata as Record<string, unknown> | null;
        const recipientEmail = (conversation.lead as any)?.email || (channelMeta?.from_email as string);
        
        if (!recipientEmail) {
          throw new Error("Não foi possível determinar o email de destino");
        }

        // Get subject from channel_metadata
        const subject = (channelMeta?.subject as string) || "Re: Conversa";

        // Get last inbound message for threading
        const { data: lastInbound } = await workspaceClient
          .from("messages")
          .select("email_message_id, email_references")
          .eq("conversation_id", conversationId)
          .eq("direction", "inbound")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const inReplyTo = lastInbound?.email_message_id || undefined;
        const references = lastInbound?.email_references as string[] | undefined;

        // Load email signature from workspace_settings
        let finalBody = content;
        let finalIsHtml = false;
        try {
          const { data: wsSettings } = await workspaceClient
            .from("workspace_settings")
            .select("email_signature_html")
            .eq("workspace_id", currentWorkspace.id)
            .maybeSingle();
          
          if ((wsSettings as any)?.email_signature_html) {
            const raw = (wsSettings as any).email_signature_html as string;
            let sigHtml: string | null = null;
            try {
              const parsed = JSON.parse(raw);
              sigHtml = parsed.html || null;
            } catch {
              sigHtml = raw;
            }
            if (sigHtml) {
              finalBody = `${content}<br/><br/>--<br/>${sigHtml}`;
              finalIsHtml = true;
            }
          }
        } catch {
          // Signature load failed, send without it
        }

        // Send email via edge function
        const { data, error } = await mainClient.functions.invoke("email-send", {
          body: {
            connectionId: emailConnection.id,
            workspaceId: currentWorkspace.id,
            conversationId,
            to: recipientEmail,
            subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
            body: finalBody,
            isHtml: finalIsHtml,
            inReplyTo,
            references,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Message is saved by the edge function
        return {
          id: data.messageId || crypto.randomUUID(),
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as MessageDirection,
          content,
          attachments: [],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          read_at: null,
          created_at: new Date().toISOString(),
          email_subject: subject,
          email_message_id: null,
          email_in_reply_to: inReplyTo || null,
        } as Message;
      }

      // For other channels, insert message directly
      const { data: message, error: messageError } = await workspaceClient
        .from("messages")
        .insert({
          conversation_id: conversationId,
          workspace_id: currentWorkspace.id,
          direction: "outbound" as const,
          content,
          attachments: attachments as unknown as Record<string, never>[],
          sender_id: user.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversation last_message_at and preview
      const messagePreview = content.substring(0, 100);
      await workspaceClient
        .from("conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_preview: messagePreview,
        })
        .eq("id", conversationId);

      return {
        ...message,
        direction: message.direction as MessageDirection,
        attachments: (message.attachments || []) as unknown as MessageAttachment[],
      } as Message;
    },
    onSuccess: (data, variables) => {
      // Record the message for loop detection
      recordMessage(data.conversation_id, "outbound", variables.isAutomated);
      
      queryClient.refetchQueries({ queryKey: ["messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });

      // Kernel event: message sent
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'MESSAGE.SENT',
          entity_kind: 'message',
          entity_id: data.id,
          actor_type: 'user',
          actor_id: user?.id,
          payload: {
            conversation_id: data.conversation_id,
            direction: 'outbound',
            is_automated: variables.isAutomated || false,
          },
          source_module: 'inbox',
          correlation_id: generateRequestId(),
        });
      }
    },
    onError: (error: Error, variables) => {
      // Import toast from sonner dynamically won't work, so we use a custom event
      // The error is already caught in ConversationDetail.handleSendMessage
      console.error("[useSendMessage] Falha ao enviar:", error.message, "conversationId:", variables.conversationId);
    },
  });
}
