import { Checkbox } from "@/components/ui/checkbox";
import { WHATSAPP_CONSENT_TEXT, WHATSAPP_CONSENT_VERSION, PRIVACY_POLICY_PATH } from "@/lib/whatsapp/consent";

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

/**
 * Checkbox de consentimento WhatsApp — opcional, desmarcado por defeito,
 * nunca ativado automaticamente. A versão do texto é registada como prova.
 */
export function WhatsAppConsentCheckbox({
  checked,
  onCheckedChange,
  id = "whatsapp-consent",
  disabled,
}: Props) {
  const [before, after] = WHATSAPP_CONSENT_TEXT.split("Consulte a nossa Política de Privacidade.");

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
        aria-describedby={`${id}-text`}
      />
      <label htmlFor={id} id={`${id}-text`} className="text-sm leading-relaxed text-muted-foreground cursor-pointer">
        {before}
        Consulte a nossa{" "}
        <a
          href={PRIVACY_POLICY_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          Política de Privacidade
        </a>
        .{after}
        <span className="sr-only"> (versão {WHATSAPP_CONSENT_VERSION})</span>
      </label>
    </div>
  );
}
