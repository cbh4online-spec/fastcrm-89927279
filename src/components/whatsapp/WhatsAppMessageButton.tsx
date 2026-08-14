/**
 * Botão "Enviar WhatsApp" — reutilizável em Contacto, Lead e Empresa.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send } from "lucide-react";
import { WhatsAppMessageDialog } from "./WhatsAppMessageDialog";
import { normalizeWhatsAppNumber, type WhatsAppCallEntityType } from "@/hooks/useWhatsAppCall";

interface Props {
  phone?: string | null;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string | null;
  companyName?: string | null;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  label?: string;
  className?: string;
}

export function WhatsAppMessageButton({
  phone,
  entityType,
  entityId,
  entityName,
  companyName,
  variant = "outline",
  size = "sm",
  label = "Enviar WhatsApp",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const valid = !!normalizeWhatsAppNumber(phone);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={className}>
              <Button
                variant={variant}
                size={size}
                onClick={() => setOpen(true)}
                disabled={!valid}
                className="gap-2"
                aria-label={label}
              >
                <Send className="h-4 w-4 text-emerald-600" />
                {size !== "icon" && label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {valid ? "Enviar mensagem WhatsApp com registo na atividade" : "Sem número de telefone válido"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {valid && (
        <WhatsAppMessageDialog
          open={open}
          onOpenChange={setOpen}
          phone={phone}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          companyName={companyName}
        />
      )}
    </>
  );
}
