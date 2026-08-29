/**
 * Painel "Canal Z-API do workspace" do módulo "Contacto 1:1 validado".
 *
 * Reutiliza a instância Z-API já ligada ao workspace. Sem segredos no frontend:
 * nenhum token, URL secreta ou detalhe sensível é apresentado.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Loader2, Plug, RefreshCw, ShieldAlert, Info, CircleCheck, CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { resolveConnectionState } from "../lib/outreachWizard";
import {
  useOutreachChannelLink, useOutreachSendAttempts, useOutreachZapiDiagnostic,
  useSaveOutreachChannelLink, type OutreachLinkMode,
} from "../hooks/useOutreachZapi";
import type { OutreachEntityType } from "../types";

const OUTCOME_LABELS: Record<string, string> = {
  blocked: "Bloqueado",
  simulated: "Simulado (não enviado)",
  sent: "Enviado",
  error: "Erro",
};

const STATE_TONE: Record<string, string> = {
  not_configured: "bg-muted text-muted-foreground",
  ready_simulation: "bg-primary/10 text-primary",
  error: "bg-destructive/10 text-destructive",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function OutreachZapiPanel({
  entityType,
  entityId,
}: {
  entityType: OutreachEntityType;
  entityId: string;
}) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const linkQuery = useOutreachChannelLink();
  const saveLink = useSaveOutreachChannelLink();
  const diagnostic = useOutreachZapiDiagnostic(showDiagnostic);
  const attempts = useOutreachSendAttempts(entityType, entityId, 5);

  const link = linkQuery.data;
  const mode: OutreachLinkMode = link?.mode ?? "disabled";
  const enabled = !!link?.enabled;
  const d = diagnostic.data;

  const conn = resolveConnectionState({
    linkEnabled: enabled,
    linkMode: mode,
    providerConfigured: d?.providerConfigured ?? false,
    lastProviderError: d?.lastProviderError ?? null,
  });

  const runTest = () => {
    setShowDiagnostic(true);
    diagnostic.refetch();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plug className="h-4 w-4 text-muted-foreground" aria-hidden />
          Canal Z-API do workspace
          <Badge className={cn("border-0", STATE_TONE[conn.state])}>{conn.label}</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={runTest} disabled={diagnostic.isFetching}>
          {diagnostic.isFetching
            ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
            : <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />}
          Testar configuração
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{conn.hint}</p>

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
          <Label className="text-xs text-muted-foreground" htmlFor="zapi-mode">Modo</Label>
          <Select
            value={mode}
            onValueChange={(v) => saveLink.mutate({ enabled, mode: v as OutreachLinkMode })}
            disabled={!enabled || saveLink.isPending}
          >
            <SelectTrigger id="zapi-mode" className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">Desligado</SelectItem>
              <SelectItem value="simulation">Simulação segura</SelectItem>
              <SelectItem value="live">Envio real (por activar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {diagnostic.isError && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle className="text-sm">Não foi possível obter o diagnóstico</AlertTitle>
          <AlertDescription className="text-xs">
            Tente novamente. Se persistir, confirme com o administrador se a instância está configurada no backend.
          </AlertDescription>
        </Alert>
      )}

      {showDiagnostic && d && (
        <div className="space-y-2">
          <div className="grid gap-1 rounded-md border bg-background p-2 text-xs sm:grid-cols-2">
            <span>Instância: <strong>{d.instanceRefMasked ?? "não configurada"}</strong></span>
            <span>Estado do fornecedor: <strong>{d.providerStatus}</strong></span>
            <span>Número: <strong>{d.providerPhoneMasked ?? "—"}</strong></span>
            <span>Webhook: <strong>{d.webhookConfigured ? "configurado" : "por configurar"}</strong></span>
            <span>Segredo do webhook: <strong>{d.webhookSecretConfigured ? "definido" : "em falta"}</strong></span>
            <span>Último evento: <strong>{d.webhookLastReceivedAt
              ? new Date(d.webhookLastReceivedAt).toLocaleString("pt-PT") : "—"}</strong></span>
          </div>
          {!d.providerConfigured && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm">Sem credenciais configuradas</AlertTitle>
              <AlertDescription className="text-xs">
                O teste não encontrou uma instância activa para este workspace. As credenciais vivem apenas
                no backend e são configuradas pelo administrador em Integrações — nunca são pedidas nem
                mostradas nesta página. Até lá, a preparação funciona em simulação segura.
              </AlertDescription>
            </Alert>
          )}
          {d.providerConfigured && !d.liveDispatchEnabled && (
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CircleCheck className="h-3 w-3" aria-hidden />
              Instância detetada. O envio real continua desativado por decisão de segurança.
            </p>
          )}
        </div>
      )}

      <Separator />

      <div className="inline-flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5" aria-hidden />
        A preparação é sempre revalidada no servidor e nunca contacta o fornecedor nesta fase.
      </div>

      {(attempts.data ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Últimas tentativas</p>
          {(attempts.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-2 py-1 text-[11px]">
              <span className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-muted-foreground" aria-hidden />
                {OUTCOME_LABELS[a.outcome] ?? a.outcome}
                {a.blocked_reason ? ` · ${a.blocked_reason}` : ""}
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
