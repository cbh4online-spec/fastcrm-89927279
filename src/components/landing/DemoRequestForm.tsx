import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Building2,
  Handshake,
  HelpCircle,
  Users,
  MessageSquare,
  Zap,
  TrendingUp,
  Package,
  Sparkles,
  Loader2,
  Calendar,
  Mail,
  CheckCircle2,
} from "lucide-react";

// Business types
const businessTypes = [
  { id: "formacao", label: "Formação / Escolas", icon: GraduationCap },
  { id: "saude", label: "Saúde / Clínica", icon: HeartPulse },
  { id: "consultoria", label: "Consultoria / Coaching", icon: Briefcase },
  { id: "agencia", label: "Agência / Serviços", icon: Building2 },
  { id: "b2b", label: "Empresa B2B", icon: Handshake },
  { id: "outro", label: "Outro", icon: HelpCircle },
];

// Objectives
const objectives = [
  { id: "leads", label: "Gerir leads e vendas", icon: Users },
  { id: "atendimento", label: "Atendimento ao cliente", icon: MessageSquare },
  { id: "automacao", label: "Automatizar processos", icon: Zap },
  { id: "financeiro", label: "Ter visão financeira clara", icon: TrendingUp },
  { id: "produtos", label: "Organizar produtos/serviços", icon: Package },
  { id: "tudo", label: "Tudo isto 😄", icon: Sparkles },
];

// Team sizes
const teamSizes = [
  { id: "1", label: "Só eu" },
  { id: "2-5", label: "2–5" },
  { id: "6-20", label: "6–20" },
  { id: "20+", label: "20+" },
];

// Urgency levels
const urgencyLevels = [
  { id: "asap", label: "O quanto antes" },
  { id: "semanas", label: "Nas próximas semanas" },
  { id: "explorar", label: "Só estou a explorar" },
];

interface FormData {
  name: string;
  email: string;
  company: string;
  businessType: string;
  businessTypeOther: string;
  objectives: string[];
  teamSize: string;
  urgency: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  company: "",
  businessType: "",
  businessTypeOther: "",
  objectives: [],
  teamSize: "",
  urgency: "",
};

