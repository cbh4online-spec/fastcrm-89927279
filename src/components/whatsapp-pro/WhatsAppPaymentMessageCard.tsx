import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useWhatsAppSettings,
  useSaveWhatsAppSettings,
  DEFAULT_PAYMENT_LINK_TEMPLATE,
} from "@/hooks/useWhatsAppSettings";
import { renderPaymentMessage } from "@/lib/whatsapp/paymentMessage";

const MAX_LEN = 1000;

const VARIABLES = [
  { key: "{{customer_name}}", label: "Nome do cliente" },
  { key: "{{invoice_number}}", label: "Nº da fatura" },
  { key: "{{amount}}", label: "Valor da fatura" },
  { key: "{{link}}", label: "Link de pagamento" },
];

export function WhatsAppPaymentMessageCard() {
  const { data: settings, isLoading } = useWhatsAppSettings();
  const save = useSaveWhatsAppSettings();

  const [enabled, setEnabled] = useState(true);
  const [template, setTemplate] = useState(DEFAULT_PAYMENT_LINK_TEMPLATE);

  useEffect(() => {
    if (settings) {
      setEnabled(!!settings.payment_link_enabled);
      setTemplate(settings.payment_link_template || DEFAULT_PAYMENT_LINK_TEMPLATE);
    }
  }, [settings]);

  const dirty =
    enabled !== !!settings?.payment_link_enabled ||
    template !== (settings?.payment_link_template || DEFAULT_PAYMENT_LINK_TEMPLATE);

  const valid =
    template.trim().length > 0 &&
    template.trim().length <= MAX_LEN &&
    template.includes("{{link}}");

  const preview = useMemo(
    () =>
      renderPaymentMessage(template, {
        customer_name: "Maria",
        invoice_number: "FA 2026/123",
        amount: "147,50 €",
        link: "https://fastcrm.app/pay/invoice/abc123",
      }),
    [template],
  );

  const handleInsertVariable = (v: string) => {
    setTemplate((t) => `${t}${t.endsWith(" ") || t.length === 0 ? "" : " "}${v}`);
  };

  const handleSave = () => {
    if (!valid) {
      toast.error("O modelo tem de incluir {{link}} e ter até 1000 caracteres.");
      return;
    }
    save.mutate({
      payment_link_enabled: enabled,
      payment_link_template: template.trim(),
    });
  };

  const handleReset = () => {
    setTemplate(DEFAULT_PAYMENT_LINK_TEMPLATE);
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Mensagem do link de pagamento
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Texto enviado automaticamente quando partilha o link de pagamento de uma fatura por WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="wa-pay-enabled" className="text-xs">
            Activo
          </Label>
          <Switch id="wa-pay-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Modelo de mensagem</Label>
          <span className={`text-[11px] ${template.length > MAX_LEN ? "text-destructive" : "text-muted-foreground"}`}>
            {template.length}/{MAX_LEN}
          </span>
        </div>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value.slice(0, MAX_LEN))}
          rows={4}
          disabled={!enabled}
          maxLength={MAX_LEN}
          placeholder={DEFAULT_PAYMENT_LINK_TEMPLATE}
        />
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <Badge
              key={v.key}
              variant="outline"
              className="cursor-pointer hover:bg-accent text-[11px] font-mono"
              onClick={() => enabled && handleInsertVariable(v.key)}
              title={v.label}
            >
              {v.key}
            </Badge>
          ))}
        </div>
        {!template.includes("{{link}}") && (
          <p className="text-[11px] text-destructive">
            O modelo tem obrigatoriamente de incluir <code>{"{{link}}"}</code>.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Pré-visualização</Label>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {preview || <span className="text-muted-foreground italic">Modelo vazio</span>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={save.isPending}>
          <RotateCcw className="w-3 h-3 mr-1.5" /> Repor predefinição
        </Button>
        <Button onClick={handleSave} disabled={!dirty || !valid || save.isPending} size="sm">
          {save.isPending && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </Card>
  );
}
