import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { EbookThemeSelector } from "./EbookThemeSelector";
import { EbookImageStylePicker, IMAGE_STYLES } from "./EbookImageStylePicker";
import { DEFAULT_IMAGE_LAYOUT, SIZE_TO_ASPECT, ASPECT_TO_PROMPT, type ImageLayoutConfig } from "./EbookImageLayoutConfig";
import { TemplatePickerStep } from "./templates/TemplatePickerStep";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import { useCreateEbook } from "@/hooks/useEbooks";
import { supabase } from "@/integrations/supabase/client";
import { buildChaptersFromTemplate, countContentSlots, CONTENT_LAYOUT_KEYS, getStructuralLayouts, getPageImageType } from "./utils/templateToChapters";
import { LAYOUT_LABELS } from "@/types/ebook-templates";
import { useStartEbookGeneration, useEbookGenerationJob, useRetryEbookGeneration, getStepLabel } from "@/hooks/useEbookGenerationJob";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EbookTemplate } from "@/types/ebook-templates";
import {
  Sparkles, ArrowLeft, ArrowRight, Loader2, Minus, Plus,
  BookOpen, Palette, ImageIcon, Coins, Wand2, LayoutGrid,
  Target, ListChecks, X, AlertCircle, RotateCcw
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

const AUDIENCES = [
  { id: "entrepreneurs", label: "Empreendedores" },
  { id: "managers", label: "Gestores" },
  { id: "students", label: "Estudantes" },
  { id: "marketers", label: "Profissionais de Marketing" },
  { id: "developers", label: "Desenvolvedores" },
  { id: "general", label: "Público Geral" },
];

const OBJECTIVES = [
  { id: "educate", label: "Educar", icon: "📚" },
  { id: "lead_gen", label: "Gerar leads", icon: "🧲" },
  { id: "authority", label: "Posicionar autoridade", icon: "👑" },
  { id: "sell", label: "Vender produto/serviço", icon: "💰" },
  { id: "onboarding", label: "Onboarding", icon: "🚀" },
];

const DEPTHS = [
  { id: "introductory", label: "Introdutório", desc: "Conceitos básicos, acessível a todos" },
  { id: "intermediate", label: "Intermédio", desc: "Algum conhecimento prévio necessário" },
  { id: "advanced", label: "Avançado", desc: "Conteúdo técnico e aprofundado" },
];

const SPECIAL_ELEMENTS = [
  { id: "case_studies", label: "Estudos de caso", icon: "📋" },
  { id: "statistics", label: "Estatísticas", icon: "📊" },
  { id: "checklists", label: "Checklists", icon: "✅" },
  { id: "templates", label: "Templates práticos", icon: "📝" },
  { id: "quotes", label: "Citações", icon: "💬" },
  { id: "exercises", label: "Exercícios", icon: "🏋️" },
];

interface Props {
  onComplete: (ebookId: string) => void;
  onCancel: () => void;
}

export function EbookWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EbookTemplate | null>(null);

  // Step 1 — Tema & Objectivo
  const [prompt, setPrompt] = useState("");
  const [audience, setAudience] = useState<string | null>(null);
  const [objective, setObjective] = useState<string | null>(null);
  const [depth, setDepth] = useState("intermediate");

  // Step 2 — Estrutura & Estilo
  const [chapterCount, setChapterCount] = useState(7);
  const [tone, setTone] = useState("professional");
  const [mode, setMode] = useState("generate");
  const [specialElements, setSpecialElements] = useState<string[]>([]);
  const [contentKeywords, setContentKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // Step 3 & 4
  const [theme, setTheme] = useState("modern-dark");
  const [imageStyle, setImageStyle] = useState("illustration");
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);
  const [generateImages, setGenerateImages] = useState(true);
  const [imageLayout, setImageLayout] = useState<ImageLayoutConfig>(DEFAULT_IMAGE_LAYOUT);

  // Generation state — async job-based
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { data: activeJob } = useEbookGenerationJob(activeJobId);
  const startGeneration = useStartEbookGeneration();
  const retryGeneration = useRetryEbookGeneration();

  const generating = activeJob?.status === "queued" || activeJob?.status === "running";
  const genProgress = activeJob?.progress || 0;
  const genStatus = activeJob ? getStepLabel(activeJob.current_step) : "";
  const genFailed = activeJob?.status === "failed";

  // Auto-navigate on completion
  const completedRef = useRef(false);
  useEffect(() => {
    if (activeJob?.status === "completed" && !completedRef.current) {
      completedRef.current = true;
      const ebookId = (activeJob.result as any)?.ebook_id || activeJob.ebook_id;
      if (ebookId) {
        toast.success("eBook gerado com sucesso! 🎉");
        setTimeout(() => onComplete(ebookId), 600);
      }
    }
  }, [activeJob?.status]);
  const { getCost, balance } = useCreditWallet();

  const outlineCost = getCost("ebook_generate_full") || 15;
  const chapterCost = getCost("ebook_generate_chapter") || 3;
  const imageCost = getCost("ebook_generate_chapter_image") || 4;
  const coverCost = getCost("ebook_generate_cover") || 5;

  const totalContentCredits = mode === "generate"
    ? outlineCost + (chapterCount * chapterCost)
    : outlineCost;

  // Calculate image credits based on actual page type distribution
  const estimateImageCredits = () => {
    if (!generateImages) return coverCost;
    // Estimate: cover pages = 1, chapter pages ≈ chapterCount, content pages ≈ chapterCount, cta pages ≈ 1
    const coverImages = imageLayout.cover.count * 1;
    const chapterImages = imageLayout.chapter.count * chapterCount;
    const contentImages = imageLayout.content.count * chapterCount;
    const ctaImages = imageLayout.cta.count * 1;
    const totalImages = coverImages + chapterImages + contentImages + ctaImages;
    return coverCost + (totalImages * imageCost);
  };
  const totalImageCredits = estimateImageCredits();
  const totalCredits = totalContentCredits + totalImageCredits;

  const canProceedStep1 = prompt.trim().length > 10;

  const toggleSpecialElement = (id: string) => {
    setSpecialElements(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !contentKeywords.includes(kw)) {
      setContentKeywords(prev => [...prev, kw]);
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setContentKeywords(prev => prev.filter(k => k !== kw));
  };

  const handleGenerate = async () => {
    if (balance < totalCredits) {
      triggerNoCreditsDialog({ actionLabel: "Gerar eBook Completo", creditsNeeded: totalCredits });
      return;
    }

    try {
      const result = await startGeneration.mutateAsync({
        prompt: prompt.trim(),
        chapterCount,
        tone,
        mode,
        audience: AUDIENCES.find(a => a.id === audience)?.label,
        objective: OBJECTIVES.find(o => o.id === objective)?.label,
        depth: DEPTHS.find(d => d.id === depth)?.label,
        specialElements: specialElements.map(id => SPECIAL_ELEMENTS.find(e => e.id === id)?.label).filter(Boolean) as string[],
        contentKeywords,
        theme,
        imageStyle,
        imageKeywords,
        generateImages,
        templateId: selectedTemplateId || undefined,
        templateStyles: selectedTemplate?.style_tokens ? { ...selectedTemplate.style_tokens } : undefined,
      });

      setActiveJobId(result.jobId);
    } catch (e: any) {
      toast.error("Erro ao iniciar geração: " + e.message);
    }
  };

  const handleRetry = async () => {
    if (!activeJobId) return;
    try {
      await retryGeneration.mutateAsync(activeJobId);
    } catch (e: any) {
      toast.error("Erro ao retomar: " + e.message);
    }
  };

  const steps = [
    { icon: LayoutGrid, label: "Template" },
    { icon: Target, label: "Tema" },
    { icon: ListChecks, label: "Estrutura" },
    { icon: Palette, label: "Visual" },
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
        <p className="text-sm text-muted-foreground">5 passos simples para gerar um eBook completo automaticamente</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <button
                onClick={() => !generating && i <= step && setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all",
                  i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                  i < step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
              {i < steps.length - 1 && <div className={cn("w-6 h-0.5 rounded", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Generating overlay */}
      {(generating || genFailed) && (
        <Card className={cn("border-primary/30 bg-gradient-to-br from-primary/5 to-background", genFailed && "border-destructive/30")}>
          <CardContent className="py-12 text-center space-y-4">
            {genFailed ? (
              <>
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-foreground">Erro na geração</h3>
                  <p className="text-sm text-muted-foreground">{activeJob?.error_message || "Erro desconhecido"}</p>
                  {activeJob?.error_step && (
                    <p className="text-xs text-muted-foreground">Falhou no passo: {getStepLabel(activeJob.error_step)}</p>
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                  <Button onClick={handleRetry} className="bg-gradient-to-r from-primary to-primary/80">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retomar geração
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-foreground">A gerar o seu eBook...</h3>
                  <p className="text-sm text-muted-foreground">{genStatus}</p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={genProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{genProgress}%</p>
                </div>
                <p className="text-xs text-muted-foreground">Pode fechar esta janela — a geração continuará em segundo plano.</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steps content */}
      {!generating && !genFailed && (
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Step 0: Template */}
                {step === 0 && (
                  <TemplatePickerStep
                    selectedTemplateId={selectedTemplateId}
                    onSelect={(id, tpl) => {
                      setSelectedTemplateId(id);
                      setSelectedTemplate(tpl);
                      // Auto-sync chapterCount to template content slots
                      if (tpl && tpl.page_layouts?.length > 0) {
                        const slots = countContentSlots(tpl);
                        if (slots > 0) setChapterCount(slots);
                      }
                    }}
                  />
                )}

                {/* Step 1: Tema & Objectivo */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sobre o que é o seu eBook?</Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Um guia completo sobre produtividade para equipas remotas, abordando ferramentas, comunicação assíncrona e gestão de tempo"
                        rows={3}
                        className="resize-none"
                      />
                      {prompt.length > 0 && prompt.length <= 10 && (
                        <p className="text-xs text-destructive">Descreva com mais detalhe (mínimo 10 caracteres)</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Para quem é este eBook?</Label>
                      <div className="flex flex-wrap gap-2">
                        {AUDIENCES.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => setAudience(audience === a.id ? null : a.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                              audience === a.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:bg-muted"
                            )}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Qual o objectivo principal?</Label>
                      <div className="flex flex-wrap gap-2">
                        {OBJECTIVES.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setObjective(objective === o.id ? null : o.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                              objective === o.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:bg-muted"
                            )}
                          >
                            <span>{o.icon}</span>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nível de profundidade</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {DEPTHS.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setDepth(d.id)}
                            className={cn(
                              "p-3 rounded-xl border-2 text-left transition-all",
                              depth === d.id
                                ? "border-primary bg-primary/5"
                                : "border-border/60 hover:border-primary/30"
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">{d.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{d.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: Estrutura & Estilo */}
                {step === 2 && (
                  <>
                    {/* Template structure preview */}
                    {selectedTemplate && selectedTemplate.page_layouts?.length > 0 && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-medium text-primary">Estrutura do template: {selectedTemplate.name}</Label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTemplate.page_layouts.map((key, i) => {
                            const isContent = CONTENT_LAYOUT_KEYS.includes(key);
                            return (
                              <div key={i} className="flex items-center gap-1">
                                <Badge
                                  variant={isContent ? "default" : "secondary"}
                                  className={cn(
                                    "text-[10px] py-0.5",
                                    isContent ? "bg-primary/20 text-primary border-primary/30" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {LAYOUT_LABELS[key] || key}
                                  <span className="ml-1 opacity-60">{isContent ? "IA" : "auto"}</span>
                                </Badge>
                                {i < selectedTemplate.page_layouts.length - 1 && (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {countContentSlots(selectedTemplate)} capítulos de conteúdo (IA) + {getStructuralLayouts(selectedTemplate).length} páginas estruturais (automáticas) = {selectedTemplate.page_layouts.length} páginas total
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Número de capítulos</Label>
                        {selectedTemplate && countContentSlots(selectedTemplate) > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-primary w-10 text-center">{chapterCount}</span>
                              <span className="text-xs text-muted-foreground">definido pelo template</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              O template define {countContentSlots(selectedTemplate)} slots de conteúdo. Pode ajustar — capítulos extra serão adicionados após a estrutura do template.
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChapterCount(Math.max(1, chapterCount - 1))} disabled={chapterCount <= 1}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChapterCount(Math.min(15, chapterCount + 1))} disabled={chapterCount >= 15}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setChapterCount(Math.max(3, chapterCount - 1))} disabled={chapterCount <= 3}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-2xl font-bold text-foreground w-10 text-center">{chapterCount}</span>
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setChapterCount(Math.min(15, chapterCount + 1))} disabled={chapterCount >= 15}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Elementos especiais a incluir</Label>
                      <p className="text-xs text-muted-foreground">Selecione os tipos de conteúdo que pretende no eBook</p>
                      <div className="flex flex-wrap gap-2">
                        {SPECIAL_ELEMENTS.map((el) => (
                          <button
                            key={el.id}
                            onClick={() => toggleSpecialElement(el.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                              specialElements.includes(el.id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30 hover:bg-muted"
                            )}
                          >
                            <span>{el.icon}</span>
                            {el.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Palavras-chave do conteúdo</Label>
                      <p className="text-xs text-muted-foreground">Adicione termos que devem aparecer no eBook</p>
                      <div className="flex gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                          placeholder="Ex: ROI, conversão, funil..."
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={addKeyword} disabled={!keywordInput.trim()}>
                          Adicionar
                        </Button>
                      </div>
                      {contentKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {contentKeywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                              {kw}
                              <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Step 3: Visual */}
                {step === 3 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Escolha um tema visual</Label>
                    <EbookThemeSelector value={theme} onChange={setTheme} />
                  </div>
                )}

                {/* Step 4: Imagens */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Estilo artístico das imagens</Label>
                      <EbookImageStylePicker
                        value={imageStyle}
                        onChange={setImageStyle}
                        keywords={imageKeywords}
                        onKeywordsChange={setImageKeywords}
                        imageLayout={imageLayout}
                        onImageLayoutChange={setImageLayout}
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

          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !canProceedStep1}>
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
