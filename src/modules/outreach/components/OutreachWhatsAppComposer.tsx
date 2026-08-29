/**
 * Compositor de WhatsApp assistido.
 * Nunca envia: apresenta destinatário mascarado, elegibilidade em tempo real,
 * limites/cooldown, pré-visualização do rascunho revisto e simulação segura.
 */
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Send, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { maskPhone } from "../lib/mask";
import type { OutreachCheck, OutreachDraft } from "../types";

export interface WhatsAppComposerProps {
  phone?: string | null;
  /** Origem do número (ex.: "Ficha do contacto", "Empresa associada"). */
  phoneSource: string;
  checks: OutreachCheck[];
  allowed: boolean;
  draft: OutreachDraft | null;
  usage?: { todayCount: number; companyCount: number; lastContactAt: string | null };
  limits: { daily_limit: number; per_company_limit: number; cooldown_days: number };
  stopReason?: string | null;
  preparing: boolean;
  lastOutcome?: string | null;
  onPrepare: () => void;
}

export function OutreachWhatsAppComposer({
  phone, phoneSource, checks, allowed, draft, usage, limits,
  stopReason, preparing, lastOutcome, onPrepare,
}: WhatsAppComposerProps) {
  const reviewed = draft?.status === "reviewed" || draft?.status === "used";
  const cooldownLeft = (() => {
    if (!usage?.lastContactAt) return 0;
    const elapsed = Date.now() - new Date(usage.lastContactAt).getTime();
    const left = limits.cooldown_days * 86400000 - elapsed;
    return left > 0 ? Math.ceil(left / 86400000) : 0;
  })();

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">Destinatário:</span>{" "}
          <span className="font-mono">{maskPhone(phone)}</span>
          <span className="ml-2 text-xs text-muted-foreground">({phoneSource})</span>
        </div>
        <Badge variant={allowed ? "default" : "secondary"}>{allowed ? "Elegível" : "Bloqueado"}</Badge>
      </div>

      {stopReason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contacto interrompido</AlertTitle>
          <AlertDescription className="text-xs">{stopReason}</AlertDescription>
        </Alert>
      )}

      <ul className="space-y-1" aria-label="Verificações de elegibilidade">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs">
            {c.passed ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden />
            ) : (
              <XCircle
                className={cn("mt-0.5 h-3.5 w-3.5", c.blocking ? "text-destructive" : "text-amber-500")}
                aria-hidden
              />
            )}
            <span className={c.passed ? "text-muted-foreground" : ""}>
              {c.label}
              {c.detail ? ` — ${c.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 rounded-md border bg-muted/30 p-2 text-xs sm:grid-cols-3">
        <span>Hoje: <strong>{usage?.todayCount ?? 0}/{limits.daily_limit}</strong></span>
        <span>Esta empresa: <strong>{usage?.companyCount ?? 0}/{limits.per_company_limit}</strong></span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {cooldownLeft > 0 ? `Cooldown: faltam ${cooldownLeft} dia(s)` : `Cooldown de ${limits.cooldown_days} dias cumprido`}
        </span>
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-xs font-medium">Pré-visualização do rascunho {reviewed ? "revisto" : "(por rever)"}</p>
        {draft?.body?.trim() ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-2 text-xs">
            {draft.body}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">Ainda não existe rascunho para pré-visualizar.</p>
        )}
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle className="text-sm">Simulação — não envia mensagem</AlertTitle>
        <AlertDescription className="text-xs">
          A preparação revalida todas as regras no servidor e regista a tentativa no histórico. Nenhuma
          mensagem é entregue e o fornecedor não é contactado.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onPrepare} disabled={!allowed || preparing}>
          {preparing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
          Preparar simulação
        </Button>
        {lastOutcome && (
          <span className="text-xs text-muted-foreground">Última tentativa: {lastOutcome}</span>
        )}
      </div>
    </div>
  );
}

export default OutreachWhatsAppComposer;
