import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { IXFormLayout } from "@/components/forms/IXFormLayout";
import { IXFormSection } from "@/components/forms/IXFormSection";
import { IXField } from "@/components/forms/IXField";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { isValidPhone, toE164 } from "@/utils/phone";
import { useQueryClient } from "@tanstack/react-query";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";

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

const PAYMENT_TERMS = ["Pronto Pagamento", "15 dias", "30 dias", "45 dias", "60 dias", "90 dias"];
const LANGUAGES = ["Português", "English", "Español", "Français"];
const CURRENCIES = ["Euro (€)", "Dólar (USD)", "Libra (GBP)", "Real (BRL)"];
const COPIES = ["Original", "Original + Duplicado", "Original + 2 Cópias"];

type BillingPrefs = {
  use_account_defaults?: boolean;
  vat_exemption_reason?: string;
  payment_method?: string;
  language?: string;
  currency?: string;
  payment_terms?: string;
  copies?: string;
  notes?: string | null;
};

const emptyForm = {
  nif_country: "PT",
  tax_id: "",
  external_code: "",
  is_final_consumer: false,
  name: "",
  avatar_url: "" as string,
  email: "",
  phone: "",
  address: "",
  phone_mobile: "",
  city: "",
  postal_code: "",
  website: "",
  preferred_contact_name: "",
  preferred_contact_email: "",
  preferred_contact_phone: "",
  use_account_defaults: true,
  vat_exemption_reason: "none",
  payment_method: PAYMENT_METHODS[0],
  language: LANGUAGES[0],
  currency: CURRENCIES[0],
  payment_terms: PAYMENT_TERMS[0],
  copies: COPIES[0],
  billing_notes: "",
  company: "",
  job_title: "",
  tags: "",
  notes: "",
};

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || !currentWorkspace) return;
      setIsLoading(true);
      const { data, error } = await workspaceClient
        .from("contacts")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      const c = data as Record<string, unknown>;
      const billing = (c.billing_preferences ?? {}) as BillingPrefs;
      setForm({
        nif_country: (c.nif_country as string) || "PT",
        tax_id: (c.tax_id as string) || "",
        external_code: (c.external_code as string) || "",
        is_final_consumer: !!c.is_final_consumer,
        name: (c.name as string) || "",
        avatar_url: (c.avatar_url as string) || "",
        email: (c.email as string) || "",
        phone: (c.phone as string) || "",
        address: (c.address as string) || "",
        phone_mobile: (c.phone_mobile as string) || "",
        city: (c.city as string) || "",
        postal_code: (c.postal_code as string) || "",
        website: (c.website as string) || "",
        preferred_contact_name: (c.preferred_contact_name as string) || "",
        preferred_contact_email: (c.preferred_contact_email as string) || "",
        preferred_contact_phone: (c.preferred_contact_phone as string) || "",
        use_account_defaults: billing.use_account_defaults ?? true,
        vat_exemption_reason: billing.vat_exemption_reason || "none",
        payment_method: billing.payment_method || PAYMENT_METHODS[0],
        language: billing.language || LANGUAGES[0],
        currency: billing.currency || CURRENCIES[0],
        payment_terms: billing.payment_terms || PAYMENT_TERMS[0],
        copies: billing.copies || COPIES[0],
        billing_notes: billing.notes || "",
        company: (c.company as string) || "",
        job_title: (c.job_title as string) || "",
        tags: Array.isArray(c.tags) ? (c.tags as string[]).join(", ") : "",
        notes: (c.notes as string) || "",
      });
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, currentWorkspace, workspaceClient]);

  const canSubmit = useMemo(() => {
    return !!(form.name.trim() || form.email.trim() || form.phone.trim());
  }, [form.name, form.email, form.phone]);

  const handleSubmit = async () => {
    if (!id || !currentWorkspace || !user) {
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

      const updatePayload: Record<string, unknown> = {
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
        avatar_url: form.avatar_url || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await workspaceClient
        .from("contacts")
        .update(updatePayload as never)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);

      if (error) {
        if (error.code === "23505") {
          if ((error.message || "").includes("email")) toast.error("Já existe um contacto com este email");
          else if ((error.message || "").includes("tax_id")) toast.error("Já existe um contacto com este NIF");
          else toast.error("Conflito de dados únicos");
        } else {
          toast.error("Erro ao atualizar contacto");
          console.warn("[EDIT_CONTACT] update failed", error);
        }
        return;
      }

      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: "CONTACT.UPDATED",
        entity_kind: "contact",
        entity_id: id,
        source_module: "crm-contacts",
        payload: { source: "ix-edit-page" },
      });

      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
      toast.success("Contacto atualizado");
      navigate(`/dashboard/contacts/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Contacto não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Pode ter sido removido ou pertencer a outra workspace.</p>
      </div>
    );
  }

  return (
    <IXFormLayout
      title="Editar Contacto"
      backTo={`/dashboard/contacts/${id}`}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      submitLabel="Guardar alterações"
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
          <label htmlFor="final-consumer" className="text-sm font-medium">Consumidor final</label>
        </div>
        <div className="mt-6">
          <IXField label="Nome" htmlFor="name" required counter={{ value: form.name.length, max: 100 }}>
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

      {/* Detalhes */}
      <IXFormSection title="Detalhes" description="Estes serão os detalhes incluídos em todos os documentos.">
        <div className="grid gap-6 md:grid-cols-2">
          <IXField label="E-mail" htmlFor="email">
            <Input id="email" type="email" className="rounded-full" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="nome@empresa.pt" />
          </IXField>
          <IXField label="Telefone">
            <PhoneInput value={form.phone} onChange={(v) => update("phone", v)} placeholder="+351 912 345 678" />
          </IXField>
          <IXField label="Morada" htmlFor="address" counter={{ value: form.address.length, max: 200 }}>
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
      <IXFormSection title="Contacto Preferencial" description="Estas serão as definições usadas para o envio de documentos por e-mail.">
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
      <IXFormSection title="Preferências de Faturação" description="Estas serão as definições usadas em todos os documentos que emitir para este contacto.">
        <div className="mb-6 flex items-center gap-3">
          <Checkbox id="use-account" checked={form.use_account_defaults} onCheckedChange={(v) => update("use_account_defaults", !!v)} />
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
          <IXField label="Observações" counter={{ value: form.billing_notes.length, max: 200 }} className="md:col-span-2">
            <Textarea
              value={form.billing_notes}
              onChange={(e) => update("billing_notes", e.target.value.slice(0, 200))}
              className="min-h-[140px] rounded-2xl"
            />
          </IXField>
        </fieldset>
      </IXFormSection>

      {/* CRM */}
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
      </IXFormSection>
    </IXFormLayout>
  );
}
