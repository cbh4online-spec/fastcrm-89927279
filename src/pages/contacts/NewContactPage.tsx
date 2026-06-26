import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, X, AlertTriangle, User, ArrowRight } from "lucide-react";

import { IXFormLayout } from "@/components/forms/IXFormLayout";
import { IXFormSection } from "@/components/forms/IXFormSection";
import { IXField } from "@/components/forms/IXField";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CustomFieldsFormCreate, CustomFieldsFormCreateRef, type AIAutofillResult } from "@/components/custom-fields/CustomFieldsForm";
import { AIAutofillPreviewDialog } from "@/components/custom-fields/AIAutofillPreviewDialog";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { isValidPhone, toE164 } from "@/utils/phone";
import { useContactEnrichment, type ContactEnrichmentResult } from "@/hooks/useContactEnrichment";
import { useContactDuplicateCheck, type DuplicateMatch } from "@/hooks/useContactDuplicates";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().trim().max(100),
  tax_id: z.string().trim().max(20).optional().or(z.literal("")),
  external_code: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

const VAT_EXEMPTIONS = [
  { value: "none", label: "Sem isenção" },
  { value: "M01", label: "M01 – Artigo 16.º, n.º 6 do CIVA" },
  { value: "M02", label: "M02 – Artigo 6.º do DL 198/90" },
  { value: "M04", label: "M04 – Isento – Art. 13.º do CIVA" },
  { value: "M05", label: "M05 – Isento – Art. 14.º do CIVA" },
  { value: "M06", label: "M06 – Isento – Art. 15.º do CIVA" },
  { value: "M07", label: "M07 – Isento – Art. 9.º do CIVA" },
  { value: "M10", label: "M10 – Regime de isenção – Art. 53.º" },
  { value: "M16", label: "M16 – Isento – Art. 14.º RITI" },
];

const PAYMENT_METHODS = [
  "Transferência bancária ou débito direto autorizado",
  "Multibanco",
  "MB Way",
  "Dinheiro",
  "Cheque",
  "Cartão de crédito",
  "Outro",
];

const PAYMENT_TERMS = [
  "Pronto Pagamento",
  "15 dias",
  "30 dias",
  "45 dias",
  "60 dias",
  "90 dias",
];

const LANGUAGES = ["Português", "English", "Español", "Français"];
const CURRENCIES = ["Euro (€)", "Dólar (USD)", "Libra (GBP)", "Real (BRL)"];
const COPIES = ["Original", "Original + Duplicado", "Original + 2 Cópias"];

