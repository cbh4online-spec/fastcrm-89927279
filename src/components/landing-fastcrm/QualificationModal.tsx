import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QualificationModalProps {
  open: boolean;
  onClose: () => void;
  prefilledPlan?: string;
}

interface FormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  sector: string;
  users_count: number;
  contacts_count: number;
  workspaces_count: number;
  needs_whatsapp: boolean;
  needs_instagram: boolean;
  needs_ecommerce: boolean;
  needs_client_portal: boolean;
  needs_knowledge_base: boolean;
  needs_ai_sales_coach: boolean;
  needs_api: boolean;
  integrations_required: string;
  ai_usage_level: "low" | "medium" | "high";
}

const planDefaults: Record<string, Partial<FormData>> = {
  free: { users_count: 1, contacts_count: 100, workspaces_count: 1 },
  business: { users_count: 5, contacts_count: 2000, workspaces_count: 1 },
  professional: { users_count: 15, contacts_count: 10000, workspaces_count: 3, needs_knowledge_base: true, needs_ai_sales_coach: true, needs_api: true },
  enterprise: { users_count: 50, contacts_count: 50000, workspaces_count: 10, needs_whatsapp: true, needs_instagram: true, needs_ecommerce: true, needs_client_portal: true, needs_knowledge_base: true, needs_ai_sales_coach: true, needs_api: true, ai_usage_level: "high" },
};

const sectorOptions = [
  "Saúde / Clínicas",
  "Agência / Consultoria",
  "Tecnologia / SaaS",
  "Comércio / Retalho",
  "Serviços Financeiros",
  "Imobiliário",
  "Educação / Formação",
  "Indústria / Produção",
  "Outro",
];

