import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Package } from "lucide-react";
import { useConversation } from "@/hooks/useConversations";
import { SendProductFromConversationDialog } from "@/components/whatsapp-pro/SendProductFromConversationDialog";

interface Props {
  conversationId: string;
  channel: string;
  disabled?: boolean;
}

/**
 * Botão "Enviar produto" para o composer do Inbox.
 * Apenas renderiza para conversas WhatsApp.
 */
export function ConversationSendProductButton({ conversationId, channel, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const { data: conv } = useConversation(open ? conversationId : undefined);

  if (channel !== "whatsapp") return null;

  // Tentar resolver telefone/contact a partir da conversa
  const lead = (conv as { lead?: { id?: string | null; phone?: string | null; contact_id?: string | null } } | undefined)?.lead;
  const channelMeta = (conv as { channel_metadata?: Record<string, unknown> } | undefined)?.channel_metadata;
  const contactId = (lead?.contact_id as string | null) ?? null;
  const phone =
    lead?.phone ??
    (typeof channelMeta?.from_phone === "string" ? (channelMeta.from_phone as string) : null) ??
    (typeof channelMeta?.phone === "string" ? (channelMeta.phone as string) : null) ??
    null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            onClick={() => setOpen(true)}
            disabled={disabled}
            aria-label="Enviar produto"
          >
            <Package className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Enviar produto por WhatsApp</TooltipContent>
      </Tooltip>

      {open && (
        <SendProductFromConversationDialog
          open={open}
          onOpenChange={setOpen}
          conversationId={conversationId}
          contactId={contactId}
          contactPhone={phone}
        />
      )}
    </>
  );
}
