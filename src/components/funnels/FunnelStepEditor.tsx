import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateFunnelStep, FunnelStep } from "@/hooks/useFunnels";
import { Save, Sparkles, Loader2, Wand2, Image, Plus, Trash2, GripVertical, X, Star, Play } from "lucide-react";
import { toast } from "sonner";
import { AppearanceEditor, defaultAppearance, type AppearanceValues } from "@/components/funnels/AppearanceEditor";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "checkbox" | "radio" | "hidden" | "consent" | "marketing_opt_in";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar_url?: string;
  rating: number;
  post_url?: string;
}

interface VideoConfig {
  url: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  poster_url?: string;
  caption?: string;
}

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
  testimonials: [
    "Gera 3 testemunhos para um curso de marketing digital",
    "Testemunhos de clientes satisfeitos com consultoria",
    "Avaliações de utilizadores de software SaaS",
  ],
  video: [
    "Copy para vídeo de apresentação do produto",
    "Texto de introdução para vídeo de vendas",
    "Descrição para vídeo tutorial de onboarding",
  ],
  page: [
    "Landing page para serviço de consultoria",
    "Página de vendas com benefícios e prova social",
    "Página sobre nós com história da marca",
  ],
  downsell: [
    "Oferta alternativa mais acessível pós-recusa",
    "Downsell com plano básico a preço reduzido",
    "Proposta simplificada para quem recusou o upsell",
  ],
  order_bump: [
    "Adição rápida de produto complementar no checkout",
    "Order bump com desconto especial de 30%",
    "Oferta irresistível de último momento antes do pagamento",
  ],
  squeeze: [
    "Squeeze page minimalista para captar emails",
    "Página de captura agressiva com uma só acção",
    "Opt-in focado sem distrações para lead magnet",
  ],
  webinar: [
    "Página de registo para webinar ao vivo",
    "Replay de webinar com contagem regressiva",
    "Página de webinar com agenda e benefícios",
  ],
  sales_letter: [
    "Carta de vendas longa para produto premium",
    "Sales letter com storytelling e prova social",
    "Página de vendas estilo carta com testemunhos",
  ],
  application: [
    "Formulário de candidatura para programa exclusivo",
    "Página de qualificação para consultoria premium",
    "Aplicação com perguntas de triagem para mentoria",
  ],
  booking: [
    "Página de agendamento para demonstração gratuita",
    "Marcação de reunião de discovery com calendário",
    "Agendamento de sessão estratégica personalizada",
  ],
  bridge: [
    "Página de aquecimento entre anúncio e oferta",
    "Bridge page com história de transformação",
    "Pré-sell com contexto antes do checkout",
  ],
  countdown: [
    "Página de escassez com timer para oferta limitada",
    "Countdown para encerramento de inscrições",
    "Urgência com contagem regressiva para lançamento",
  ],
  tripwire: [
    "Oferta tripwire de €7 para converter leads",
    "Produto de entrada com preço irresistível",
    "Mini-curso a baixo custo como porta de entrada",
  ],
  membership: [
    "Página de acesso à área de membros exclusiva",
    "Boas-vindas à comunidade com instruções de acesso",
    "Portal de membros com links de acesso rápido",
  ],
  custom: [
    "Cria conteúdo personalizado para esta página",
    "Gera copy adaptado ao objectivo deste step",
    "Página personalizada com elementos à medida",
  ],
};

const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { id: "name", label: "Nome", type: "text", required: true, placeholder: "Seu nome completo" },
  { id: "email", label: "Email", type: "email", required: true, placeholder: "seu@email.com" },
];

const IMAGE_STYLES = [
  { value: "photo", label: "Fotografia" },
  { value: "3d", label: "Ilustração 3D" },
  { value: "flat", label: "Flat Design" },
  { value: "minimal", label: "Minimalista" },
];