function EnrichmentSuggestion({
  label,
  field,
  onAccept,
  onReject,
}: {
  label: string;
  field: { value: string; confidence: "high" | "medium" | "low"; source: string };
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="truncate text-sm font-medium">{field.value}</span>
        <Badge variant="secondary" className="h-5 text-[10px]">{field.source}</Badge>
      </div>
      <div className="ml-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={onAccept}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onReject}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DuplicateWarning({
  duplicates,
  onUseExisting,
  onContinue,
}: {
  duplicates: DuplicateMatch[];
  onUseExisting: (id: string) => void;
  onContinue: () => void;
}) {
  const blocking = duplicates.filter((d) => d.isBlockingDuplicate);
  const hasBlocking = blocking.length > 0;
  return (
    <Card className={cn(
      "p-3",
      hasBlocking ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-50/50",
    )}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", hasBlocking ? "text-destructive" : "text-amber-600")} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", hasBlocking ? "text-destructive" : "text-amber-800")}>
            {hasBlocking ? "Já existe um contacto com estes dados" : "Possível duplicado encontrado"}
          </p>
          <div className="mt-2 space-y-2">
            {duplicates.slice(0, 3).map((dup) => (
              <div key={dup.contact.id} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{dup.contact.name}</span>
                  <Badge variant={dup.isBlockingDuplicate ? "destructive" : "outline"} className="text-[10px]">
                    {dup.matchType}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={() => onUseExisting(dup.contact.id)}>
                  Ver <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          {!hasBlocking && (
            <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs text-amber-700" onClick={onContinue}>
              Criar mesmo assim
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function NewContactPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const enrichContact = useContactEnrichment();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<ContactEnrichmentResult | null>(null);
  const [showEnrichPrompt, setShowEnrichPrompt] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const [previewResults, setPreviewResults] = useState<AIAutofillResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingEntityId, setPendingEntityId] = useState<string | null>(null);
  const [isApplyingPreview, setIsApplyingPreview] = useState(false);

  const [form, setForm] = useState({
    // Informação Fiscal
    nif_country: "PT",
    tax_id: "",
    external_code: "",
    is_final_consumer: false,
    name: "",
    // Detalhes
    email: "",
    phone: "",
    address: "",
    phone_mobile: "",
    city: "",
    postal_code: "",
    website: "",
    // Contacto Preferencial
    preferred_contact_name: "",
    preferred_contact_email: "",
    preferred_contact_phone: "",
    // Faturação
    use_account_defaults: true,
    vat_exemption_reason: "none",
    payment_method: PAYMENT_METHODS[0],
    language: LANGUAGES[0],
    currency: CURRENCIES[0],
    payment_terms: PAYMENT_TERMS[0],
    copies: COPIES[0],
    billing_notes: "",
    // Extras CRM
    company: "",
    job_title: "",
    tags: "",
    notes: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const { data: duplicates = [] } = useContactDuplicateCheck(form.name, form.email, form.phone);

  useEffect(() => {
    const has = form.email.includes("@") || form.phone.length >= 9;
    if (has && !enrichmentResult && !isEnriching) setShowEnrichPrompt(true);
    else if (!has) setShowEnrichPrompt(false);
  }, [form.email, form.phone, enrichmentResult, isEnriching]);

  const handleEnrich = async () => {
    setIsEnriching(true);
    setShowEnrichPrompt(false);
    try {
      const r = await enrichContact.mutateAsync({ name: form.name, email: form.email, phone: form.phone });
      if (r) {
        setEnrichmentResult(r);
        toast.success("Dados enriquecidos");
      }
    } catch {
      toast.error("Erro ao enriquecer");
    } finally {
      setIsEnriching(false);
    }
  };

  const canSubmit = useMemo(() => {
    const hasMin = form.name.trim() || form.email.trim() || form.phone.trim();
    return !!hasMin;
  }, [form.name, form.email, form.phone]);

  const handleSubmit = async () => {
    if (!currentWorkspace || !user) {
      toast.error("Sessão inválida");
      return;
    }

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }

    if (form.phone && !isValidPhone(form.phone)) {
      toast.error("Número de telefone inválido");
      return;
    }

    const blocking = duplicates.filter((d) => d.isBlockingDuplicate);
    if (blocking.length > 0) {
      toast.error("Já existe um contacto com estes dados");
      return;
    }
    const warnings = duplicates.filter((d) => !d.isBlockingDuplicate);
    if (warnings.length > 0 && !dismissedDuplicates) return;

    setIsSubmitting(true);
    try {
      const billing_preferences = {
        use_account_defaults: form.use_account_defaults,
        vat_exemption_reason: form.vat_exemption_reason,
        payment_method: form.payment_method,
        language: form.language,
        currency: form.currency,
        payment_terms: form.payment_terms,
        copies: form.copies,
        notes: form.billing_notes || null,
      };

      const insertPayload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        name: form.name.trim() || form.email.split("@")[0] || "Contacto",
        email: form.email.trim() || null,
        phone: form.phone.trim() ? (toE164(form.phone.trim()) ?? form.phone.trim()) : null,
        company: form.company.trim() || null,
        job_title: form.job_title.trim() || null,
        notes: form.notes.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        tax_id: form.tax_id.trim() || null,
        nif_country: form.nif_country || "PT",
        external_code: form.external_code.trim() || null,
        is_final_consumer: form.is_final_consumer,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        website: form.website.trim() || null,
        preferred_contact_name: form.preferred_contact_name.trim() || null,
        preferred_contact_email: form.preferred_contact_email.trim() || null,
        preferred_contact_phone: form.preferred_contact_phone.trim() || null,
        billing_preferences,
      };

      const { data: created, error } = await workspaceClient
        .from("contacts")
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          if ((error.message || "").includes("email")) toast.error("Já existe um contacto com este email");
          else if ((error.message || "").includes("tax_id")) toast.error("Já existe um contacto com este NIF");
          else toast.error("Já existe um contacto com estes dados");
        } else {
          toast.error("Erro ao criar contacto");
          console.warn("[NEW_CONTACT] insert failed", error);
        }
        return;
      }

      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: "CONTACT.CREATED",
        entity_kind: "contact",
        entity_id: (created as { id: string }).id,
        source_module: "crm-contacts",
        payload: { has_email: !!form.email, has_tax_id: !!form.tax_id, source: "ix-new-page" },
      });

      // Custom fields + autofill IA
      if ((created as { id: string }).id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields((created as { id: string }).id);
        const ai = await customFieldsRef.current.runAIAutofill((created as { id: string }).id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          job_title: form.job_title,
          notes: form.notes,
        });
        if (ai.length > 0) {
          setPendingEntityId((created as { id: string }).id);
          setPreviewResults(ai);
          setShowPreview(true);
          toast.success("Contacto criado");
          return; // espera preview
        }
      }

      toast.success("Contacto criado");
      navigate(`/dashboard/contacts/${(created as { id: string }).id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <IXFormLayout
        title="Novo Contacto"
        backTo="/dashboard/contacts"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
      >
        {/* Informação Fiscal */}
        <IXFormSection
          title="Informação Fiscal"
          description="Estes dados serão incluídos em todos os documentos emitidos e comunicações com o Estado."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <IXField label="NIF" htmlFor="tax_id">
              <div className="flex gap-2">
                <Select value={form.nif_country} onValueChange={(v) => update("nif_country", v)}>
                  <SelectTrigger className="w-28 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT">🇵🇹 PT</SelectItem>
                    <SelectItem value="ES">🇪🇸 ES</SelectItem>
                    <SelectItem value="FR">🇫🇷 FR</SelectItem>
                    <SelectItem value="GB">🇬🇧 GB</SelectItem>
                    <SelectItem value="BR">🇧🇷 BR</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="tax_id"
                  className="rounded-full"
                  value={form.tax_id}
                  onChange={(e) => update("tax_id", e.target.value)}
                  placeholder="123456789"
                />
              </div>
            </IXField>
            <IXField label="Código" htmlFor="external_code">
              <Input
                id="external_code"
                className="rounded-full"
                value={form.external_code}
                onChange={(e) => update("external_code", e.target.value)}
                placeholder="Código interno (opcional)"
              />
            </IXField>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Switch
              id="final-consumer"
              checked={form.is_final_consumer}
              onCheckedChange={(v) => update("is_final_consumer", v)}
            />
            <label htmlFor="final-consumer" className="text-sm font-medium">
              Consumidor final
            </label>
          </div>
          <div className="mt-6">
            <IXField
              label="Nome"
              htmlFor="name"
              required
              counter={{ value: form.name.length, max: 100 }}
            >
              <Input
                id="name"
                className="rounded-full"
                value={form.name}
                onChange={(e) => update("name", e.target.value.slice(0, 100))}
                placeholder="Nome do contacto"
              />
            </IXField>
          </div>
          <p className="mt-4 text-right text-xs italic text-primary">*Campo obrigatório</p>
        </IXFormSection>

        {/* Enrich + duplicados (acima da próxima secção) */}
        {showEnrichPrompt && !isEnriching && (
          <Card className="border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">Posso completar este contacto automaticamente. Queres?</span>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowEnrichPrompt(false)}>Não</Button>
                <Button type="button" size="sm" onClick={handleEnrich}>Sim</Button>
              </div>
            </div>
          </Card>
        )}
        {isEnriching && (
          <Card className="border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">A analisar informações…</span>
            </div>
          </Card>
        )}
        {enrichmentResult && (
          <div className="space-y-2">
            <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Sugestões
            </p>
            <div className="space-y-1.5">
              {enrichmentResult.company && (
                <EnrichmentSuggestion
                  label="Empresa"
                  field={enrichmentResult.company}
                  onAccept={() => { update("company", enrichmentResult.company!.value); setEnrichmentResult({ ...enrichmentResult, company: undefined }); }}
                  onReject={() => setEnrichmentResult({ ...enrichmentResult, company: undefined })}
                />
              )}
              {enrichmentResult.jobTitle && (
                <EnrichmentSuggestion
                  label="Cargo"
                  field={enrichmentResult.jobTitle}
                  onAccept={() => { update("job_title", enrichmentResult.jobTitle!.value); setEnrichmentResult({ ...enrichmentResult, jobTitle: undefined }); }}
                  onReject={() => setEnrichmentResult({ ...enrichmentResult, jobTitle: undefined })}
                />
              )}
            </div>
          </div>
        )}
        {duplicates.length > 0 && !dismissedDuplicates && (
          <DuplicateWarning
            duplicates={duplicates}
            onUseExisting={(id) => navigate(`/dashboard/contacts/${id}`)}
            onContinue={() => setDismissedDuplicates(true)}
          />
        )}

        {/* Detalhes */}
        <IXFormSection
          title="Detalhes"
          description="Estes serão os detalhes incluídos em todos os documentos."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <IXField label="E-mail" htmlFor="email">
              <Input id="email" type="email" className="rounded-full" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="nome@empresa.pt" />
            </IXField>
            <IXField label="Telefone">
              <PhoneInput value={form.phone} onChange={(v) => update("phone", v)} placeholder="+351 912 345 678" />
            </IXField>
            <IXField label="Morada" htmlFor="address" counter={{ value: form.address.length, max: 200 }} className="md:col-span-1">
              <Textarea id="address" className="min-h-[120px] rounded-2xl" value={form.address} onChange={(e) => update("address", e.target.value.slice(0, 200))} />
            </IXField>
            <IXField label="Telemóvel">
              <PhoneInput value={form.phone_mobile} onChange={(v) => update("phone_mobile", v)} placeholder="+351 912 345 678" />
            </IXField>
            <IXField label="Cidade" htmlFor="city">
              <Input id="city" className="rounded-full" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </IXField>
            <IXField label="Código Postal" htmlFor="postal_code">
              <Input id="postal_code" className="rounded-full" value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="0000-000" />
            </IXField>
            <IXField label="Website" htmlFor="website" className="md:col-span-2">
              <Input id="website" className="rounded-full" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
            </IXField>
          </div>
        </IXFormSection>

        {/* Contacto Preferencial */}
        <IXFormSection
          title="Contacto Preferencial"
          description="Estas serão as definições usadas para o envio de documentos por e-mail."
        >
          <IXField label="Nome" htmlFor="pref-name">
            <Input id="pref-name" className="rounded-full" value={form.preferred_contact_name} onChange={(e) => update("preferred_contact_name", e.target.value)} />
          </IXField>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <IXField label="E-mail" htmlFor="pref-email">
              <Input id="pref-email" type="email" className="rounded-full" value={form.preferred_contact_email} onChange={(e) => update("preferred_contact_email", e.target.value)} />
            </IXField>
            <IXField label="Telefone">
              <PhoneInput value={form.preferred_contact_phone} onChange={(v) => update("preferred_contact_phone", v)} />
            </IXField>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Para adicionar mais de um e-mail, separe-os com vírgula. (Ex.: primeiro@email.com, segundo@email.com)
          </p>
        </IXFormSection>

        {/* Preferências de Faturação */}
        <IXFormSection
          title="Preferências de Faturação"
          description="Estas serão as definições usadas em todos os documentos que emitir para este contacto."
        >
          <div className="mb-6 flex items-center gap-3">
            <Checkbox
              id="use-account"
              checked={form.use_account_defaults}
              onCheckedChange={(v) => update("use_account_defaults", !!v)}
            />
            <label htmlFor="use-account" className="text-sm font-medium">Usar definições de conta</label>
          </div>
          <fieldset disabled={form.use_account_defaults} className="grid gap-6 md:grid-cols-2 disabled:opacity-60">
            <IXField label="Razão de Isenção de IVA">
              <Select value={form.vat_exemption_reason} onValueChange={(v) => update("vat_exemption_reason", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_EXEMPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField label="Meio de Pagamento">
              <Select value={form.payment_method} onValueChange={(v) => update("payment_method", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField label="Idioma">
              <Select value={form.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField label="Moeda">
              <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField label="Dias de Pagamento">
              <Select value={form.payment_terms} onValueChange={(v) => update("payment_terms", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField label="Nº de cópias">
              <Select value={form.copies} onValueChange={(v) => update("copies", v)}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COPIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </IXField>
            <IXField
              label="Observações"
              counter={{ value: form.billing_notes.length, max: 200 }}
              className="md:col-span-2"
            >
              <Textarea
                value={form.billing_notes}
                onChange={(e) => update("billing_notes", e.target.value.slice(0, 200))}
                className="min-h-[140px] rounded-2xl"
              />
            </IXField>
          </fieldset>
        </IXFormSection>

        {/* Extras CRM (mantém funcionalidades existentes) */}
        <IXFormSection title="CRM" description="Informação interna para gestão comercial.">
          <div className="grid gap-6 md:grid-cols-2">
            <IXField label="Empresa" htmlFor="company">
              <Input id="company" className="rounded-full" value={form.company} onChange={(e) => update("company", e.target.value)} />
            </IXField>
            <IXField label="Cargo" htmlFor="job_title">
              <Input id="job_title" className="rounded-full" value={form.job_title} onChange={(e) => update("job_title", e.target.value)} />
            </IXField>
            <IXField label="Tags (separadas por vírgula)" htmlFor="tags" className="md:col-span-2">
              <Input id="tags" className="rounded-full" value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="cliente, vip" />
            </IXField>
            <IXField label="Notas internas" htmlFor="notes" className="md:col-span-2">
              <Textarea id="notes" className="min-h-[100px] rounded-2xl" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </IXField>
          </div>
          <div className="mt-6">
            <CustomFieldsFormCreate ref={customFieldsRef} entityType="contact" />
          </div>
        </IXFormSection>
      </IXFormLayout>

      <AIAutofillPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        results={previewResults}
        onConfirm={async (selected) => {
          if (!pendingEntityId) return;
          setIsApplyingPreview(true);
          let filled = 0;
          for (const r of selected) {
            try {
              const { error } = await supabase
                .from("custom_field_values")
                .upsert(
                  { custom_field_id: r.fieldId, entity_id: pendingEntityId, value: r.generatedValue, origin: "ai" },
                  { onConflict: "custom_field_id,entity_id" },
                );
              if (!error) filled++;
            } catch {}
          }
          setIsApplyingPreview(false);
          setShowPreview(false);
          if (filled > 0) toast.success(`${filled} campo(s) preenchido(s) com IA`);
          navigate(`/dashboard/contacts/${pendingEntityId}`);
        }}
        isApplying={isApplyingPreview}
      />
    </>
  );
}
