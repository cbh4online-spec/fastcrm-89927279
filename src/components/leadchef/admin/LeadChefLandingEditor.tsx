import { useState } from "react";
import { useForm } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, Sparkles } from "lucide-react";
import { LEADCHEF_DEFAULT_CONTENT } from "@/config/leadchef/defaultLandingContent";
import {
  useLeadChefLandingContent,
  useUpsertLeadChefLandingContent,
  type LeadChefLandingContent,
  type LandingModule,
  type LandingBenefit,
  type LandingJourneyStep,
  type LandingFaq,
} from "@/hooks/leadchef/useLeadChefLandingContent";

interface Props {
  workspaceId: string;
}

type FormShape = LeadChefLandingContent;

const empty: FormShape = {
  workspace_id: "",
  is_canonical: false,
  hero: {},
  modules: [],
  benefits: [],
  journey: [],
  faqs: [],
  ctas: {},
  seo: {},
  images: {},
};

export function LeadChefLandingEditor({ workspaceId }: Props) {
  const { data, isLoading } = useLeadChefLandingContent(workspaceId);
  const upsert = useUpsertLeadChefLandingContent();
  const [form, setForm] = useState<FormShape>(empty);
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setForm({ ...empty, ...data, workspace_id: workspaceId });
    setHydrated(true);
  } else if (!hydrated && !isLoading) {
    setForm({ ...empty, workspace_id: workspaceId });
    setHydrated(true);
  }

  const update = <K extends keyof FormShape>(k: K, v: FormShape[K]) => setForm((f) => ({ ...f, [k]: v }));
  const updateNested = (k: keyof FormShape, sub: string, v: any) =>
    setForm((f) => ({ ...f, [k]: { ...(f[k] as any), [sub]: v } }));

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...form, workspace_id: workspaceId });
      toast.success("Conteúdos da landing guardados.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao guardar.");
    }
  };

  const handleAutoFill = () => {
    setForm((f) => ({
      ...f,
      ...LEADCHEF_DEFAULT_CONTENT,
      workspace_id: workspaceId,
      is_canonical: f.is_canonical,
    }));
    toast.success("Conteúdos predefinidos aplicados — revê e guarda.");
  };


  return (
    <div className="space-y-6">
      <Helmet><title>Centro LeadChef · Conteúdos da Landing</title></Helmet>

      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <Switch
            id="canonical"
            checked={form.is_canonical}
            onCheckedChange={(v) => update("is_canonical", v)}
          />
          <Label htmlFor="canonical" className="cursor-pointer">
            Workspace canónico — serve a landing pública <code className="text-xs">/leadchef</code>
          </Label>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Guardar
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Hero</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Badge" value={form.hero.badge} onChange={(v) => updateNested("hero", "badge", v)} />
          <Field label="Microcopy (rodapé hero)" value={form.hero.microCopy} onChange={(v) => updateNested("hero", "microCopy", v)} />
          <Field className="md:col-span-2" label="Título" value={form.hero.title} onChange={(v) => updateNested("hero", "title", v)} />
          <Field label="Destaque" value={form.hero.highlight} onChange={(v) => updateNested("hero", "highlight", v)} />
          <Field label="Subtítulo" value={form.hero.subtitle} onChange={(v) => updateNested("hero", "subtitle", v)} multiline />
          <Field label="CTA primário (texto)" value={form.hero.primaryCtaLabel} onChange={(v) => updateNested("hero", "primaryCtaLabel", v)} />
          <Field label="CTA primário (link)" value={form.hero.primaryCtaHref} onChange={(v) => updateNested("hero", "primaryCtaHref", v)} />
          <Field label="CTA secundário (texto)" value={form.hero.secondaryCtaLabel} onChange={(v) => updateNested("hero", "secondaryCtaLabel", v)} />
          <Field label="CTA secundário (link)" value={form.hero.secondaryCtaHref} onChange={(v) => updateNested("hero", "secondaryCtaHref", v)} />
        </CardContent>
      </Card>

      <ListEditor<LandingModule>
        title="Módulos"
        items={form.modules}
        onChange={(v) => update("modules", v)}
        empty={{ title: "", desc: "" }}
        fields={[
          { key: "title", label: "Título" },
          { key: "desc", label: "Descrição", multiline: true },
        ]}
      />

      <ListEditor<LandingBenefit>
        title="Benefícios (KPIs)"
        items={form.benefits}
        onChange={(v) => update("benefits", v)}
        empty={{ value: "", label: "" }}
        fields={[
          { key: "value", label: "Valor (ex: +38%)" },
          { key: "label", label: "Legenda" },
        ]}
      />

      <ListEditor<LandingJourneyStep>
        title="Jornada"
        items={form.journey}
        onChange={(v) => update("journey", v)}
        empty={{ step: "", title: "", desc: "" }}
        fields={[
          { key: "step", label: "Nº" },
          { key: "title", label: "Título" },
          { key: "desc", label: "Descrição", multiline: true },
        ]}
      />

      <ListEditor<LandingFaq>
        title="FAQs"
        items={form.faqs}
        onChange={(v) => update("faqs", v)}
        empty={{ q: "", a: "" }}
        fields={[
          { key: "q", label: "Pergunta" },
          { key: "a", label: "Resposta", multiline: true },
        ]}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">CTAs globais & contacto</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Agendar demo (link)" value={form.ctas.scheduleHref} onChange={(v) => updateNested("ctas", "scheduleHref", v)} />
          <Field label="Signup (link)" value={form.ctas.signupHref} onChange={(v) => updateNested("ctas", "signupHref", v)} />
          <Field label="App (link)" value={form.ctas.appHref} onChange={(v) => updateNested("ctas", "appHref", v)} />
          <Field label="Email contacto" value={form.ctas.contactEmail} onChange={(v) => updateNested("ctas", "contactEmail", v)} />
          <Field label="Telefone contacto" value={form.ctas.contactPhone} onChange={(v) => updateNested("ctas", "contactPhone", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">SEO & Imagens</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="SEO Título" value={form.seo.title} onChange={(v) => updateNested("seo", "title", v)} />
          <Field label="Canonical URL" value={form.seo.canonical} onChange={(v) => updateNested("seo", "canonical", v)} />
          <Field className="md:col-span-2" label="SEO Descrição" value={form.seo.description} onChange={(v) => updateNested("seo", "description", v)} multiline />
          <Field label="OG Título" value={form.seo.ogTitle} onChange={(v) => updateNested("seo", "ogTitle", v)} />
          <Field label="OG Descrição" value={form.seo.ogDescription} onChange={(v) => updateNested("seo", "ogDescription", v)} multiline />
          <Field label="Logo URL" value={form.images.logoUrl} onChange={(v) => updateNested("images", "logoUrl", v)} />
          <Field label="Hero image URL" value={form.images.heroImage} onChange={(v) => updateNested("images", "heroImage", v)} />
          <Field label="OG image URL" value={form.images.ogImage} onChange={(v) => updateNested("images", "ogImage", v)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Guardar alterações
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, multiline, className,
}: { label: string; value?: string; onChange: (v: string) => void; multiline?: boolean; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

interface ListEditorProps<T> {
  title: string;
  items: T[];
  onChange: (next: T[]) => void;
  empty: T;
  fields: { key: keyof T; label: string; multiline?: boolean }[];
}
function ListEditor<T extends Record<string, any>>({ title, items, onChange, empty, fields }: ListEditorProps<T>) {
  const add = () => onChange([...(items ?? []), { ...empty }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const set = (i: number, k: keyof T, v: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem itens.</p>}
        {(items ?? []).map((item, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            {fields.map((f) => (
              <Field
                key={String(f.key)}
                label={f.label}
                value={(item as any)[f.key]}
                onChange={(v) => set(i, f.key, v)}
                multiline={f.multiline}
                className={f.multiline ? "md:col-span-2" : undefined}
              />
            ))}
            <div className="md:col-span-2 flex justify-end">
              <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
