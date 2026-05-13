import { useEffect, useState } from "react";
import { Instagram, Facebook, Linkedin, Music2, Loader2, ExternalLink, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface LeadChefSocialValues {
  instagram_handle?: string | null;
  facebook_url?: string | null;
  tiktok_handle?: string | null;
  linkedin_url?: string | null;
}

interface Props {
  values: LeadChefSocialValues;
  isSaving?: boolean;
  onSave: (next: LeadChefSocialValues) => void | Promise<unknown>;
}

const cleanHandle = (s?: string | null) =>
  (s ?? "").trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "").replace(/\/+$/, "");

const igUrl = (h?: string | null) => (h ? `https://instagram.com/${cleanHandle(h)}` : "");
const ttUrl = (h?: string | null) => (h ? `https://tiktok.com/@${cleanHandle(h)}` : "");

export function LeadChefSocialLinksCard({ values, isSaving, onSave }: Props) {
  const [form, setForm] = useState<LeadChefSocialValues>(values);
  useEffect(() => setForm(values), [values.instagram_handle, values.facebook_url, values.tiktok_handle, values.linkedin_url]);

  const dirty =
    (form.instagram_handle ?? "") !== (values.instagram_handle ?? "") ||
    (form.facebook_url ?? "") !== (values.facebook_url ?? "") ||
    (form.tiktok_handle ?? "") !== (values.tiktok_handle ?? "") ||
    (form.linkedin_url ?? "") !== (values.linkedin_url ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      instagram_handle: cleanHandle(form.instagram_handle) || null,
      facebook_url: (form.facebook_url ?? "").trim() || null,
      tiktok_handle: cleanHandle(form.tiktok_handle) || null,
      linkedin_url: (form.linkedin_url ?? "").trim() || null,
    });
  };

  const Field = ({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder,
    href,
  }: {
    icon: typeof Instagram;
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    href?: string;
  }) => (
    <div>
      <Label className="text-xs flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        {label}
        {href && value && (
          <a href={href} target="_blank" rel="noreferrer" className="ml-auto text-emerald-600 hover:underline inline-flex items-center gap-0.5">
            abrir <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Redes sociais</h2>
      <Field
        icon={Instagram}
        label="Instagram"
        value={form.instagram_handle ?? ""}
        onChange={(v) => setForm({ ...form, instagram_handle: v })}
        placeholder="@utilizador"
        href={igUrl(form.instagram_handle)}
      />
      <Field
        icon={Music2}
        label="TikTok"
        value={form.tiktok_handle ?? ""}
        onChange={(v) => setForm({ ...form, tiktok_handle: v })}
        placeholder="@utilizador"
        href={ttUrl(form.tiktok_handle)}
      />
      <Field
        icon={Facebook}
        label="Facebook"
        value={form.facebook_url ?? ""}
        onChange={(v) => setForm({ ...form, facebook_url: v })}
        placeholder="https://facebook.com/..."
        href={form.facebook_url ?? ""}
      />
      <Field
        icon={Linkedin}
        label="LinkedIn"
        value={form.linkedin_url ?? ""}
        onChange={(v) => setForm({ ...form, linkedin_url: v })}
        placeholder="https://linkedin.com/in/..."
        href={form.linkedin_url ?? ""}
      />
      <Button type="submit" size="sm" disabled={!dirty || isSaving} className="w-full">
        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Guardar redes sociais
      </Button>
    </form>
  );
}
