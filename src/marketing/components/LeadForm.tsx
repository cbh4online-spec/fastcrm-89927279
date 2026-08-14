import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  defaultLeadType?: "demo" | "contact" | "pricing" | "partnership";
  sourcePage?: string;
  compact?: boolean;
}

const SECTORS = [
  "Imobiliário", "Saúde & Clínicas", "Ginásios & Bem-estar", "Restauração",
  "Beleza & Estética", "Automóvel", "Educação & Formação", "Construção",
  "Agências & Consultoria", "Serviços Profissionais", "Comércio Online", "Outro",
];

const SIZES = ["1-5", "6-15", "16-50", "51-200", "200+"];

export function LeadForm({ defaultLeadType = "demo", sourcePage = "contact", compact }: Props) {
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    company_size: "",
    sector: "",
    message: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (form.full_name.trim().length < 2) return toast.error("Indique o seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("Email inválido.");

    setSubmitting(true);
    try {
      const utm = {
        utm_source: params.get("utm_source") || undefined,
        utm_medium: params.get("utm_medium") || undefined,
        utm_campaign: params.get("utm_campaign") || undefined,
        utm_content: params.get("utm_content") || undefined,
        utm_term: params.get("utm_term") || undefined,
      };

      const { error } = await supabase.functions.invoke("submit-marketing-lead", {
        body: {
          ...form,
          source_page: sourcePage,
          lead_type: params.get("tipo") || defaultLeadType,
          referrer: document.referrer,
          utm,
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível enviar. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Recebemos o seu pedido</h3>
        <p className="text-muted-foreground">
          A nossa equipa entra em contacto em menos de 24 horas úteis. Verifique o seu email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome *</Label>
          <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email profissional *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={200} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_name">Empresa</Label>
          <Input id="company_name" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} maxLength={200} />
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dimensão da equipa</Label>
            <Select value={form.company_size} onValueChange={(v) => update("company_size", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s} pessoas</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sector</Label>
            <Select value={form.sector} onValueChange={(v) => update("sector", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Como podemos ajudar?</Label>
        <Textarea id="message" rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} maxLength={2000} placeholder="Conte-nos sobre o seu desafio comercial actual…" />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Ao submeter aceita a nossa{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            política de privacidade
          </a>
          .
        </p>

        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar…</> : "Enviar pedido"}
        </Button>
      </div>
    </form>
  );
}