export default function DemoRequestForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const totalSteps = 4;

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) {
        newErrors.name = "Por favor, insere o teu nome";
      }
      if (!formData.email.trim()) {
        newErrors.email = "Por favor, insere o teu email";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }
    }

    if (currentStep === 2) {
      if (!formData.businessType) {
        newErrors.businessType = "Por favor, seleciona o tipo de negócio";
      }
      if (formData.businessType === "outro" && !formData.businessTypeOther.trim()) {
        newErrors.businessTypeOther = "Por favor, descreve o teu negócio";
      }
    }

    if (currentStep === 3) {
      if (formData.objectives.length === 0) {
        newErrors.objectives = "Seleciona pelo menos um objetivo";
      }
    }

    if (currentStep === 4) {
      if (!formData.teamSize) {
        newErrors.teamSize = "Por favor, seleciona o tamanho da equipa";
      }
      if (!formData.urgency) {
        newErrors.urgency = "Por favor, seleciona quando gostarias de avançar";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleObjective = (id: string) => {
    setFormData((prev) => {
      // If "tudo" is selected, clear others and add only "tudo"
      if (id === "tudo") {
        return { ...prev, objectives: prev.objectives.includes("tudo") ? [] : ["tudo"] };
      }
      // If selecting something else, remove "tudo" if present
      const withoutTudo = prev.objectives.filter((o) => o !== "tudo");
      if (withoutTudo.includes(id)) {
        return { ...prev, objectives: withoutTudo.filter((o) => o !== id) };
      }
      return { ...prev, objectives: [...withoutTudo, id] };
    });
    setErrors((prev) => ({ ...prev, objectives: undefined }));
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-demo-lead", {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim() || null,
          businessType: formData.businessType,
          businessTypeOther: formData.businessType === "outro" ? formData.businessTypeOther.trim() : null,
          objectives: formData.objectives,
          teamSize: formData.teamSize,
          urgency: formData.urgency,
        },
      });

      if (error) {
        console.error("Error creating lead:", error);
        toast.error("Algo correu mal. Tenta novamente ou fala connosco.");
        return;
      }

      setIsSubmitted(true);
      toast.success("Pedido enviado com sucesso!");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Algo correu mal. Tenta novamente ou fala connosco.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Obrigado! 🙌</h3>
            <p className="text-muted-foreground text-lg">
              Já estamos a preparar uma demonstração adaptada ao teu negócio.
            </p>
            <p className="text-muted-foreground">
              Entraremos em contacto em breve.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button variant="outline" size="lg" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agendar demo agora
            </Button>
            <Button variant="ghost" size="lg" className="gap-2">
              <Mail className="w-4 h-4" />
              Receber email de confirmação
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6 md:p-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {step} de {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              Leva menos de 1 minuto
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Identification */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Vamos conhecer-nos 👋</h3>
              <p className="text-muted-foreground">
                Vamos usar estes dados apenas para preparar a demonstração.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Como te chamas?</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Qual é o teu email profissional?</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.pt"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">
                  Nome da empresa{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="company"
                  placeholder="Empresa, Lda."
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Business Type */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Que tipo de negócio tens?</h3>
              <p className="text-muted-foreground">
                Isto ajuda-nos a personalizar a demonstração.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {businessTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, businessType: type.id }));
                    setErrors((prev) => ({ ...prev, businessType: undefined }));
                  }}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
                    formData.businessType === type.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <type.icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      formData.businessType === type.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>

            {errors.businessType && (
              <p className="text-sm text-destructive">{errors.businessType}</p>
            )}

            {formData.businessType === "outro" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="businessTypeOther">
                  Descreve em poucas palavras o teu negócio
                </Label>
                <Textarea
                  id="businessTypeOther"
                  placeholder="Ex: Plataforma de e-learning para empresas..."
                  value={formData.businessTypeOther}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      businessTypeOther: e.target.value,
                    }));
                    setErrors((prev) => ({ ...prev, businessTypeOther: undefined }));
                  }}
                  className={cn(errors.businessTypeOther && "border-destructive")}
                  rows={3}
                />
                {errors.businessTypeOther && (
                  <p className="text-sm text-destructive">
                    {errors.businessTypeOther}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Objectives */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                O que gostarias de melhorar primeiro?
              </h3>
              <p className="text-muted-foreground">
                Não te preocupes, não é uma decisão final.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {objectives.map((obj) => {
                const isSelected = formData.objectives.includes(obj.id);
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => toggleObjective(obj.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border text-left transition-all relative",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <obj.icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium pr-6">{obj.label}</span>
                  </button>
                );
              })}
            </div>

            {errors.objectives && (
              <p className="text-sm text-destructive">{errors.objectives}</p>
            )}
          </div>
        )}

        {/* Step 4: Team Size & Urgency */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Quase lá! 🎯</h3>
              <p className="text-muted-foreground">
                Só mais duas perguntas rápidas.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Quantas pessoas usam (ou vão usar) o sistema?</Label>
                <div className="flex flex-wrap gap-2">
                  {teamSizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, teamSize: size.id }));
                        setErrors((prev) => ({ ...prev, teamSize: undefined }));
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all",
                        formData.teamSize === size.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium">{size.label}</span>
                    </button>
                  ))}
                </div>
                {errors.teamSize && (
                  <p className="text-sm text-destructive">{errors.teamSize}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Quando gostarias de avançar?</Label>
                <div className="flex flex-wrap gap-2">
                  {urgencyLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, urgency: level.id }));
                        setErrors((prev) => ({ ...prev, urgency: undefined }));
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all",
                        formData.urgency === level.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium">{level.label}</span>
                    </button>
                  ))}
                </div>
                {errors.urgency && (
                  <p className="text-sm text-destructive">{errors.urgency}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          {step > 1 ? (
            <Button variant="ghost" onClick={prevStep} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button onClick={nextStep} className="gap-2">
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  Pedir demonstração personalizada
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
