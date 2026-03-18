import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, Eye, ArrowRight, ArrowLeft, Check, X, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateFastMatchProfile } from "@/hooks/useFastMatchProfile";
import { toast } from "sonner";

const INDUSTRIES = [
  "Tecnologia", "Marketing", "Consultoria", "E-commerce", "Saúde",
  "Educação", "Imobiliário", "Finanças", "Jurídico", "Construção",
  "Alimentação", "Turismo", "Indústria", "Energia", "Outro",
];

const TICKET_RANGES = [
  "< €500", "€500 - €2.000", "€2.000 - €5.000", "€5.000 - €15.000",
  "€15.000 - €50.000", "> €50.000",
];

interface ProfileFormData {
  company_name: string;
  industry: string;
  target_audience: string;
  ticket_range: string;
  website_url: string;
  linkedin_url: string;
  services_offered: string[];
  services_needed: string[];
  bio: string;
}

export function ProfileSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [newServiceOffered, setNewServiceOffered] = useState("");
  const [newServiceNeeded, setNewServiceNeeded] = useState("");
  const updateProfile = useUpdateFastMatchProfile();

  const [form, setForm] = useState<ProfileFormData>({
    company_name: "",
    industry: "",
    target_audience: "",
    ticket_range: "",
    website_url: "",
    linkedin_url: "",
    services_offered: [],
    services_needed: [],
    bio: "",
  });

  const updateField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addService = (type: "services_offered" | "services_needed", value: string) => {
    const trimmed = value.trim();
    if (!trimmed || form[type].includes(trimmed)) return;
    updateField(type, [...form[type], trimmed]);
  };

  const removeService = (type: "services_offered" | "services_needed", index: number) => {
    updateField(type, form[type].filter((_, i) => i !== index));
  };

  const canAdvance = () => {
    if (step === 0) return !!form.company_name && !!form.industry;
    if (step === 1) return form.services_offered.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    try {
      await updateProfile.mutateAsync({
        ...form,
        status: "active",
      });
      toast.success("Perfil FastMatch criado com sucesso!");
      onComplete?.();
    } catch {
      toast.error("Erro ao criar perfil. Tenta novamente.");
    }
  };

  const steps = [
    { icon: Building2, title: "A tua Empresa", desc: "Informações básicas" },
    { icon: Briefcase, title: "Serviços", desc: "O que ofereces e procuras" },
    { icon: Eye, title: "Revisão", desc: "Confirma os dados" },
  ];

  return (
    <Card className="max-w-2xl mx-auto border-border/60">
      <CardHeader className="text-center space-y-3">
        <CardTitle className="text-xl">Configura o teu Perfil FastMatch</CardTitle>
        <CardDescription>
          Cria o teu perfil para ser descoberto por empresas compatíveis
        </CardDescription>
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} placeholder="Ex: FastCRM Solutions" />
                </div>
                <div className="space-y-2">
                  <Label>Indústria *</Label>
                  <Select value={form.industry} onValueChange={(v) => updateField("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleciona a indústria" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Público-alvo</Label>
                  <Input value={form.target_audience} onChange={(e) => updateField("target_audience", e.target.value)} placeholder="Ex: PMEs, Startups B2B" />
                </div>
                <div className="space-y-2">
                  <Label>Ticket Médio</Label>
                  <Select value={form.ticket_range} onValueChange={(v) => updateField("ticket_range", v)}>
                    <SelectTrigger><SelectValue placeholder="Faixa de valor" /></SelectTrigger>
                    <SelectContent>
                      {TICKET_RANGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/..." />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                {/* Services Offered */}
                <div className="space-y-2">
                  <Label>Serviços que Ofereces *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newServiceOffered}
                      onChange={(e) => setNewServiceOffered(e.target.value)}
                      placeholder="Ex: Desenvolvimento Web"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService("services_offered", newServiceOffered); setNewServiceOffered(""); }}}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={() => { addService("services_offered", newServiceOffered); setNewServiceOffered(""); }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {form.services_offered.map((s, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => removeService("services_offered", i)} className="ml-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Services Needed */}
                <div className="space-y-2">
                  <Label>Serviços que Procuras</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newServiceNeeded}
                      onChange={(e) => setNewServiceNeeded(e.target.value)}
                      placeholder="Ex: SEO, Design Gráfico"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService("services_needed", newServiceNeeded); setNewServiceNeeded(""); }}}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={() => { addService("services_needed", newServiceNeeded); setNewServiceNeeded(""); }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {form.services_needed.map((s, i) => (
                      <Badge key={i} variant="outline" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => removeService("services_needed", i)} className="ml-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Bio */}
                <div className="space-y-2">
                  <Label>Bio / Descrição</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Descreve brevemente a tua empresa e o que a diferencia..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">{form.company_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Indústria:</span> {form.industry}</div>
                    {form.target_audience && <div><span className="text-muted-foreground">Público:</span> {form.target_audience}</div>}
                    {form.ticket_range && <div><span className="text-muted-foreground">Ticket:</span> {form.ticket_range}</div>}
                  </div>
                  {form.services_offered.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Oferece:</p>
                      <div className="flex flex-wrap gap-1">{form.services_offered.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                  {form.services_needed.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Procura:</p>
                      <div className="flex flex-wrap gap-1">{form.services_needed.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                  {form.bio && <p className="text-sm text-muted-foreground">{form.bio}</p>}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Seguinte <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Publicar Perfil
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
