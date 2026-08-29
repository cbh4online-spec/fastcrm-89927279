/**
 * Painel Z-API do "Contacto 1:1 validado".
 *
 * Reutiliza a instância Z-API já ligada ao workspace. Sem segredos no frontend.
 * O botão "Preparar envio via Z-API" apenas revalida no servidor e simula — não envia.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Loader2, Plug, RefreshCw, ShieldAlert, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OutreachEntityType } from "../types";
import {
  useOutreachChannelLink, useOutreachSendAttempts, useOutreachZapiDiagnostic,
  usePrepareZapiSend, useSaveOutreachChannelLink, type OutreachLinkMode,
} from "../hooks/useOutreachZapi";

const OUTCOME_LABELS: Record<string, string> = {
  blocked: "Bloqueado",
  simulated: "Simulado (não enviado)",
  sent: "Enviado",
  error: "Erro",
};

export function OutreachZapiPanel({
  entityType,
  entityId,
  eligible,
}: {
  entityType: OutreachEntityType;
  entityId: string;
  /** Resultado dos checks do outreach no cliente — o servidor revalida sempre. */
  eligible: boolean;
}) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const linkQuery = useOutreachChannelLink();
  const saveLink = useSaveOutreachChannelLink();
  const diagnostic = useOutreachZapiDiagnostic(showDiagnostic);
  const prepare = usePrepareZapiSend(entityType, entityId);
  const attempts = useOutreachSendAttempts(entityType, entityId, 5);

  const link = linkQuery.data;
  const mode: OutreachLinkMode = link?.mode ?? "disabled";
  const enabled = !!link?.enabled;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plug className="h-4 w-4 text-muted-foreground" />
          Canal Z-API do workspace
          <Badge variant={enabled && mode !== "disabled" ? "default" : "secondary"}>
            {enabled ? (mode === "live" ? "Activo (live)" : "Simulação") : "Desligado"}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setShowDiagnostic(true); diagnostic.refetch(); }}
          disabled={diagnostic.isFetching}
        >
          {diagnostic.isFetching
            ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
          Diagnóstico
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="zapi-link-enabled"
            checked={enabled}
            onCheckedChange={(v) => saveLink.mutate({ enabled: v, mode: v && mode === "disabled" ? "simulation" : mode })}
            disabled={saveLink.isPending}
          />
          <Label htmlFor="zapi-link-enabled" className="text-xs">Usar a instância Z-API já ligada</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Modo</Label>
          <Select
            value={mode}
            onValueChange={(v) => saveLink.mutate({ enabled, mode: v as OutreachLinkMode })}
            disabled={!enabled || saveLink.isPending}
          >
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">Desligado</SelectItem>
              <SelectItem value="simulation">Simulação segura</SelectItem>
              <SelectItem value="live">Envio real (por activar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showDiagnostic && diagnostic.data && (
        <div className="grid gap-1 rounded-md border bg-background p-2 text-xs sm:grid-cols-2">
          <span>Instância: <strong>{diagnostic.data.instanceRefMasked ?? "não configurada"}</strong></span>
          <span>Estado do fornecedor: <strong>{diagnostic.data.providerStatus}</strong></span>
          <span>Número: <strong>{diagnostic.data.providerPhoneMasked ?? "—"}</strong></span>
          <span>Webhook: <strong>{diagnostic.data.webhookConfigured ? "configurado" : "por configurar"}</strong></span>
          <span>Segredo do webhook: <strong>{diagnostic.data.webhookSecretConfigured ? "definido" : "em falta"}</strong></span>
          <span>Último evento: <strong>{diagnostic.data.webhookLastReceivedAt
            ? new Date(diagnostic.data.webhookLastReceivedAt).toLocaleString("pt-PT") : "—"}</strong></span>
        </div>
      )}

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" disabled={!eligible || prepare.isPending} onClick={() => prepare.mutate()}>
          {prepare.isPending
            ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            : <Send className="mr-2 h-3.5 w-3.5" />}
          Preparar envio via Z-API
        </Button>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          Simulação segura: revalida tudo no servidor e não contacta o fornecedor.
        </span>
      </div>

      {(attempts.data ?? []).length > 0 && (
        <div className="space-y-1">
          {(attempts.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-2 py-1 text-[11px]">
              <span className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-muted-foreground" />
                {OUTCOME_LABELS[a.outcome] ?? a.outcome}
                {a.blocked_reason ? ` · ${a.blocked_reason}` : ""}
                {a.instance_ref ? ` · ${a.instance_ref}` : ""}
              </span>
              <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-PT")}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Credenciais e webhook vivem apenas no backend.{" "}
        <Link to="/settings/integrations" className="underline">Gerir integração WhatsApp</Link>
      </p>
    </div>
  );
}
