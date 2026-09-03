/**
 * @deprecated Usa `useSendWhatsApp` de `@/modules/whatsapp` (chama `whatsapp-pro-send`).
 * Este hook chama directamente a edge legacy `whatsapp-zapi-send` e será removido.
 * Mantido apenas para envio de notas de voz/grupos enquanto o payload do
 * `whatsapp-pro-send` não cobre esses casos.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export interface SendZapiMessagePayload {
  phone?: string;
  groupId?: string;
  conversationId?: string;
  message?: string;
  media?: {
    type: "image" | "audio" | "video" | "document";
    url: string;
    caption?: string;
    fileName?: string;
  };
  buttons?: { id?: string; label: string }[];
  buttonHeader?: string;
  buttonFooter?: string;
}

export type WhatsAppGroupStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "LEFT"
  | "REMOVED"
  | "SYNC_ERROR"
  | "UNKNOWN";

export interface WhatsAppZapiGroup {
  id: string;
  workspace_id: string;
  provider_instance_id: string | null;
  group_id: string;
  name: string | null;
  description: string | null;
  picture_url: string | null;
  participants_count: number;
  is_admin: boolean;
  is_owner: boolean;
  is_announcement: boolean;
  is_community: boolean;
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  unread_count: number;
  status: WhatsAppGroupStatus;
  sync_error: string | null;
  category: string | null;
  tags: string[];
  last_message_at: string | null;
  last_synced_at: string;
}

export interface WhatsAppGroupParticipant {
  id: string;
  workspace_id: string;
  whatsapp_group_id: string;
  group_id: string;
  participant_id_raw: string;
  normalized_phone: string | null;
  lid: string | null;
  contact_id: string | null;
  lead_id: string | null;
  display_name: string | null;
  is_admin: boolean;
  is_owner: boolean;
  membership_status: string;
  messages_count: number;
  last_message_at: string | null;
}


export function useSendWhatsAppZapi() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: SendZapiMessagePayload) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      // Migrado para whatsapp-pro-send (Fase C). Mantém o tipo público
      // do payload (legacy) mas converte para o formato canónico.
      const media = payload.media;
      const messageType: string = media
        ? (media.type === "image"
            ? "image"
            : media.type === "audio"
            ? "audio"
            : media.type === "video"
            ? "video"
            : "document")
        : "text";

      const { data, error } = await supabase.functions.invoke("whatsapp-pro-send", {
        body: {
          workspaceId: currentWorkspace.id,
          conversationId: payload.conversationId ?? null,
          phone: payload.phone ?? "",
          groupId: payload.groupId ?? null,
          messageType,
          text: payload.message ?? media?.caption,
          mediaUrl: media?.url,
          fileName: media?.fileName,
          buttons: payload.buttons?.map((b) => ({
            id: b.id,
            label: b.label,
          })),
          buttonHeader: payload.buttonHeader,
          buttonFooter: payload.buttonFooter,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        success: !!data?.success,
        conversationId: payload.conversationId ?? null,
        externalMessageId: data?.providerMessageId ?? null,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao enviar: " + err.message);
    },
  });
}

export function useWhatsAppZapiGroups() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["whatsapp-zapi-groups", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("whatsapp_zapi_groups" as any)
        .select("id, workspace_id, group_id, name, description, picture_url, participants_count, is_admin, last_synced_at")
        .eq("workspace_id", currentWorkspace.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown) as WhatsAppZapiGroup[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useSyncWhatsAppZapiGroups() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-sync-groups", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; synced: number; total: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-zapi-groups", currentWorkspace?.id] });
      toast.success(`${data.synced} de ${data.total} grupos sincronizados`);
    },
    onError: (err: Error) => {
      toast.error("Erro a sincronizar grupos: " + err.message);
    },
  });
}
