import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { SendProductByWhatsAppDialog } from "./SendProductByWhatsAppDialog";

interface SendProductByWhatsAppButtonProps extends Omit<ButtonProps, "onClick"> {
  productId: string;
  productName?: string;
  productPrice?: number | null;
  productImageUrl?: string | null;
  productLink?: string | null;
  prefillContactId?: string | null;
  prefillConversationId?: string | null;
  prefillPhone?: string | null;
  label?: string;
}

/**
 * Botão reutilizável "Enviar por WhatsApp" para qualquer produto.
 * Usa-se em catálogo, ficha de produto, dentro de uma conversa, etc.
 */
export function SendProductByWhatsAppButton({
  productId,
  productName,
  productPrice,
  productImageUrl,
  productLink,
  prefillContactId,
  prefillConversationId,
  prefillPhone,
  label = "Enviar por WhatsApp",
  variant = "outline",
  size = "sm",
  ...rest
}: SendProductByWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-1.5" {...rest}>
        <MessageCircle className="h-4 w-4 text-emerald-600" />
        {label}
      </Button>
      <SendProductByWhatsAppDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productName={productName}
        productPrice={productPrice}
        productImageUrl={productImageUrl}
        productLink={productLink}
        prefillContactId={prefillContactId}
        prefillConversationId={prefillConversationId}
        prefillPhone={prefillPhone}
      />
    </>
  );
}
