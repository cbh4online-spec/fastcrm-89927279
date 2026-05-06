import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw, Plug, ShieldCheck, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppProviderInstance } from "@/hooks/useWhatsAppPro";
import { useRegenerateWebhookToken, useTestProviderConnection } from "@/hooks/useWhatsAppProOps";
import { buildWebhookUrl } from "@/integrations/whatsapp/providers";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function WhatsAppProviderConfigCard() {
  const { data: instance } = useWhatsAppProviderInstance();
  const regen = useRegenerateWebhookToken();
  const test = useTestProviderConnection();
  const [showToken, setShowToken] = useState(false);

  const inst = instance as (typeof instance & {
    webhook_token?: string | null;
    environment?: string;
    webhook_last_received_at?: string | null;
    webhook_last_error?: string | null;
  }) | null | undefined;

  const webhookUrl = inst
    ? buildWebhookUrl({
        supabaseUrl: SUPABASE_URL,
        provider: inst.provider_name ?? "zapi",
        workspaceId: inst.workspace_id,
        instanceId: inst.id,
        webhookToken: inst.webhook_token ?? undefined,
      })
    : "";

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plug className="h-4 w-4" /> Fornecedor WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configuração técnica de ligação ao canal. Invisível para o cliente final.
          </p>
        </div>
        <Badge variant={inst?.active ? "default" : "secondary"} className={inst?.active ? "bg-emerald-500" : ""}>
          <ShieldCheck className="h-3 w-3 mr-1" />
          {inst?.active ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          O fornecedor técnico é usado apenas para ligação operacional. O cliente final verá sempre <strong>FastCRM WhatsApp Pro</strong>.
        </AlertDescription>
      </Alert>

      {!inst ? (
        <p className="text-sm text-muted-foreground">
          Sem instância configurada. Conecte o WhatsApp em <strong>Integrações</strong> para inicializar.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FieldRow label="Provider interno" value={inst.provider_name ?? "—"} />
            <FieldRow label="Display" value={inst.display_name ?? "—"} />
            <FieldRow label="País / Indicativo" value={`${inst.default_country} (${inst.default_country_code})`} />
            <FieldRow label="Ambiente" value={inst.environment ?? "production"} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(webhookUrl, "URL")} aria-label="Copiar URL">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cole esta URL no painel do fornecedor para receber eventos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Webhook Token</Label>
            <div className="flex gap-2">
              <Input
                value={inst.webhook_token ?? ""}
                readOnly
                type={showToken ? "text" : "password"}
                className="font-mono text-xs"
              />
              <Button size="icon" variant="outline" onClick={() => setShowToken((v) => !v)} aria-label="Mostrar token">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="outline" onClick={() => copy(inst.webhook_token ?? "", "Token")} aria-label="Copiar token">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => regen.mutate(inst.id)}
                disabled={regen.isPending}
                aria-label="Regenerar token"
              >
                <RefreshCw className={`h-4 w-4 ${regen.isPending ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-xs">
            <FieldRow
              label="Último evento recebido"
              value={
                inst.webhook_last_received_at
                  ? new Date(inst.webhook_last_received_at).toLocaleString("pt-PT")
                  : "—"
              }
            />
            <FieldRow label="Último erro" value={inst.webhook_last_error ?? "—"} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => test.mutate()} disabled={test.isPending} size="sm" variant="outline">
              Testar ligação
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  );
}
