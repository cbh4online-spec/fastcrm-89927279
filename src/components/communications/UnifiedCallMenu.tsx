/**
 * Botão único «Ligar» nas fichas (Lead/Contacto/Empresa).
 * Cada opção só aparece quando o canal está ativo (os botões filhos devolvem null caso contrário).
 * Ordem: Z-API (prioritária), CloudTalk, GHL, WhatsApp manual, telefone direto.
 */
import { Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ZapiCallButton } from "@/components/whatsapp-pro/ZapiCallButton";
import { CloudtalkCallButton } from "@/components/integrations/CloudtalkCallButton";
import { GHLCallButton } from "@/components/voice/GHLCallButton";
import { WhatsAppCallButton } from "@/components/voice/WhatsAppCallButton";
import type { WhatsAppCallEntityType } from "@/hooks/useWhatsAppCall";

interface Props {
  phone?: string | null;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string | null;
  contactId?: string;
}

export function UnifiedCallMenu({ phone, entityType, entityId, entityName, contactId }: Props) {
  if (!phone) {
    return (
      <Button variant="outline" disabled className="gap-2" title="Sem número de telefone">
        <Phone className="h-4 w-4" /> Ligar
      </Button>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label="Escolher forma de ligar">
          <Phone className="h-4 w-4" /> Ligar <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 space-y-1">
        <p className="px-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Ligar a {phone}</p>
        <ZapiCallButton phone={phone} contactId={contactId} />
        <CloudtalkCallButton phone={phone} />
        {(entityType === "lead" || entityType === "contact") && (
          <GHLCallButton entityType={entityType} entityId={entityId} entityName={entityName} phone={phone} className="w-full justify-start" />
        )}
        <WhatsAppCallButton
          phone={phone}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName ?? undefined}
          variant="ghost"
          label="Abrir no WhatsApp (manual)"
          className="w-full [&_button]:w-full [&_button]:justify-start [&_span]:w-full"
        />
        <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
          <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /> Telefone direto</a>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