export function QualificationModal({ open, onClose, prefilledPlan }: QualificationModalProps) {
  const defaults = prefilledPlan ? planDefaults[prefilledPlan] || {} : {};

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState<FormData>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    sector: "",
    users_count: 1,
    contacts_count: 100,
    workspaces_count: 1,
    needs_whatsapp: false,
    needs_instagram: false,
    needs_ecommerce: false,
    needs_client_portal: false,
    needs_knowledge_base: false,
    needs_ai_sales_coach: false,
    needs_api: false,
    integrations_required: "",
    ai_usage_level: "low",
    ...defaults,
  });

  const update = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return form.company_name.trim() && form.contact_name.trim() && form.email.trim() && form.email.includes("@");
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-fastcrm-proposal", {
        body: form,
      });
      if (error) throw error;
      setResult(data);
      setStep(3);
      toast.success("Proposta gerada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar proposta: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setResult(null);
    setForm({
      company_name: "", contact_name: "", email: "", phone: "", sector: "",
      users_count: 1, contacts_count: 100, workspaces_count: 1,
      needs_whatsapp: false, needs_instagram: false, needs_ecommerce: false,
      needs_client_portal: false, needs_knowledge_base: false,
      needs_ai_sales_coach: false, needs_api: false,
      integrations_required: "", ai_usage_level: "low",
      ...defaults,
    });
    onClose();
  };

  if (!open) return null;

  const planNames: Record<string, string> = { free: "Free", business: "Business", professional: "Professional", enterprise: "Enterprise" };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-xl bg-[hsl(222,47%,6%)] border border-[hsl(210,40%,98%)/0.08] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(210,40%,98%)/0.08]">
            <div>
              <h3 className="text-lg font-bold text-[hsl(210,40%,98%)]">
                {step === 3 ? "Proposta Gerada" : "Qualificação Estratégica"}
              </h3>
              {step < 3 && (
                <p className="text-xs text-[hsl(210,40%,98%)/0.5]">Passo {step + 1} de 3</p>
              )}
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[hsl(210,40%,98%)/0.05] transition">
              <X className="h-5 w-5 text-[hsl(210,40%,98%)/0.5]" />
            </button>
          </div>

          {/* Progress */}
          {step < 3 && (
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-[hsl(var(--primary))]" : "bg-[hsl(210,40%,98%)/0.08]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Empresa *</Label>
                  <Input value={form.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Nome da empresa" className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Nome *</Label>
                    <Input value={form.contact_name} onChange={e => update("contact_name", e.target.value)} placeholder="Nome completo" className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Telefone</Label>
                    <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+351..." className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="email@empresa.com" className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Sector</Label>
                  <Select value={form.sector} onValueChange={v => update("sector", v)}>
                    <SelectTrigger className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]">
                      <SelectValue placeholder="Selecionar sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Utilizadores</Label>
                    <Input type="number" min={1} value={form.users_count} onChange={e => update("users_count", parseInt(e.target.value) || 1)} className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Contactos</Label>
                    <Input type="number" min={1} value={form.contacts_count} onChange={e => update("contacts_count", parseInt(e.target.value) || 100)} className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Workspaces</Label>
                    <Input type="number" min={1} value={form.workspaces_count} onChange={e => update("workspaces_count", parseInt(e.target.value) || 1)} className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]" />
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm mb-3 block">Módulos Necessários</Label>
                  <div className="space-y-3">
                    {([
                      ["needs_whatsapp", "WhatsApp Business API"],
                      ["needs_instagram", "Instagram Integration"],
                      ["needs_ecommerce", "Loja Online / E-commerce"],
                      ["needs_client_portal", "Portal Cliente"],
                      ["needs_knowledge_base", "Knowledge Base com IA"],
                      ["needs_ai_sales_coach", "AI Sales Coach"],
                      ["needs_api", "API Access"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-[hsl(210,40%,98%)/0.7]">{label}</span>
                        <Switch
                          checked={form[key]}
                          onCheckedChange={v => update(key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Nível de Utilização de IA</Label>
                  <Select value={form.ai_usage_level} onValueChange={v => update("ai_usage_level", v)}>
                    <SelectTrigger className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basico (incluido no plano)</SelectItem>
                      <SelectItem value="medium">Intermedio (+5.000 credits)</SelectItem>
                      <SelectItem value="high">Avancado (+20.000 credits)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(210,40%,98%)/0.7] text-sm">Integrações necessárias (opcional)</Label>
                  <Input
                    value={form.integrations_required}
                    onChange={e => update("integrations_required", e.target.value)}
                    placeholder="Ex: Stripe, Zapier, API proprietária..."
                    className="bg-[hsl(210,40%,98%)/0.04] border-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)]"
                  />
                </div>

                {/* Summary preview */}
                <div className="mt-4 p-4 rounded-xl bg-[hsl(210,40%,98%)/0.03] border border-[hsl(210,40%,98%)/0.06]">
                  <p className="text-xs text-[hsl(210,40%,98%)/0.5] mb-2">Resumo da qualificação</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">Empresa:</span> <span className="text-[hsl(210,40%,98%)]">{form.company_name}</span></div>
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">Contacto:</span> <span className="text-[hsl(210,40%,98%)]">{form.contact_name}</span></div>
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">Utilizadores:</span> <span className="text-[hsl(210,40%,98%)]">{form.users_count}</span></div>
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">Contactos:</span> <span className="text-[hsl(210,40%,98%)]">{form.contacts_count.toLocaleString()}</span></div>
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">Workspaces:</span> <span className="text-[hsl(210,40%,98%)]">{form.workspaces_count}</span></div>
                    <div><span className="text-[hsl(210,40%,98%)/0.4]">IA:</span> <span className="text-[hsl(210,40%,98%)]">{form.ai_usage_level === "low" ? "Basico" : form.ai_usage_level === "medium" ? "Intermedio" : "Avancado"}</span></div>
                  </div>
                </div>
              </>
            )}

            {step === 3 && result && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[hsl(var(--success)/0.15)] flex items-center justify-center mx-auto mb-4">
                    <Check className="h-7 w-7 text-[hsl(var(--success))]" />
                  </div>
                  <h4 className="text-xl font-bold text-[hsl(210,40%,98%)] mb-1">Proposta enviada</h4>
                  <p className="text-sm text-[hsl(210,40%,98%)/0.5]">Verifique o seu email para consultar a proposta completa.</p>
                </div>

                <div className="p-4 rounded-xl bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.15)]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[hsl(210,40%,98%)/0.4] text-xs">Plano Recomendado</p>
                      <p className="text-[hsl(210,40%,98%)] font-bold text-lg">{planNames[result.recommended_plan]}</p>
                    </div>
                    <div>
                      <p className="text-[hsl(210,40%,98%)/0.4] text-xs">Investimento Estimado</p>
                      <p className="text-[hsl(var(--primary))] font-bold text-lg">{result.monthly_total}€/mês</p>
                    </div>
                    {result.setup_fee > 0 && (
                      <div>
                        <p className="text-[hsl(210,40%,98%)/0.4] text-xs">Setup</p>
                        <p className="text-[hsl(210,40%,98%)] font-medium">{result.pricing.setupFeeLabel}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[hsl(210,40%,98%)/0.4] text-xs">Email</p>
                      <p className="text-[hsl(210,40%,98%)] font-medium">{result.email_sent ? "Enviado" : "Pendente"}</p>
                    </div>
                  </div>
                </div>

                {result.pricing && (
                  <div className="p-4 rounded-xl bg-[hsl(210,40%,98%)/0.03] border border-[hsl(210,40%,98%)/0.06] text-sm space-y-2">
                    <p className="text-xs text-[hsl(210,40%,98%)/0.4] mb-2">Detalhe do investimento</p>
                    <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">Base</span><span className="text-[hsl(210,40%,98%)]">{result.pricing.planBase}€</span></div>
                    {result.pricing.addons > 0 && <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">Add-ons</span><span className="text-[hsl(210,40%,98%)]">+{result.pricing.addons}€</span></div>}
                    {result.pricing.usersAdj > 0 && <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">Ajuste utilizadores</span><span className="text-[hsl(210,40%,98%)]">+{result.pricing.usersAdj}€</span></div>}
                    {result.pricing.contactsAdj > 0 && <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">Ajuste contactos</span><span className="text-[hsl(210,40%,98%)]">+{result.pricing.contactsAdj}€</span></div>}
                    {result.pricing.workspacesAdj > 0 && <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">Ajuste workspaces</span><span className="text-[hsl(210,40%,98%)]">+{result.pricing.workspacesAdj}€</span></div>}
                    {result.pricing.aiPackPrice > 0 && <div className="flex justify-between"><span className="text-[hsl(210,40%,98%)/0.6]">AI Pack</span><span className="text-[hsl(210,40%,98%)]">+{result.pricing.aiPackPrice}€</span></div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-[hsl(210,40%,98%)/0.08] flex justify-between">
            {step === 3 ? (
              <Button onClick={handleClose} className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                Fechar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
                  className="text-[hsl(210,40%,98%)/0.6]"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {step > 0 ? "Anterior" : "Cancelar"}
                </Button>
                {step < 2 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canAdvance()}
                    className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  >
                    Seguinte
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {loading ? "A gerar proposta..." : "Gerar Proposta"}
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
