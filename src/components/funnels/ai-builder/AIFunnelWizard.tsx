import { useState } from "react";
import { ArrowRight, ArrowLeft, Sparkles, Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import type { AIFunnelRecommendation } from "./AIFunnelBuilder";

interface WizardStep {
  id: string;
  question: string;
  type: "text" | "single" | "multi";
  options?: { value: string; label: string; description?: string }[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "product",
    question: "O que queres vender ou promover?",
    type: "text",
  },
  {
    id: "audience",
    question: "Quem é o público-alvo?",
    type: "text",
  },
  {
    id: "objective",
    question: "Qual o objectivo principal?",
    type: "single",
    options: [
      { value: "leads", label: "Gerar leads", description: "Captar contactos qualificados" },
      { value: "calls", label: "Marcar chamadas", description: "Agendar reuniões ou demos" },
      { value: "sales", label: "Vender", description: "Venda directa de produto/serviço" },
      { value: "recruit", label: "Recrutar", description: "Captar candidatos" },
      { value: "register", label: "Captar inscrições", description: "Registos para eventos ou listas" },
    ],
  },
  {
    id: "ticket",
    question: "Qual o ticket médio?",
    type: "single",
    options: [
      { value: "free", label: "Grátis", description: "Lead magnet ou conteúdo gratuito" },
      { value: "low", label: "Baixo (< €50)", description: "Compra impulsiva" },
      { value: "medium", label: "Médio (€50-500)", description: "Decisão considerada" },
      { value: "high", label: "Alto (> €500)", description: "Venda consultiva" },
    ],
  },
  {
    id: "traffic",
    question: "Qual a origem principal do tráfego?",
    type: "multi",
    options: [
      { value: "organic", label: "Orgânico" },
      { value: "meta", label: "Meta Ads" },
      { value: "google", label: "Google Ads" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "email", label: "Email" },
    ],
  },
  {
    id: "capture",
    question: "Como queres captar?",
    type: "single",
    options: [
      { value: "form", label: "Formulário", description: "Formulário de contacto simples" },
      { value: "quiz", label: "Quiz", description: "Quiz interactivo com segmentação" },
      { value: "live", label: "Live", description: "Inscrição para evento ao vivo" },
      { value: "masterclass", label: "Masterclass", description: "Masterclass de conversão" },
      { value: "whatsapp", label: "WhatsApp", description: "CTA directo para WhatsApp" },
      { value: "checkout", label: "Checkout", description: "Compra directa" },
      { value: "application", label: "Candidatura", description: "Formulário de candidatura" },
    ],
  },
  {
    id: "salesType",
    question: "Queres venda directa ou qualificação antes?",
    type: "single",
    options: [
      { value: "direct", label: "Venda directa", description: "Checkout imediato" },
      { value: "qualify", label: "Qualificação primeiro", description: "Filtrar antes de vender" },
    ],
  },
  {
    id: "customDomain",
    question: "Pretendes domínio próprio?",
    type: "single",
    options: [
      { value: "yes", label: "Sim", description: "Usar domínio personalizado" },
      { value: "no", label: "Não", description: "Usar domínio do sistema" },
    ],
  },
  {
    id: "aiCopy",
    question: "Queres que a IA escreva a copy inicial?",
    type: "single",
    options: [
      { value: "yes", label: "Sim, por favor!", description: "Headlines, dores, promessa e CTA" },
      { value: "no", label: "Não, escrevo eu", description: "Configurar depois manualmente" },
    ],
  },
];

interface Props {
  onRecommendation: (rec: AIFunnelRecommendation) => void;
}

export function AIFunnelWizard({ onRecommendation }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const { getCost } = useCreditWallet();
  const funnelCost = getCost("ai_funnel_essential");

  const step = WIZARD_STEPS[currentStep];
  const isLast = currentStep === WIZARD_STEPS.length - 1;
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleAnswer = (value: string) => {
    if (step.type === "multi") {
      const current = (answers[step.id] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [step.id]: updated });
    } else {
      setAnswers({ ...answers, [step.id]: value });
    }
  };

  const canProceed = () => {
    const val = answers[step.id];
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    return val.trim().length > 0;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate AI generation (will be replaced with real AI call)
    setTimeout(() => {
      const rec: AIFunnelRecommendation = {
        vertical: "Serviços Profissionais",
        pageTemplate: answers.capture === "masterclass" ? "Masterclass de Conversão" : "Lead Magnet",
        captureType: (answers.capture as string) || "form",
        objective: (answers.objective as string) || "leads",
        headline: `Descubra Como ${answers.product || "Transformar o Seu Negócio"}`,
        subheadline: `Para ${answers.audience || "profissionais"} que querem resultados reais`,
        ctaPrimary: answers.capture === "whatsapp" ? "Falar no WhatsApp" : "Inscrever-me Agora",
        ctaSecondary: "Saber mais",
        funnelSteps: [
          { name: "Landing Page", type: "page", description: "Página de captura" },
          { name: "Captação", type: (answers.capture as string) || "optin", description: "Formulário/quiz/registo" },
          { name: "Obrigado", type: "thankyou", description: "Página de confirmação" },
        ],
        routing: { pipeline: "Vendas", tags: ["wizard-generated"], sla: "24h" },
        automations: [
          { trigger: "lead_submit", action: "Enviar email de confirmação", channel: "email" },
          { trigger: "lead_submit", action: "Notificar equipa", channel: "notification" },
        ],
        tracking: ["PageView", "CTA_Click", "Form_Start", "Lead_Submit"],
        kpis: ["Visitas", "Taxa de conversão", "Leads gerados", "Custo por lead"],
        slug: (answers.product as string || "funil").toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30),
        domain: answers.customDomain === "yes" ? "custom.seudominio.pt" : "sistema.fastcrm.app",
        thankYou: "Redirect para página de obrigado com próximos passos",
        seo: {
          title: `${answers.product || "Oferta"} | ${answers.audience || "Profissionais"}`,
          description: `Descubra como ${answers.product || "transformar o seu negócio"}. Para ${answers.audience || "profissionais"}.`,
        },
        reasoning: `Baseado nas suas respostas: objectivo "${answers.objective}", ticket "${answers.ticket}", tráfego "${Array.isArray(answers.traffic) ? answers.traffic.join(", ") : answers.traffic}". ${answers.capture === "masterclass" ? "A masterclass é ideal para educar antes da venda." : "O formato escolhido é adequado ao objectivo."}`,
      };
      onRecommendation(rec);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Passo {currentStep + 1} de {WIZARD_STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">{step.question}</h3>

          {step.type === "text" && (
            <Input
              value={(answers[step.id] as string) || ""}
              onChange={(e) => setAnswers({ ...answers, [step.id]: e.target.value })}
              placeholder="Escreve a tua resposta..."
              className="text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canProceed()) {
                  if (isLast) handleGenerate();
                  else setCurrentStep((s) => s + 1);
                }
              }}
            />
          )}

          {step.type === "single" && step.options && (
            <RadioGroup
              value={(answers[step.id] as string) || ""}
              onValueChange={(val) => handleAnswer(val)}
              className="grid gap-3"
            >
              {step.options.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    answers[step.id] === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <div>
                    <span className="font-medium text-sm">{opt.label}</span>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          {step.type === "multi" && step.options && (
            <div className="grid gap-3 sm:grid-cols-2">
              {step.options.map((opt) => {
                const selected = ((answers[step.id] as string[]) || []).includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                    }`}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => handleAnswer(opt.value)}
                    />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {isLast ? (
            <Button
              onClick={handleGenerate}
              disabled={!canProceed() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Funil com IA
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    <Coins className="h-2.5 w-2.5 mr-0.5" />
                    {funnelCost}
                  </Badge>
                </>
          ) : (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Seguinte
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
