/**
 * Secção "Contacto 1:1 validado" — ficha de Empresa / Contacto / Lead.
 *
 * Os canais assistidos abrem a composição nativa; o adaptador Zapi tem guardas próprios.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, AlertTriangle, Mail, MessageCircle, Share2, Copy, ExternalLink,
  CheckCircle2, XCircle, Lock, History, Settings2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  OUTREACH_CHANNEL_LABELS, OUTREACH_LEGAL_BASIS,
  type OutreachChannel, type OutreachEntityType,
} from "../types";
import {
  evaluateOutreachEligibility, mailtoLink, useOutreachDraft, useOutreachEvents,
  useOutreachSettings, useOutreachSuppressions, useOutreachUsage, useOutreachValidation,
  useRegisterAssistedSend, useSaveOutreachDraft, useSaveOutreachSettings,
  useSaveOutreachValidation, useToggleOutreachSuppression, useWhatsAppChannelAvailable,
  whatsappDeepLink,
} from "../hooks/useOutreach";
import { OutreachZapiPanel } from "./OutreachZapiPanel";
import { OutreachWhatsAppComposer } from "./OutreachWhatsAppComposer";
import { OutreachWizard } from "./OutreachWizard";
import { activeStopReason, buildOutreachWizard, type OutreachWizardStep } from "../lib/outreachWizard";
import { usePrepareZapiSend, useOutreachSendAttempts } from "../hooks/useOutreachZapi";

const OUTCOME_PT: Record<string, string> = {
  blocked: "bloqueada",
  simulated: "simulada (não enviada)",
  sent: "enviada",
  error: "erro",
};

function localDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}



export interface OutreachOneToOneSectionProps {
  entityType: OutreachEntityType;
  entityId: string;
  entityName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  /** Contexto real já existente na ficha (nunca inventado). */
  companyContextText?: string | null;
  socialUrls?: Array<{ label: string; url: string }>;
  className?: string;
}

const EVENT_LABELS: Record<string, string> = {
  draft_created: "Rascunho criado",
  draft_updated: "Rascunho actualizado",
  reviewed: "Rascunho revisto",
  assisted_send: "Abertura solicitada (envio por confirmar)",
  blocked: "Bloqueado",
  stopped: "Paragem registada",
};

