import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, CheckCircle2,
  Briefcase, Dumbbell, Building2, Code, Heart, GraduationCap, ShoppingBag, UtensilsCrossed,
  Target, ShoppingCart, Calendar, Layout, User, Users,
  Coffee, Zap, Crown, Minus, Smile,
  Wand2, Palette, Type, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateBioPage } from "@/hooks/useBioPages";
import { useCreateBioBlock } from "@/hooks/useBioBlocks";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BioAIWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageCreated: (pageId: string) => void;
}

interface OptionItem {
  label: string;
  icon: LucideIcon;
}

const VERTICALS: OptionItem[] = [
  { label: "Consultoria", icon: Briefcase },
  { label: "Fitness", icon: Dumbbell },
  { label: "Imobiliário", icon: Building2 },
  { label: "Tecnologia", icon: Code },
  { label: "Saúde", icon: Heart },
  { label: "Educação", icon: GraduationCap },
  { label: "E-commerce", icon: ShoppingBag },
  { label: "Restauração", icon: UtensilsCrossed },
];

const OBJECTIVES: OptionItem[] = [
  { label: "Captar leads", icon: Target },
  { label: "Vender produto", icon: ShoppingCart },
  { label: "Agendar reunião", icon: Calendar },
  { label: "Portfolio", icon: Layout },
  { label: "Branding pessoal", icon: User },
  { label: "Comunidade", icon: Users },
];

const TONES: OptionItem[] = [
  { label: "Profissional", icon: Briefcase },
  { label: "Casual", icon: Coffee },
  { label: "Energético", icon: Zap },
  { label: "Elegante", icon: Crown },
  { label: "Minimalista", icon: Minus },
  { label: "Divertido", icon: Smile },
];

const LOADING_MESSAGES = [
  { icon: Wand2, text: "A analisar o teu nicho..." },
  { icon: Type, text: "A criar copy persuasivo..." },
  { icon: Palette, text: "A escolher as cores perfeitas..." },
  { icon: BarChart3, text: "A optimizar para conversão..." },
  { icon: Sparkles, text: "A dar os toques finais..." },
];

const STEP_LABELS = [
  "O teu nicho",
  "O teu objectivo",
  "A tua oferta",
  "O teu tom",
];

type WizardPhase = "steps" | "generating" | "success";

// -- Animation variants --
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

function OptionCard({
  item,
  selected,
  onClick,
}: {
  item: OptionItem;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors cursor-pointer",
        "hover:border-primary/50 hover:shadow-md hover:shadow-primary/10",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
          : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className={cn("text-xs font-medium text-center leading-tight", selected && "text-primary")}>
        {item.label}
      </span>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-3 w-3" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function BioAIWizard({ open, onOpenChange, onPageCreated }: BioAIWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [vertical, setVertical] = useState("");
  const [customVertical, setCustomVertical] = useState("");
  const [objective, setObjective] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [phase, setPhase] = useState<WizardPhase>("steps");
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [generatedName, setGeneratedName] = useState("");

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

  const reset = useCallback(() => {
    setStep(0);
    setDirection(1);
    setVertical("");
    setCustomVertical("");
    setObjective("");
    setCustomObjective("");
    setOffer("");
    setTone("");
    setCustomTone("");
    setPhase("steps");
    setLoadingMsg(0);
    setFakeProgress(0);
    setGeneratedName("");
  }, []);

  // Loading message rotation
  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setLoadingMsg((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phase]);

  // Fake progress
  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setFakeProgress((p) => Math.min(p + 2, 90));
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleGenerate = async () => {
    setPhase("generating");
    setFakeProgress(0);
    setLoadingMsg(0);
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

      setFakeProgress(100);
      setGeneratedName(data.pageName || "Nova Página");

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

      // Show success screen briefly
      setPhase("success");
      setTimeout(() => {
        onOpenChange(false);
        reset();
        onPageCreated(page.id);
        toast.success("Página gerada com IA!");
      }, 1800);
    } catch (e: any) {
      console.error("AI wizard error:", e);
      toast.error(e.message || "Erro ao gerar página com IA");
      setPhase("steps");
    }
  };

  const renderOptions = (
    options: OptionItem[],
    value: string,
    onChange: (v: string) => void,
    customValue: string,
    onCustomChange: (v: string) => void
  ) => (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {options.map((opt) => (
          <OptionCard
            key={opt.label}
            item={opt}
            selected={value === opt.label}
            onClick={() => onChange(opt.label)}
          />
        ))}
        <OptionCard
          item={{ label: "Outro...", icon: Sparkles }}
          selected={value === "__custom"}
          onClick={() => onChange("__custom")}
        />
      </div>
      <AnimatePresence>
        {value === "__custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Input
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="Escreve aqui..."
              autoFocus
              className="mt-2"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const stepsConfig = [
    {
      title: "Qual é o teu nicho?",
      subtitle: "Escolhe a vertical do teu negócio",
      content: renderOptions(VERTICALS, vertical, setVertical, customVertical, setCustomVertical),
    },
    {
      title: "Qual é o objectivo?",
      subtitle: "O que queres alcançar com esta página",
      content: renderOptions(OBJECTIVES, objective, setObjective, customObjective, setCustomObjective),
    },
    {
      title: "Qual é a tua oferta principal?",
      subtitle: "Descreve brevemente o que vendes ou ofereces",
      content: (
        <Textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Ex: Consultoria de marketing digital para PMEs com foco em resultados mensuráveis..."
          rows={4}
          className="resize-none"
        />
      ),
    },
    {
      title: "Tom de comunicação",
      subtitle: "Como queres soar para quem visita a página",
      content: renderOptions(TONES, tone, setTone, customTone, setCustomTone),
    },
  ];

  const LoadingIcon = LOADING_MESSAGES[loadingMsg].icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (phase === "generating" || phase === "success") return;
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 gap-0">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 -z-10" />

        {phase === "steps" && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header with progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {step + 1}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Passo {step + 1} de 4 — {STEP_LABELS[step]}
                  </span>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <Progress value={((step + 1) / 4) * 100} className="h-1.5" />
            </div>

            {/* Step content with animation */}
            <div className="min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <h3 className="text-xl font-bold mb-1">{stepsConfig[step].title}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{stepsConfig[step].subtitle}</p>
                  {stepsConfig[step].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button variant="ghost" onClick={goPrev} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              {step < 3 ? (
                <Button onClick={goNext} disabled={!canAdvance()}>
                  Seguinte <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!canAdvance()}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" /> Gerar com IA
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 px-8 space-y-8">
            {/* Pulsing icon */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={loadingMsg}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LoadingIcon className="h-10 w-10 text-primary" />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              {/* Glow ring */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10 scale-150"
              />
            </div>

            {/* Rotating text */}
            <div className="text-center space-y-2 min-h-[60px]">
              <h3 className="text-lg font-semibold">A criar a tua página...</h3>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsg}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-muted-foreground"
                >
                  {LOADING_MESSAGES[loadingMsg].text}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs space-y-1">
              <Progress value={fakeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{fakeProgress}%</p>
            </div>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center justify-center py-16 px-8 space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            >
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <h3 className="text-xl font-bold">Página criada!</h3>
              <p className="text-sm text-muted-foreground">
                "{generatedName}" está pronta para personalizar
              </p>
            </motion.div>
            {/* Confetti dots */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: 0, y: 0, scale: 0, opacity: 1,
                }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 200,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.2, delay: i * 0.05 }}
                className="absolute h-2 w-2 rounded-full"
                style={{
                  background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                  top: "50%",
                  left: "50%",
                }}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
