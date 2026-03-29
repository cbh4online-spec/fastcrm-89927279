import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { EbookThemeSelector } from "./EbookThemeSelector";
import { EbookImageStylePicker, IMAGE_STYLES } from "./EbookImageStylePicker";
import { TemplatePickerStep } from "./templates/TemplatePickerStep";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import { useCreateEbook } from "@/hooks/useEbooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EbookTemplate } from "@/types/ebook-templates";
import {
  Sparkles, ArrowLeft, ArrowRight, Loader2, Minus, Plus,
  BookOpen, Palette, ImageIcon, Coins, Wand2, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TONES = [
  { id: "professional", label: "Profissional" },
  { id: "educational", label: "Educativo" },
  { id: "informal", label: "Informal" },
  { id: "storytelling", label: "Storytelling" },
];

const MODES = [
  { id: "generate", label: "Gerar", desc: "Cria tudo automaticamente" },
  { id: "structure", label: "Estruturar", desc: "Só títulos e tópicos" },
];

interface Props {
  onComplete: (ebookId: string) => void;
  onCancel: () => void;
}

export function EbookWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EbookTemplate | null>(null);
  const [prompt, setPrompt] = useState("");
  const [chapterCount, setChapterCount] = useState(7);
  const [tone, setTone] = useState("professional");
  const [mode, setMode] = useState("generate");
  const [theme, setTheme] = useState("modern-dark");
  const [imageStyle, setImageStyle] = useState("illustration");
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);
  const [generateImages, setGenerateImages] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState("");

  const { canAfford, getCost, consumeCredits, balance } = useCreditWallet();
  const createEbook = useCreateEbook();

  // Calculate estimated credits
  const outlineCost = getCost("ebook_generate_full") || 15;
  const chapterCost = getCost("ebook_generate_chapter") || 3;
  const imageCost = getCost("ebook_generate_chapter_image") || 4;
  const coverCost = getCost("ebook_generate_cover") || 5;

  const totalContentCredits = mode === "generate"
    ? outlineCost + (chapterCount * chapterCost)
    : outlineCost;
  const totalImageCredits = generateImages ? coverCost + (chapterCount * imageCost) : coverCost;
  const totalCredits = totalContentCredits + totalImageCredits;

  const canProceed = prompt.trim().length > 10;

  const handleGenerate = async () => {
    if (balance < totalCredits) {
      triggerNoCreditsDialog({ actionLabel: "Gerar eBook Completo", creditsNeeded: totalCredits });
      return;
    }

    setGenerating(true);
    setGenProgress(0);
    setGenStatus("A gerar estrutura...");

    try {
      // Step 1: Generate outline
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_full", idempotencyKey: `wizard-${Date.now()}` });

      const { data: outlineData, error: outlineErr } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_outline", title: prompt.trim(), chapterCount, tone },
      });
      if (outlineErr) throw outlineErr;
      if (outlineData?.error) throw new Error(outlineData.error);

      const result = outlineData?.result;
      if (!result) throw new Error("Sem resultado do outline");

      const chapters = (result.chapters || []).map((ch: any, i: number) => ({
        id: `ch-${i}`,
        title: ch.title,
        description: ch.description,
        content: "",
        sections: ch.sections || [],
      }));

      setGenProgress(15);

      // Step 2: Create the ebook
      const ebook = await createEbook.mutateAsync({
        title: result.title || prompt.trim(),
        subtitle: result.subtitle,
        chapters,
      });

      // Save theme/style via direct update
      await (supabase as any).from("ebooks").update({
        theme, image_style: imageStyle, image_keywords: imageKeywords
      }).eq("id", ebook.id);

      setGenProgress(20);

      // Step 3: Generate chapter content (if mode === "generate")
      if (mode === "generate") {
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          setGenStatus(`A escrever capítulo ${i + 1}/${chapters.length}: ${ch.title}`);

          if (!canAfford("ebook_generate_chapter")) {
            toast.warning(`Créditos insuficientes. Gerados ${i} de ${chapters.length} capítulos.`);
            break;
          }

          await consumeCredits.mutateAsync({
            actionKey: "ebook_generate_chapter",
            referenceType: "ebook",
            referenceId: ebook.id,
          });

          const { data: chData, error: chErr } = await supabase.functions.invoke("ebook-ai-assist", {
            body: { action: "generate_chapter", title: result.title, chapterTitle: ch.title, chapterContext: ch.description || "", tone },
          });

          if (!chErr && chData?.content) {
            chapters[i] = { ...chapters[i], content: chData.content };
          }

          const contentProgress = 20 + ((i + 1) / chapters.length) * (generateImages ? 50 : 75);
          setGenProgress(Math.round(contentProgress));
        }

        // Save updated chapters with content
        await (supabase as any).from("ebooks").update({
          chapters,
          updated_at: new Date().toISOString(),
        }).eq("id", ebook.id);
      }

      // Step 4: Generate cover
      setGenStatus("A gerar capa...");
      if (canAfford("ebook_generate_cover")) {
        await consumeCredits.mutateAsync({
          actionKey: "ebook_generate_cover",
          referenceType: "ebook",
          referenceId: ebook.id,
        });

        const styleInfo = IMAGE_STYLES.find(s => s.id === imageStyle);
        const coverPrompt = `Create a professional eBook cover image for "${result.title}". Style: ${styleInfo?.prompt || "editorial"}. ${imageKeywords.join(", ")}. No text in image.`;
        const { data: coverData } = await supabase.functions.invoke("ebook-ai-assist", {
          body: { action: "generate_image", imagePrompt: coverPrompt, ebookId: ebook.id, target: "cover" },
        });
        if (coverData?.url) {
          await (supabase as any).from("ebooks").update({ cover_url: coverData.url }).eq("id", ebook.id);
        }
      }
      setGenProgress(generateImages ? 80 : 95);

      // Step 5: Generate chapter images (optional)
      if (generateImages) {
        for (let i = 0; i < chapters.length; i++) {
          setGenStatus(`A gerar imagem ${i + 1}/${chapters.length}...`);
          if (!canAfford("ebook_generate_chapter_image")) {
            toast.warning(`Créditos insuficientes para imagens. Geradas ${i} de ${chapters.length}.`);
            break;
          }

          await consumeCredits.mutateAsync({
            actionKey: "ebook_generate_chapter_image",
            referenceType: "ebook",
            referenceId: ebook.id,
          });

          const styleInfo = IMAGE_STYLES.find(s => s.id === imageStyle);
          const imgPrompt = `Create an atmospheric illustration for chapter "${chapters[i].title}" from book "${result.title}". Style: ${styleInfo?.prompt || "editorial"}. ${imageKeywords.join(", ")}. No text. Wide format.`;
          const { data: imgData } = await supabase.functions.invoke("ebook-ai-assist", {
            body: { action: "generate_image", imagePrompt: imgPrompt, ebookId: ebook.id, target: `chapter-${chapters[i].id}` },
          });
          if (imgData?.url) {
            chapters[i] = { ...chapters[i], cover_image: imgData.url };
          }

          setGenProgress(80 + ((i + 1) / chapters.length) * 18);
        }

        await (supabase as any).from("ebooks").update({
          chapters,
          updated_at: new Date().toISOString(),
        }).eq("id", ebook.id);
      }

      setGenProgress(100);
      setGenStatus("Concluído!");
      toast.success("eBook gerado com sucesso! 🎉");

      setTimeout(() => onComplete(ebook.id), 800);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
      setGenerating(false);
    }
  };

  const steps = [
    { icon: BookOpen, label: "Conteúdo" },
    { icon: Palette, label: "Tema" },
    { icon: ImageIcon, label: "Imagens" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <Wand2 className="h-4 w-4" />
          Wizard de Criação IA
        </div>
        <h2 className="text-2xl font-bold text-foreground">Crie o seu eBook com IA</h2>
        <p className="text-sm text-muted-foreground">3 passos simples para gerar um eBook completo automaticamente</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => !generating && i <= step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                  i < step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
              {i < steps.length - 1 && <div className={cn("w-8 h-0.5 rounded", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Generating overlay */}
      {generating && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-foreground">A gerar o seu eBook...</h3>
              <p className="text-sm text-muted-foreground">{genStatus}</p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={genProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{genProgress}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps content */}
      {!generating && (
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <Card>
              <CardContent className="p-6 space-y-5">
                {step === 0 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sobre o que é o seu eBook?</Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Um guia completo sobre produtividade para equipas remotas, abordando ferramentas, comunicação assíncrona e gestão de tempo"
                        rows={4}
                        className="resize-none"
                      />
                      {prompt.length > 0 && prompt.length <= 10 && (
                        <p className="text-xs text-destructive">Descreva com mais detalhe (mínimo 10 caracteres)</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Número de capítulos</Label>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setChapterCount(Math.max(3, chapterCount - 1))} disabled={chapterCount <= 3}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-2xl font-bold text-foreground w-10 text-center">{chapterCount}</span>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setChapterCount(Math.min(15, chapterCount + 1))} disabled={chapterCount >= 15}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tom</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {TONES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setTone(t.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                tone === t.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Modo de conteúdo</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {MODES.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={cn(
                              "p-3 rounded-xl border-2 text-left transition-all",
                              mode === m.id
                                ? "border-primary bg-primary/5"
                                : "border-border/60 hover:border-primary/30"
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">{m.label}</p>
                            <p className="text-xs text-muted-foreground">{m.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Escolha um tema visual</Label>
                    <EbookThemeSelector value={theme} onChange={setTheme} />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Estilo artístico das imagens</Label>
                      <EbookImageStylePicker
                        value={imageStyle}
                        onChange={setImageStyle}
                        keywords={imageKeywords}
                        onKeywordsChange={setImageKeywords}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">Gerar imagens para cada capítulo</p>
                        <p className="text-xs text-muted-foreground">+{chapterCount * imageCost} créditos ({chapterCount} × {imageCost})</p>
                      </div>
                      <Switch checked={generateImages} onCheckedChange={setGenerateImages} />
                    </div>

                    {/* Cost summary */}
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        Custo estimado
                      </h4>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>Estrutura</span><span>{outlineCost} créditos</span></div>
                        {mode === "generate" && (
                          <div className="flex justify-between"><span>Conteúdo ({chapterCount} capítulos)</span><span>{chapterCount * chapterCost} créditos</span></div>
                        )}
                        <div className="flex justify-between"><span>Capa</span><span>{coverCost} créditos</span></div>
                        {generateImages && (
                          <div className="flex justify-between"><span>Imagens ({chapterCount} capítulos)</span><span>{chapterCount * imageCost} créditos</span></div>
                        )}
                        <div className="border-t border-border/60 pt-1 flex justify-between font-semibold text-foreground">
                          <span>Total</span>
                          <span className="text-primary">{totalCredits} créditos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Saldo atual:</span>
                        <Badge variant="outline" className={cn("text-xs", balance < totalCredits ? "border-destructive/50 text-destructive" : "border-primary/30 text-primary")}>
                          <Coins className="h-3 w-3 mr-1" />{balance}
                        </Badge>
                        {balance < totalCredits && <span className="text-destructive text-[10px]">Saldo insuficiente</span>}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Footer navigation */}
      {!generating && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !canProceed}>
              Seguinte
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={balance < totalCredits}
              className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar eBook
              <Badge variant="secondary" className="ml-2 text-[10px]">{totalCredits} <Coins className="h-2.5 w-2.5 ml-0.5" /></Badge>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
