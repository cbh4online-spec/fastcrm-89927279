import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useCreateBioPage } from "@/hooks/useBioPages";
import { useCreateBioBlock } from "@/hooks/useBioBlocks";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BioAIWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageCreated: (pageId: string) => void;
}

const VERTICALS = ["Consultoria", "Fitness", "Imobiliário", "Tecnologia", "Saúde", "Educação", "E-commerce", "Restauração"];
const OBJECTIVES = ["Captar leads", "Vender produto", "Agendar reunião", "Portfolio", "Branding pessoal", "Comunidade"];
const TONES = ["Profissional", "Casual", "Energético", "Elegante", "Minimalista", "Divertido"];

type Step = 0 | 1 | 2 | 3;

export function BioAIWizard({ open, onOpenChange, onPageCreated }: BioAIWizardProps) {
  const [step, setStep] = useState<Step>(0);
  const [vertical, setVertical] = useState("");
  const [customVertical, setCustomVertical] = useState("");
  const [objective, setObjective] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const createPage = useCreateBioPage();
  const createBlock = useCreateBioBlock();

  const effectiveVertical = vertical === "__custom" ? customVertical : vertical;
  const effectiveObjective = objective === "__custom" ? customObjective : objective;
  const effectiveTone = tone === "__custom" ? customTone : tone;

  const canAdvance = () => {
    if (step === 0) return !!effectiveVertical.trim();
    if (step === 1) return !!effectiveObjective.trim();
    if (step === 2) return !!offer.trim();
    if (step === 3) return !!effectiveTone.trim();
    return false;
  };

  const reset = () => {
    setStep(0);
    setVertical("");
    setCustomVertical("");
    setObjective("");
    setCustomObjective("");
    setOffer("");
    setTone("");
    setCustomTone("");
    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("bio-ai-builder", {
        body: {
          vertical: effectiveVertical,
          objective: effectiveObjective,
          offer,
          tone: effectiveTone,
        },
      });

      if (error) throw new Error(error.message || "Erro ao gerar página");
      if (data?.error) throw new Error(data.error);

      const page = await createPage.mutateAsync({
        name: data.pageName,
        slug: data.slug,
        primary_color: data.primaryColor,
      });

      for (let i = 0; i < data.blocks.length; i++) {
        const block = data.blocks[i];
        await createBlock.mutateAsync({
          bio_page_id: page.id,
          block_type: block.type,
          content: block.content || {},
          order_index: i,
        });
      }

      toast.success("Página gerada com IA!");
      onOpenChange(false);
      reset();
      onPageCreated(page.id);
    } catch (e: any) {
      console.error("AI wizard error:", e);
      toast.error(e.message || "Erro ao gerar página com IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderChips = (
    options: string[],
    value: string,
    onChange: (v: string) => void,
    customValue: string,
    onCustomChange: (v: string) => void
  ) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Badge
            key={opt}
            variant={value === opt ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-primary/10"
            onClick={() => onChange(opt)}
          >
            {opt}
          </Badge>
        ))}
        <Badge
          variant={value === "__custom" ? "default" : "outline"}
          className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-primary/10"
          onClick={() => onChange("__custom")}
        >
          Outro...
        </Badge>
      </div>
      {value === "__custom" && (
        <Input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Escreve aqui..."
          autoFocus
        />
      )}
    </div>
  );

  const steps = [
    {
      title: "Qual é o teu nicho?",
      subtitle: "Escolhe a vertical ou escreve a tua",
      content: renderChips(VERTICALS, vertical, setVertical, customVertical, setCustomVertical),
    },
    {
      title: "Qual é o objectivo?",
      subtitle: "O que queres alcançar com esta página",
      content: renderChips(OBJECTIVES, objective, setObjective, customObjective, setCustomObjective),
    },
    {
      title: "Qual é a tua oferta principal?",
      subtitle: "Descreve brevemente o que vendes ou ofereces",
      content: (
        <Textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Ex: Consultoria de marketing digital para PMEs com foco em resultados mensuráveis..."
          rows={3}
        />
      ),
    },
    {
      title: "Tom de comunicação",
      subtitle: "Como queres soar para quem visita",
      content: renderChips(TONES, tone, setTone, customTone, setCustomTone),
    },
  ];

  const currentStep = steps[step];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isGenerating) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar com IA
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              A gerar a tua página bio com IA...<br />Isto pode demorar alguns segundos.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Progress */}
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div>
              <h3 className="font-semibold mb-1">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{currentStep.subtitle}</p>
              {currentStep.content}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>

              {step < 3 ? (
                <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance()}>
                  Seguinte <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleGenerate} disabled={!canAdvance()}>
                  <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
