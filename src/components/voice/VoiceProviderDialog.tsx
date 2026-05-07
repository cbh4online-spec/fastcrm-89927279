/**
 * Provider Form Dialog (Fase 1P.3)
 * UI mostra "FastCRM VoiceHub Provider" — etiquetas internas escondidas onde possível.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpsertVoiceProvider, type VoiceProviderInstance } from "@/hooks/useVoiceHub";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: VoiceProviderInstance | null;
}

const PROVIDERS = [
  { value: "mock", label: "Modo Demonstração" },
  { value: "twilio", label: "Twilio" },
  { value: "nvoip", label: "Nvoip" },
  { value: "threecx", label: "3CX" },
  { value: "sip", label: "SIP genérico" },
];

const ENVS = [
  { value: "demo", label: "Demonstração" },
  { value: "sandbox", label: "Sandbox" },
  { value: "production", label: "Produção" },
];

export function VoiceProviderDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertVoiceProvider();
  const [form, setForm] = useState({
    provider_name: "mock",
    display_name: "",
    environment: "demo",
    base_url: "",
    account_id: "",
    api_key_secret_name: "",
    api_token_secret_name: "",
    webhook_token: "",
    default_country: "PT",
    default_country_code: "+351",
    default_currency: "EUR",
    status: "active",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        provider_name: initial.provider_name,
        display_name: initial.display_name ?? "",
        environment: initial.environment,
        base_url: initial.base_url ?? "",
        account_id: initial.account_id ?? "",
        api_key_secret_name: initial.api_key_secret_name ?? "",
        api_token_secret_name: initial.api_token_secret_name ?? "",
        webhook_token: initial.webhook_token ?? "",
        default_country: initial.default_country,
        default_country_code: initial.default_country_code,
        default_currency: initial.default_currency,
        status: initial.status,
      });
    } else {
      setForm({
        provider_name: "mock",
        display_name: "",
        environment: "demo",
        base_url: "",
        account_id: "",
        api_key_secret_name: "",
        api_token_secret_name: "",
        webhook_token: "",
        default_country: "PT",
        default_country_code: "+351",
        default_currency: "EUR",
        status: "active",
      });
    }
  }, [initial, open]);

  const isReal = form.provider_name !== "mock";

  const handleSave = async () => {
    await upsert.mutateAsync({ id: initial?.id, ...form } as never);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Provider" : "Novo Provider"} VoiceHub</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.provider_name} onValueChange={(v) => setForm({ ...form, provider_name: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENVS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Nome de exibição</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="VoiceHub principal" />
          </div>
          <div className="space-y-2">
            <Label>País padrão</Label>
            <Input value={form.default_country} onChange={(e) => setForm({ ...form, default_country: e.target.value.toUpperCase() })} maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label>Indicativo</Label>
            <Input value={form.default_country_code} onChange={(e) => setForm({ ...form, default_country_code: e.target.value })} placeholder="+351" />
          </div>
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Input value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value.toUpperCase() })} maxLength={3} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isReal && (
            <>
              <div className="col-span-2 pt-2 border-t">
                <p className="text-sm font-medium mb-2">Credenciais (referências a secrets)</p>
                <p className="text-xs text-muted-foreground">As credenciais reais são guardadas em segredo no servidor. Indique apenas o nome do secret.</p>
              </div>
              <div className="space-y-2">
                <Label>Account / SID</Label>
                <Input value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="auto" />
              </div>
              <div className="space-y-2">
                <Label>Nome secret API key</Label>
                <Input value={form.api_key_secret_name} onChange={(e) => setForm({ ...form, api_key_secret_name: e.target.value })} placeholder="TWILIO_API_KEY" />
              </div>
              <div className="space-y-2">
                <Label>Nome secret API token</Label>
                <Input value={form.api_token_secret_name} onChange={(e) => setForm({ ...form, api_token_secret_name: e.target.value })} placeholder="TWILIO_AUTH_TOKEN" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Webhook token</Label>
                <Input value={form.webhook_token} onChange={(e) => setForm({ ...form, webhook_token: e.target.value })} placeholder="token aleatório de validação" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
