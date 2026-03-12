import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateFunnelStep, FunnelStep } from "@/hooks/useFunnels";
import { Save, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppearanceEditor, defaultAppearance, type AppearanceValues } from "@/components/funnels/AppearanceEditor";
import { supabase } from "@/integrations/supabase/client";

interface FunnelStepEditorProps {
  step: FunnelStep;
  funnelName?: string;
  funnelType?: string;
}

const AI_SUGGESTIONS: Record<string, string[]> = {
  optin: [
    "Cria uma página de captura para um curso gratuito",
    "Gera copy para captar emails com oferta de ebook",
    "Página de opt-in para webinar sobre vendas online",
  ],
  checkout: [
    "Cria copy de urgência para checkout com garantia",
    "Página de checkout com escassez e prova social",
    "Copy de checkout para produto digital premium",
  ],
  thankyou: [
    "Página de obrigado com próximos passos claros",
    "Thank you page com upsell subtil",
    "Confirmação de compra com instrução de acesso",
  ],
  upsell: [
    "Upsell com desconto exclusivo de 50%",
    "Oferta complementar irresistível pós-compra",
    "Bump offer com benefício extra limitado",
  ],
  page: [
    "Landing page para serviço de consultoria",
    "Página de vendas com benefícios e prova social",
    "Página sobre nós com história da marca",
  ],
};

export function FunnelStepEditor({ step, funnelName, funnelType }: FunnelStepEditorProps) {
  const updateStep = useUpdateFunnelStep();
  const content = (step.content || {}) as Record<string, string>;

  const [headline, setHeadline] = useState(content.headline || "");
  const [subheadline, setSubheadline] = useState(content.subheadline || "");
  const [bodyText, setBodyText] = useState(content.body || "");
  const [ctaText, setCtaText] = useState(content.cta_text || "Começar Agora");
  const [ctaColor, setCtaColor] = useState(content.cta_color || "#3b82f6");
  const [appearance, setAppearance] = useState<AppearanceValues>(() => {
    const design = (step.content as Record<string, unknown>)?.design as Partial<AppearanceValues> | undefined;
    return { ...defaultAppearance, ...design };
  });

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const c = (step.content || {}) as Record<string, unknown>;
    setHeadline((c.headline as string) || "");
    setSubheadline((c.subheadline as string) || "");
    setBodyText((c.body as string) || "");
    setCtaText((c.cta_text as string) || "Começar Agora");
    setCtaColor((c.cta_color as string) || "#3b82f6");
    const design = c.design as Partial<AppearanceValues> | undefined;
    setAppearance({ ...defaultAppearance, ...design });
  }, [step.id]);

  const handleSave = () => {
    updateStep.mutate({
      id: step.id,
      content: { headline, subheadline, body: bodyText, cta_text: ctaText, cta_color: ctaColor, design: appearance },
    });
    toast.success("Step guardado");
  };

  const handleAIGenerate = async (prompt?: string) => {
    const finalPrompt = prompt || aiPrompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-funnel-content", {
        body: {
          prompt: finalPrompt,
          stepType: step.step_type,
          currentContent: { headline, subheadline, body: bodyText, cta_text: ctaText },
          funnelName,
          funnelType,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar");

      const generated = data.content;
      if (generated.headline) setHeadline(generated.headline);
      if (generated.subheadline) setSubheadline(generated.subheadline);
      if (generated.body) setBodyText(generated.body);
      if (generated.cta_text) setCtaText(generated.cta_text);

      setAiPrompt("");
      toast.success("Conteúdo gerado com IA!", { description: "Revisa e ajusta antes de guardar." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar conteúdo");
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestions = AI_SUGGESTIONS[step.step_type] || AI_SUGGESTIONS.page;

  return (
    <div className="space-y-4">
      {/* AI Prompt Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI Content Generator</span>
          </div>

          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Descreve o que queres... ex: Página de vendas para curso de marketing digital"
              className="flex-1 bg-background"
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAIGenerate();
                }
              }}
            />
            <Button
              onClick={() => handleAIGenerate()}
              disabled={isGenerating || !aiPrompt.trim()}
              className="shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              {isGenerating ? "A gerar..." : "Gerar"}
            </Button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setAiPrompt(s);
                  handleAIGenerate(s);
                }}
                disabled={isGenerating}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conteudo">
        <TabsList>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conteúdo do Step</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Título principal" />
                </div>
                <div>
                  <Label>Subtítulo</Label>
                  <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Subtítulo" />
                </div>
                <div>
                  <Label>Corpo</Label>
                  <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6} placeholder="Conteúdo da página..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Texto do CTA</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                  <div>
                    <Label>Cor do CTA</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="w-12 h-9 p-1" />
                      <Input value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pré-visualização</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded-lg p-6 min-h-[300px] space-y-4"
                  style={{
                    backgroundColor: appearance.background,
                    color: appearance.text_color,
                    fontFamily: appearance.font_body,
                    fontSize: `${appearance.font_size_base}px`,
                    borderRadius: `${appearance.border_radius}px`,
                  }}
                >
                  {headline && (
                    <h2 className="text-2xl" style={{ fontFamily: appearance.font_heading, fontWeight: appearance.heading_weight, color: appearance.text_color }}>
                      {headline}
                    </h2>
                  )}
                  {subheadline && <p className="text-lg" style={{ opacity: 0.7 }}>{subheadline}</p>}
                  {bodyText && <p className="text-sm whitespace-pre-wrap">{bodyText}</p>}
                  {ctaText && (
                    <button
                      className="px-6 py-3 text-white font-medium"
                      style={{
                        backgroundColor: appearance.cta_style === "outline" ? "transparent" : (appearance.cta_style === "gradient" ? undefined : appearance.primaria),
                        background: appearance.cta_style === "gradient" ? `linear-gradient(135deg, ${appearance.primaria}, ${appearance.accent})` : undefined,
                        border: appearance.cta_style === "outline" ? `2px solid ${appearance.primaria}` : "none",
                        color: appearance.cta_style === "outline" ? appearance.primaria : "#fff",
                        borderRadius: `${appearance.border_radius}px`,
                      }}
                    >
                      {ctaText}
                    </button>
                  )}
                  {!headline && !subheadline && !bodyText && (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                      <span className="text-3xl">✏️</span>
                      <p>Preenche o editor para ver a pré-visualização</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design">
          <AppearanceEditor values={appearance} onChange={setAppearance} />
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={updateStep.isPending}>
        <Save className="h-4 w-4 mr-2" />
        Guardar
      </Button>
    </div>
  );
}