export function OutreachOneToOneSection({
  entityType, entityId, entityName, email, phone, companyId, companyName,
  companyContextText, socialUrls = [], className,
}: OutreachOneToOneSectionProps) {
  const validationQuery = useOutreachValidation(entityType, entityId);
  const validation = validationQuery.data ?? null;
  const saveValidation = useSaveOutreachValidation(entityType, entityId);

  const suppressionsQuery = useOutreachSuppressions(entityType, entityId);
  const suppressions = suppressionsQuery.data ?? [];
  const toggleSuppression = useToggleOutreachSuppression(entityType, entityId);

  const draftQuery = useOutreachDraft(entityType, entityId);
  const draft = draftQuery.data ?? null;
  const saveDraft = useSaveOutreachDraft(entityType, entityId);

  const { effective: limits } = useOutreachSettings();
  const saveSettings = useSaveOutreachSettings();

  const usageQuery = useOutreachUsage(entityType, entityId, companyId ?? (entityType === "company" ? entityId : null));
  const whatsappAvailable = useWhatsAppChannelAvailable().data ?? false;
  const eventsQuery = useOutreachEvents({ entityType, entityId, limit: 30 });
  const registerAssisted = useRegisterAssistedSend(entityType, entityId);
  const prepareZapi = usePrepareZapiSend(entityType, entityId);
  const attemptsQuery = useOutreachSendAttempts(entityType, entityId, 1);
  const lastAttemptOutcome = attemptsQuery.data?.[0]?.outcome ?? null;

  const [tab, setTab] = useState("draft");



  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [context, setContext] = useState("");
  const [valueProp, setValueProp] = useState("");

  useEffect(() => {
    if (!draft) return;
    setSubject(draft.subject ?? "");
    setBody(draft.body ?? "");
    setContext(draft.context_summary ?? "");
    setValueProp(draft.value_proposition ?? "");
  }, [draft?.id, draft?.updated_at]);

  const isValidated = !!validation?.is_validated;
  const allowedChannels = validation?.allowed_channels ?? [];

  const companyScopeId = companyId ?? (entityType === "company" ? entityId : null);

  const toggleChannel = (channel: OutreachChannel, on: boolean) => {
    const next = on
      ? Array.from(new Set([...allowedChannels, channel]))
      : allowedChannels.filter((c) => c !== channel);
    saveValidation.mutate({ allowed_channels: next, is_validated: isValidated });
  };

  /** Rascunho inicial construído apenas com dados reais da ficha. */
  const seedDraft = () => {
    const nome = (entityName ?? "").trim();
    const empresa = (companyName ?? (entityType === "company" ? entityName : "") ?? "").trim();
    const ctx = (companyContextText ?? "").trim();
    const linhas = [
      nome ? `Olá ${nome.split(/\s+/)[0]},` : "Olá,",
      "",
      ctx ? `Sobre ${empresa || "a vossa empresa"}: ${ctx}` : "[Contexto: adicione aqui factos reais recolhidos sobre a empresa]",
      "",
      "[Proposta de valor: descreva em 1-2 frases como podemos ajudar, com base no contexto acima]",
      "",
      "Se preferir não receber contactos, basta dizer e retiramos o registo de imediato.",
    ];
    setSubject(empresa ? `Contacto sobre ${empresa}` : "Contacto");
    setContext(ctx);
    setBody(linhas.join("\n"));
    toast.info("Rascunho base preenchido com dados reais da ficha. Reveja antes de usar.");
  };

  const persistDraft = (status: "draft" | "reviewed") => {
    saveDraft.mutate(
      {
        subject, body, context_summary: context, value_proposition: valueProp,
        status, isNew: !draft, companyId: companyScopeId,
      },
      { onSuccess: () => toast.success(status === "reviewed" ? "Rascunho revisto e aprovado" : "Rascunho guardado") },
    );
  };

  const evalFor = (channel: OutreachChannel) =>
    evaluateOutreachEligibility({
      channel, validation, suppressions, email, phone,
      socialUrl: socialUrls[0]?.url ?? null,
      whatsappAvailable, draft,
      usage: usageQuery.data,
      limits,
    });

  const primaryChannel: OutreachChannel = allowedChannels.includes("whatsapp")
    ? "whatsapp"
    : allowedChannels.includes("email")
      ? "email"
      : (allowedChannels[0] as OutreachChannel) ?? "email";

  const wizard = buildOutreachWizard({
    channel: primaryChannel,
    validation,
    draft,
    suppressions,
    checks: evalFor(primaryChannel).checks,
    lastAttemptOutcome,
  });


  const copyBody = async () => {
    await navigator.clipboard.writeText(body);
    toast.success("Texto copiado");
  };

  const openEmail = () => {
    if (!email) return;
    window.open(mailtoLink(email, subject, body), "_self");
    registerAssisted.mutate({ channel: "email", companyId: companyScopeId, details: { to: email } });
  };

  const openWhatsApp = () => {
    if (!phone) return;
    window.open(whatsappDeepLink(phone, body), "_blank", "noopener");
    registerAssisted.mutate({ channel: "whatsapp", companyId: companyScopeId, details: { mode: "wa.me" } });
  };

  const openSocial = async (url: string) => {
    await navigator.clipboard.writeText(body).catch(() => undefined);
    window.open(url, "_blank", "noopener");
    registerAssisted.mutate({ channel: "social", companyId: companyScopeId, details: { profile: url } });
  };

  const stopActive = suppressions.length > 0;

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Contacto 1:1 validado
            </CardTitle>
            <CardDescription>
              Comunicação personalizada com validação prévia. Abrir um canal não confirma o envio.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isValidated ? "default" : "secondary"}>
              {isValidated ? "Validado" : "Por validar"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/outreach/activity">Centro de comunicações</Link>
            </Button>
          </div>

        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {stopActive && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Contacto interrompido</AlertTitle>
            <AlertDescription>
              Existem paragens activas ({suppressions.map((s) => s.reason).join(", ")}). Nenhum contacto pode ser preparado.
            </AlertDescription>
          </Alert>
        )}

        {/* Validação */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-medium">Marcar como validado</Label>
              <p className="text-xs text-muted-foreground">
                Só depois desta marcação é possível criar rascunho e preparar contacto.
              </p>
            </div>
            <Switch
              checked={isValidated}
              onCheckedChange={(v) => saveValidation.mutate({ is_validated: v })}
              disabled={saveValidation.isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Base legal</Label>
              <Select
                value={validation?.legal_basis ?? ""}
                onValueChange={(v) => saveValidation.mutate({ legal_basis: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar base legal" /></SelectTrigger>
                <SelectContent>
                  {OUTREACH_LEGAL_BASIS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Origem e prova da autorização</Label>
              <Input
                key={`consent-source-${validation?.id ?? "new"}`}
                defaultValue={validation?.consent_source ?? ""}
                placeholder="Ex.: formulário e versão, venda anterior ou fonte do endereço empresarial"
                onBlur={(e) => {
                  if (e.target.value !== (validation?.consent_source ?? "")) {
                    saveValidation.mutate({ consent_source: e.target.value });
                  }
                }}
                maxLength={200}
              />
            </div>
          </div>

          {validation?.legal_basis === "consent" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Data e hora reais do consentimento</Label>
              <Input
                key={`consent-${validation.id}`}
                type="datetime-local"
                defaultValue={localDateTime(validation.consent_recorded_at)}
                onBlur={(e) => saveValidation.mutate({
                  consent_recorded_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })}
              />
              <p className="text-xs text-muted-foreground">Selecionar uma base legal não regista consentimento automaticamente.</p>
            </div>
          )}

          {validation?.legal_basis === "existing_customer" && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Registe a venda anterior na origem acima. Esta via fica limitada a email.</p>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={validation.relationship_kind === "existing_customer"}
                  onCheckedChange={(v) => saveValidation.mutate({ relationship_kind: v ? "existing_customer" : "new" })} />
                Existe relação de clientela anterior
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!validation.analogous_offer_confirmed}
                  onCheckedChange={(v) => saveValidation.mutate({ analogous_offer_confirmed: v })} />
                A oferta é própria e análoga à adquirida
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!validation.optout_at_collection_confirmed}
                  onCheckedChange={(v) => saveValidation.mutate({ optout_at_collection_confirmed: v })} />
                Houve possibilidade de oposição na recolha dos dados
              </label>
            </div>
          )}

          {validation?.legal_basis === "corporate_opt_out" && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Esta via fica limitada a email genérico de pessoa coletiva.</p>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={validation.recipient_category === "corporate"}
                  onCheckedChange={(v) => saveValidation.mutate({ recipient_category: v ? "corporate" : "individual" })} />
                O destinatário é uma pessoa coletiva
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!validation.generic_corporate_address_confirmed}
                  onCheckedChange={(v) => saveValidation.mutate({ generic_corporate_address_confirmed: v })} />
                O endereço é genérico, sem nome de pessoa
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data da consulta à lista DGC</Label>
                  <Input key={`dgc-date-${validation.id}`} type="date" defaultValue={validation.dgc_checked_at?.slice(0, 10) ?? ""}
                    onBlur={(e) => saveValidation.mutate({ dgc_checked_at: e.target.value ? `${e.target.value}T12:00:00.000Z` : null })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Referência da lista consultada</Label>
                  <Input key={`dgc-ref-${validation.id}`} defaultValue={validation.dgc_list_reference ?? ""} maxLength={200}
                    onBlur={(e) => saveValidation.mutate({ dgc_list_reference: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Canais autorizados</Label>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(OUTREACH_CHANNEL_LABELS) as OutreachChannel[]).map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={allowedChannels.includes(ch)}
                    onCheckedChange={(v) => toggleChannel(ch, v)}
                    disabled={!isValidated}
                  />
                  {OUTREACH_CHANNEL_LABELS[ch]}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-4">
            {(["opt_out", "blocked", "replied"] as const).map((reason) => (
              <label key={reason} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={suppressions.some((s) => s.reason === reason)}
                  onCheckedChange={(v) => toggleSuppression.mutate({ reason, active: v })}
                />
                {reason === "opt_out" ? "Opt-out" : reason === "blocked" ? "Bloqueado" : "Já respondeu"}
              </label>
            ))}
          </div>
        </div>

        <OutreachWizard
          steps={wizard.steps}
          progress={wizard.progress}
          onNavigate={(target: OutreachWizardStep["ctaTarget"]) => {
            if (target === "validation") return;
            setTab(target);
          }}
        />

        {!isValidated ? (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Rascunho bloqueado</AlertTitle>
            <AlertDescription>
              Marque a empresa/contacto como validado para desbloquear o rascunho e os canais assistidos.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>

            <TabsList>
              <TabsTrigger value="draft">Rascunho</TabsTrigger>
              <TabsTrigger value="channels">Canais assistidos</TabsTrigger>
              <TabsTrigger value="limits">Limites</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>

            {/* Rascunho */}
            <TabsContent value="draft" className="space-y-3 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={draft?.status === "reviewed" ? "default" : "secondary"}>
                  {draft?.status === "reviewed" ? "Revisto" : draft?.status === "used" ? "Usado" : "Por rever"}
                </Badge>
                <Button size="sm" variant="outline" onClick={seedDraft}>Preencher com dados da ficha</Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contexto da empresa (factos reais)</Label>
                  <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} maxLength={2000} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Proposta de valor</Label>
                  <Textarea value={valueProp} onChange={(e) => setValueProp(e.target.value)} rows={3} maxLength={2000} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mensagem</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={5000} />
                <p className="text-xs text-muted-foreground">
                  Revisão humana obrigatória. Não use conteúdo não verificado.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => persistDraft("draft")} disabled={saveDraft.isPending || !body.trim()}>
                  {saveDraft.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Guardar rascunho
                </Button>
                <Button size="sm" onClick={() => persistDraft("reviewed")} disabled={saveDraft.isPending || !body.trim()}>
                  Marcar como revisto
                </Button>
                <Button size="sm" variant="ghost" onClick={copyBody} disabled={!body.trim()}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            </TabsContent>

            {/* Canais */}
            <TabsContent value="channels" className="space-y-4 pt-4">
              {(Object.keys(OUTREACH_CHANNEL_LABELS) as OutreachChannel[]).map((channel) => {
                const { checks, allowed } = evalFor(channel);
                return (
                  <div key={channel} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {channel === "email" && <Mail className="h-4 w-4" />}
                        {channel === "whatsapp" && <MessageCircle className="h-4 w-4" />}
                        {channel === "social" && <Share2 className="h-4 w-4" />}
                        {OUTREACH_CHANNEL_LABELS[channel]}
                      </span>
                      <Badge variant={allowed ? "default" : "secondary"}>
                        {allowed ? "Pronto" : "Bloqueado"}
                      </Badge>
                    </div>

                    <ul className="space-y-1">
                      {checks.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 text-xs">
                          {c.passed
                            ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                            : <XCircle className={cn("mt-0.5 h-3.5 w-3.5", c.blocking ? "text-destructive" : "text-amber-500")} />}
                          <span className={c.passed ? "text-muted-foreground" : ""}>
                            {c.label}{c.detail ? ` — ${c.detail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {channel === "whatsapp" && !whatsappAvailable && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex flex-wrap items-center gap-2 text-xs">
                          Canal WhatsApp indisponível neste workspace.
                          <Button asChild size="sm" variant="outline">
                            <Link to="/settings/integrations">Ir para Integrações</Link>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {channel === "email" && (
                        <Button size="sm" disabled={!allowed} onClick={openEmail}>
                          <Mail className="mr-2 h-3.5 w-3.5" /> Abrir composição de email
                        </Button>
                      )}
                      {channel === "whatsapp" && (
                        <Button size="sm" disabled={!allowed} onClick={openWhatsApp}>
                          <ExternalLink className="mr-2 h-3.5 w-3.5" /> Abrir WhatsApp com texto
                        </Button>
                      )}

                      {channel === "social" && (
                        socialUrls.length === 0
                          ? <p className="text-xs text-muted-foreground">Sem perfis sociais na ficha.</p>
                          : socialUrls.map((s) => (
                            <Button key={s.url} size="sm" variant="outline" disabled={!allowed} onClick={() => openSocial(s.url)}>
                              <Share2 className="mr-2 h-3.5 w-3.5" /> {s.label} — copiar texto e abrir perfil
                            </Button>
                          ))
                      )}
                    </div>
                    {channel === "whatsapp" && (
                      <>
                        <OutreachWhatsAppComposer
                          phone={phone}
                          phoneSource={entityType === "company" ? "Ficha da empresa" : "Ficha do contacto"}
                          checks={checks}
                          allowed={allowed}
                          draft={draft}
                          usage={usageQuery.data}
                          limits={limits}
                          stopReason={activeStopReason(suppressions)}
                          preparing={prepareZapi.isPending}
                          lastOutcome={lastAttemptOutcome ? OUTCOME_PT[lastAttemptOutcome] ?? lastAttemptOutcome : null}
                          onPrepare={() => prepareZapi.mutate()}
                        />
                        <OutreachZapiPanel entityType={entityType} entityId={entityId} />
                      </>
                    )}

                    <p className="text-xs text-muted-foreground">
                      O botão apenas abre o canal. O envio é manual e fica por confirmar.
                    </p>

                  </div>
                );
              })}
            </TabsContent>

            {/* Limites */}
            <TabsContent value="limits" className="space-y-3 pt-4">
              <LimitsForm
                limits={limits}
                onSave={(scope, values) => saveSettings.mutate({ scope, ...values })}
                saving={saveSettings.isPending}
                usage={usageQuery.data}
              />
            </TabsContent>

            {/* Auditoria */}
            <TabsContent value="audit" className="pt-4">
              <div className="space-y-2">
                {eventsQuery.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
                {!eventsQuery.isLoading && (eventsQuery.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem eventos registados.</p>
                )}
                {(eventsQuery.data ?? []).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      {ev.channel ? ` · ${ev.channel}` : ""}
                      {ev.reason ? ` · ${ev.reason}` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function LimitsForm({
  limits, onSave, saving, usage,
}: {
  limits: { daily_limit: number; per_company_limit: number; cooldown_days: number };
  onSave: (scope: "workspace" | "user", values: { daily_limit: number; per_company_limit: number; cooldown_days: number }) => void;
  saving: boolean;
  usage?: { todayCount: number; companyCount: number; lastContactAt: string | null };
}) {
  const [daily, setDaily] = useState(limits.daily_limit);
  const [perCompany, setPerCompany] = useState(limits.per_company_limit);
  const [cooldown, setCooldown] = useState(limits.cooldown_days);
  const [scope, setScope] = useState<"workspace" | "user">("workspace");

  useEffect(() => {
    setDaily(limits.daily_limit);
    setPerCompany(limits.per_company_limit);
    setCooldown(limits.cooldown_days);
  }, [limits.daily_limit, limits.per_company_limit, limits.cooldown_days]);

  const invalid = useMemo(
    () => daily < 1 || daily > 500 || perCompany < 1 || perCompany > 50 || cooldown < 1 || cooldown > 365,
    [daily, perCompany, cooldown],
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Limite diário</Label>
          <Input type="number" min={1} max={500} value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Limite por empresa (dia)</Label>
          <Input type="number" min={1} max={50} value={perCompany} onChange={(e) => setPerCompany(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cooldown (dias)</Label>
          <Input type="number" min={1} max={365} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={scope} onValueChange={(v) => setScope(v as "workspace" | "user")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">Aplicar ao workspace</SelectItem>
            <SelectItem value="user">Aplicar só a mim</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={saving || invalid}
          onClick={() => onSave(scope, { daily_limit: daily, per_company_limit: perCompany, cooldown_days: cooldown })}
        >
          <Settings2 className="mr-2 h-3.5 w-3.5" /> Guardar limites
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Hoje: {usage?.todayCount ?? 0} pedidos de abertura · esta empresa: {usage?.companyCount ?? 0}
        {usage?.lastContactAt ? ` · último pedido: ${new Date(usage.lastContactAt).toLocaleDateString("pt-PT")}` : ""}
      </p>
    </div>
  );
}

export default OutreachOneToOneSection;