export function FunnelStepEditor({ step, funnelName, funnelType }: FunnelStepEditorProps) {
  const updateStep = useUpdateFunnelStep();
  const content = (step.content || {}) as Record<string, unknown>;

  const [headline, setHeadline] = useState((content.headline as string) || "");
  const [subheadline, setSubheadline] = useState((content.subheadline as string) || "");
  const [bodyText, setBodyText] = useState((content.body as string) || "");
  const [ctaText, setCtaText] = useState((content.cta_text as string) || "Começar Agora");
  const [ctaColor, setCtaColor] = useState((content.cta_color as string) || "#3b82f6");
  const [imageUrl, setImageUrl] = useState((content.image_url as string) || "");
  const [images, setImages] = useState<string[]>(() => {
    const saved = content.images as string[] | undefined;
    if (saved?.length) return saved;
    const single = content.image_url as string | undefined;
    return single ? [single] : [];
  });
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(() => {
    const saved = content.form_fields as FormFieldConfig[] | undefined;
    return saved?.length ? saved : DEFAULT_FORM_FIELDS;
  });
  const [appearance, setAppearance] = useState<AppearanceValues>(() => {
    const design = content.design as Partial<AppearanceValues> | undefined;
    return { ...defaultAppearance, ...design };
  });

  // Testimonials state
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(() => {
    const saved = content.testimonials as TestimonialItem[] | undefined;
    return saved?.length ? saved : [];
  });

  // Video state
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(() => {
    const saved = content.video as VideoConfig | undefined;
    return saved || { url: "", autoplay: false, loop: false, muted: true, poster_url: "", caption: "" };
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("photo");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    const c = (step.content || {}) as Record<string, unknown>;
    setHeadline((c.headline as string) || "");
    setSubheadline((c.subheadline as string) || "");
    setBodyText((c.body as string) || "");
    setCtaText((c.cta_text as string) || "Começar Agora");
    setCtaColor((c.cta_color as string) || "#3b82f6");
    setImageUrl((c.image_url as string) || "");
    const savedImages = c.images as string[] | undefined;
    const singleImg = c.image_url as string | undefined;
    setImages(savedImages?.length ? savedImages : singleImg ? [singleImg] : []);
    const saved = c.form_fields as FormFieldConfig[] | undefined;
    setFormFields(saved?.length ? saved : DEFAULT_FORM_FIELDS);
    const design = c.design as Partial<AppearanceValues> | undefined;
    setAppearance({ ...defaultAppearance, ...design });
    setImagePrompt("");
    setNewImageUrl("");
    const savedTestimonials = c.testimonials as TestimonialItem[] | undefined;
    setTestimonials(savedTestimonials?.length ? savedTestimonials : []);
    const savedVideo = c.video as VideoConfig | undefined;
    setVideoConfig(savedVideo || { url: "", autoplay: false, loop: false, muted: true, poster_url: "", caption: "" });
  }, [step.id]);

  const isTestimonials = step.step_type === "testimonials";
  const isVideo = step.step_type === "video";
  const isCountdown = step.step_type === "countdown";
  const isWebinar = step.step_type === "webinar";
  const isBooking = step.step_type === "booking";
  const isMembership = step.step_type === "membership";
  const isApplication = step.step_type === "application";
  const isSqueeze = step.step_type === "squeeze";
  const isCustom = step.step_type === "custom";
  const isOptin = step.step_type === "optin";
  const hasFormCapability = isOptin || isApplication || isSqueeze;

  const handleSave = () => {
    updateStep.mutate({
      id: step.id,
      content: {
        headline,
        subheadline,
        body: bodyText,
        cta_text: ctaText,
        cta_color: ctaColor,
        image_url: images[0] || imageUrl || "",
        images,
        form_fields: hasFormCapability ? formFields : undefined,
        testimonials: isTestimonials ? testimonials : undefined,
        video: (isVideo || isWebinar) ? videoConfig : undefined,
        design: appearance,
        hide_navigation: isSqueeze ? true : undefined,
      },
    });
    toast.success("Step guardado");
  };

  const handleAIGenerate = async (prompt?: string) => {
    const finalPrompt = prompt || aiPrompt;
    if (!finalPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-funnel-content", {
        body: { prompt: finalPrompt, stepType: step.step_type, currentContent: { headline, subheadline, body: bodyText, cta_text: ctaText }, funnelName, funnelType },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar");
      const generated = data.content;
      if (generated.headline) setHeadline(generated.headline);
      if (generated.subheadline) setSubheadline(generated.subheadline);
      if (generated.body) setBodyText(generated.body);
      if (generated.cta_text) setCtaText(generated.cta_text);
      setAiPrompt("");
      toast.success("Conteúdo gerado com IA!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar conteúdo");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIImage = async () => {
    const prompt = imagePrompt.trim() || headline || bodyText;
    if (!prompt) {
      toast.error("Adiciona um prompt ou título antes de gerar a imagem");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-funnel-content", {
        body: {
          prompt,
          stepType: step.step_type,
          generateImage: true,
          imageStyle,
          funnelName,
          funnelType,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.image_url) {
        setNewImageUrl(data.image_url);
        toast.success("Imagem gerada! Clica em 'Adicionar à galeria' para guardar.");
      } else {
        throw new Error("Não foi possível gerar a imagem");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const addImageToGallery = (url: string) => {
    if (!url.trim()) return;
    setImages(prev => [...prev, url.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Form field management
  const addFormField = () => {
    setFormFields(prev => [
      ...prev,
      { id: `field_${Date.now()}`, label: "Novo campo", type: "text", required: false, placeholder: "" },
    ]);
  };

  const updateFormField = (index: number, updates: Partial<FormFieldConfig>) => {
    setFormFields(prev => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeFormField = (index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  };

  // Testimonials management
  const addTestimonial = () => {
    setTestimonials(prev => [...prev, { id: `t_${Date.now()}`, name: "", role: "", quote: "", rating: 5 }]);
  };
  const updateTestimonial = (index: number, updates: Partial<TestimonialItem>) => {
    setTestimonials(prev => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };
  const removeTestimonial = (index: number) => {
    setTestimonials(prev => prev.filter((_, i) => i !== index));
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAIGenerate(); } }}
            />
            <Button onClick={() => handleAIGenerate()} disabled={isGenerating || !aiPrompt.trim()} className="shrink-0">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
              {isGenerating ? "A gerar..." : "Gerar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setAiPrompt(s); handleAIGenerate(s); }} disabled={isGenerating}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conteudo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="imagem">Imagens</TabsTrigger>
          {hasFormCapability && <TabsTrigger value="formulario">Formulário</TabsTrigger>}
          {isTestimonials && <TabsTrigger value="testemunhos">Testemunhos</TabsTrigger>}
          {(isVideo || isWebinar) && <TabsTrigger value="video">Vídeo</TabsTrigger>}
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Conteúdo do Step</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-sm">Pré-visualização</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 min-h-[300px] space-y-4"
                  style={{ backgroundColor: appearance.background, color: appearance.text_color, fontFamily: appearance.font_body, fontSize: `${appearance.font_size_base}px`, borderRadius: `${appearance.border_radius}px` }}>
                  {images.length > 0 && (
                    <div className={images.length === 1 ? "" : "grid grid-cols-2 gap-2"}>
                      {images.map((img, i) => (
                        <img key={i} src={img} alt={`Step ${i + 1}`} className="w-full rounded-lg object-cover max-h-48" />
                      ))}
                    </div>
                  )}
                  {headline && <h2 className="text-2xl" style={{ fontFamily: appearance.font_heading, fontWeight: appearance.heading_weight, color: appearance.text_color }}>{headline}</h2>}
                  {subheadline && <p className="text-lg" style={{ opacity: 0.7 }}>{subheadline}</p>}
                  {bodyText && <p className="text-sm whitespace-pre-wrap">{bodyText}</p>}
                  {isOptin && formFields.length > 0 && (
                    <div className="space-y-2 border border-dashed border-muted-foreground/30 rounded-lg p-3">
                      {formFields.map((field) => (
                        <div key={field.id}>
                          <p className="text-xs font-medium mb-1">{field.label}{field.required && " *"}</p>
                          <div className="h-8 bg-muted/50 rounded border text-xs flex items-center px-2 text-muted-foreground">{field.placeholder || field.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {ctaText && (
                    <button className="px-6 py-3 text-white font-medium w-full"
                      style={{
                        backgroundColor: appearance.cta_style === "outline" ? "transparent" : (appearance.cta_style === "gradient" ? undefined : appearance.primaria),
                        background: appearance.cta_style === "gradient" ? `linear-gradient(135deg, ${appearance.primaria}, ${appearance.accent})` : undefined,
                        border: appearance.cta_style === "outline" ? `2px solid ${appearance.primaria}` : "none",
                        color: appearance.cta_style === "outline" ? appearance.primaria : "#fff",
                        borderRadius: `${appearance.border_radius}px`,
                      }}>
                      {ctaText}
                    </button>
                  )}
                  {!headline && !subheadline && !bodyText && images.length === 0 && (
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

        {/* Image Gallery Tab */}
        <TabsContent value="imagem">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Gerar com IA</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descrição da imagem</Label>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ex: Uma pessoa a usar laptop num escritório moderno com plantas"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Estilo visual</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setImageStyle(style.value)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          imageStyle === style.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAIImage} disabled={isGeneratingImage} className="w-full">
                  {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGeneratingImage ? "A gerar imagem..." : "Gerar Imagem com IA"}
                </Button>

                {/* Generated image preview */}
                {newImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Imagem gerada:</p>
                    <div className="relative border rounded-lg overflow-hidden">
                      <img src={newImageUrl} alt="Generated" className="w-full max-h-60 object-cover" />
                    </div>
                    <Button onClick={() => addImageToGallery(newImageUrl)} className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar à galeria
                    </Button>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Ou adicionar via URL</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => addImageToGallery(newImageUrl)} disabled={!newImageUrl.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="h-4 w-4" /> Galeria ({images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative group border rounded-lg overflow-hidden">
                        <img src={img} alt={`Imagem ${index + 1}`} className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1.5 left-1.5 bg-background/80 rounded px-1.5 py-0.5 text-[10px] font-medium">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma imagem ainda</p>
                    <p className="text-xs mt-1">Gera com IA ou adiciona via URL</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Form Builder Tab (optin, application, squeeze) */}
        {hasFormCapability && (
          <TabsContent value="formulario">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Campos do Formulário</CardTitle>
                  <Button size="sm" variant="outline" onClick={addFormField}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar campo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {formFields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                    <GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input value={field.label} onChange={(e) => updateFormField(index, { label: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={field.type} onValueChange={(v) => updateFormField(index, { type: v as FormFieldConfig["type"] })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Telefone</SelectItem>
                            <SelectItem value="textarea">Texto longo</SelectItem>
                            <SelectItem value="select">Seleção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Placeholder</Label>
                        <Input value={field.placeholder || ""} onChange={(e) => updateFormField(index, { placeholder: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-1.5">
                          <Switch checked={field.required} onCheckedChange={(v) => updateFormField(index, { required: v })} />
                          <Label className="text-xs">Obrigatório</Label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeFormField(index)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {formFields.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum campo. Clica em "Adicionar campo" para começar.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Testimonials Tab */}
        {isTestimonials && (
          <TabsContent value="testemunhos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> Testemunhos</CardTitle>
                  <Button size="sm" variant="outline" onClick={addTestimonial}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {testimonials.map((t, index) => (
                  <div key={t.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Testemunho #{index + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTestimonial(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input value={t.name} onChange={(e) => updateTestimonial(index, { name: e.target.value })} placeholder="Maria Silva" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Cargo / Empresa</Label>
                        <Input value={t.role} onChange={(e) => updateTestimonial(index, { role: e.target.value })} placeholder="CEO, Empresa X" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Testemunho</Label>
                      <Textarea value={t.quote} onChange={(e) => updateTestimonial(index, { quote: e.target.value })} placeholder="O que esta pessoa disse..." rows={3} className="text-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Avatar URL (opcional)</Label>
                        <Input value={t.avatar_url || ""} onChange={(e) => updateTestimonial(index, { avatar_url: e.target.value })} placeholder="https://..." className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Avaliação</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => updateTestimonial(index, { rating: star })} className="focus:outline-none">
                              <Star className={`h-5 w-5 ${star <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Link do Post (opcional)</Label>
                      <Input value={t.post_url || ""} onChange={(e) => updateTestimonial(index, { post_url: e.target.value })} placeholder="https://linkedin.com/posts/..." className="h-8 text-sm" />
                    </div>
                  </div>
                ))}
                {testimonials.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum testemunho ainda</p>
                    <p className="text-xs mt-1">Adiciona testemunhos de clientes para aumentar a credibilidade</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Video Tab (video & webinar) */}
        {(isVideo || isWebinar) && (
          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4" /> Configuração de Vídeo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL do Vídeo</Label>
                  <Input value={videoConfig.url} onChange={(e) => setVideoConfig(prev => ({ ...prev, url: e.target.value }))} placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..." />
                  <p className="text-xs text-muted-foreground mt-1">Suporta YouTube, Vimeo ou URL direta de vídeo (.mp4)</p>
                </div>
                <div>
                  <Label>Imagem de capa (opcional)</Label>
                  <Input value={videoConfig.poster_url || ""} onChange={(e) => setVideoConfig(prev => ({ ...prev, poster_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>Legenda / Descrição</Label>
                  <Input value={videoConfig.caption || ""} onChange={(e) => setVideoConfig(prev => ({ ...prev, caption: e.target.value }))} placeholder="Assista ao vídeo de apresentação" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={videoConfig.autoplay} onCheckedChange={(v) => setVideoConfig(prev => ({ ...prev, autoplay: v }))} />
                    <Label className="text-sm">Autoplay</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={videoConfig.loop} onCheckedChange={(v) => setVideoConfig(prev => ({ ...prev, loop: v }))} />
                    <Label className="text-sm">Loop</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={videoConfig.muted} onCheckedChange={(v) => setVideoConfig(prev => ({ ...prev, muted: v }))} />
                    <Label className="text-sm">Mudo</Label>
                  </div>
                </div>
                {videoConfig.url && (
                  <div className="border rounded-lg overflow-hidden">
                    <p className="text-xs font-medium text-muted-foreground p-2">Pré-visualização:</p>
                    {videoConfig.url.includes("youtube.com") || videoConfig.url.includes("youtu.be") ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoConfig.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                        className="w-full aspect-video"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                      />
                    ) : videoConfig.url.includes("vimeo.com") ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${videoConfig.url.match(/vimeo\.com\/(\d+)/)?.[1] || ""}`}
                        className="w-full aspect-video"
                        allowFullScreen
                      />
                    ) : (
                      <video src={videoConfig.url} controls className="w-full aspect-video" poster={videoConfig.poster_url} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
