/**
 * Botão "Ligar por WhatsApp" — reutilizável em Contacto, Lead e Empresa.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle } from "lucide-react";
import { WhatsAppCallDialog } from "./WhatsAppCallDialog";
import {
  normalizeWhatsAppNumber,
  usePendingWhatsAppCalls,
  type WhatsAppCallEntityType,
} from "@/hooks/useWhatsAppCall";
import { Badge } from "@/components/ui/badge";

interface Props {
  phone?: string | null;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  label?: string;
  className?: string;
}

export function WhatsAppCallButton({
  phone,
  entityType,
  entityId,
  entityName,
  variant = "outline",
  size = "sm",
  label = "Ligar por WhatsApp",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const valid = !!normalizeWhatsAppNumber(phone);
  const { data: pending = [] } = usePendingWhatsAppCalls(entityType, entityId);
  const pendingCall = pending.find((c) => c.id === resumeId) ?? null;

  const openNew = () => {
    setResumeId(null);
    setOpen(true);
  };

  const openPending = () => {
    setResumeId(pending[0]?.id ?? null);
    setOpen(true);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant={variant} size={size} onClick={openNew} disabled={!valid} className="gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {size !== "icon" && label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {valid ? "Chamada WhatsApp (sem custos) com registo na atividade" : "Sem número de telefone válido"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {pending.length > 0 && (
        <Button variant="ghost" size="sm" onClick={openPending} className="gap-1 text-amber-600">
          <Badge variant="outline" className="border-amber-500/40 text-amber-600">{pending.length}</Badge>
          Chamada por fechar
        </Button>
      )}

      <WhatsAppCallDialog
        open={open}
        onOpenChange={setOpen}
        phone={phone}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        resumeCall={
          pendingCall
            ? {
                id: pendingCall.id,
                started_at: pendingCall.started_at,
                to_number: pendingCall.to_number,
                from_number: pendingCall.from_number,
              }
            : null
        }
      />
    </div>
  );
}
