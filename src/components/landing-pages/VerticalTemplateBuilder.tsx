import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Eye, Save, Globe, Sparkles, Loader2, Star, Trash2, Plus, Play, Facebook, Instagram, Linkedin, Youtube, Twitter, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateVerticalTemplate,
  useUpdateVerticalTemplate,
  useVerticalTemplate,
  type VerticalTemplateRow,
} from "@/hooks/useVerticalTemplates";
import { VerticalLandingTemplate } from "@/components/vertical-landing/VerticalLandingTemplate";
import { AppearanceEditor, defaultAppearance, type AppearanceValues } from "@/components/funnels/AppearanceEditor";
import type { VerticalConfig, VerticalTestimonial, VerticalVideoSection, SocialLinks } from "@/config/verticalConfigs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  templateId?: string | null;
  onBack: () => void;
}

const ICON_OPTIONS = [
  "Users", "Zap", "MessageSquare", "Brain", "BarChart3", "Clock",
  "Shield", "DollarSign", "Target", "Mail", "Star", "Package",
];

const defaultForm = (): FormData => ({
  nome: "",
  slug: "",
  dor_principal: "",
  resultado_prometido: "",
  dores: ["", "", "", ""],
  modulos_ativos: [
    { nome: "", desc: "", icon: "Users" },
    { nome: "", desc: "", icon: "Zap" },
    { nome: "", desc: "", icon: "Brain" },
  ],
  antes_depois: { antes: ["", "", "", ""], depois: ["", "", "", ""] },
  roi_exemplo: { clientes_extra: 10, valor_medio: 500, periodo: "mês" },
  cores: { ...defaultAppearance, primaria: "#3b82f6", accent: "#7c3aed" },
  cta_principal: "Agendar Diagnóstico Estratégico",
  cta_secundario: "Receber Plano Personalizado",
  ai_persona_nome: "",
  seo: { title: "", description: "", canonical: "" },
  testimonials: [],
  video_section: { url: "", caption: "", autoplay: false, muted: true, loop: false },
  social_links: { facebook: "", instagram: "", linkedin: "", whatsapp: "", youtube: "", tiktok: "", twitter: "", website: "", publications: [] },
});

type FormData = Omit<VerticalTemplateRow, "id" | "workspace_id" | "created_at" | "updated_at" | "created_by" | "is_published">;

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function VerticalTemplateBuilder({ templateId, onBack }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: existing } = useVerticalTemplate(templateId ?? null);
  const createMut = useCreateVerticalTemplate();
  const updateMut = useUpdateVerticalTemplate();

  const [form, setForm] = useState<FormData>(() => {
    if (existing) {
      const { id, workspace_id, created_at, updated_at, created_by, is_published, ...rest } = existing;
      return rest;
    }
    return defaultForm();
  });
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState("identidade");
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = useCallback(async () => {
    if (!form.nome.trim()) {
      toast.error("Escreve o nome da vertical primeiro");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vertical-template", {
        body: { nome: form.nome.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm((prev) => ({
        ...prev,
        dor_principal: data.dor_principal ?? prev.dor_principal,
        resultado_prometido: data.resultado_prometido ?? prev.resultado_prometido,
        dores: data.dores ?? prev.dores,
        modulos_ativos: data.modulos_ativos ?? prev.modulos_ativos,
        antes_depois: data.antes_depois ?? prev.antes_depois,
        roi_exemplo: data.roi_exemplo ?? prev.roi_exemplo,
        cta_principal: data.cta_principal ?? prev.cta_principal,
        cta_secundario: data.cta_secundario ?? prev.cta_secundario,
        ai_persona_nome: data.ai_persona_nome ?? prev.ai_persona_nome,
        seo: {
          ...prev.seo,
          title: data.seo?.title ?? prev.seo.title,
          description: data.seo?.description ?? prev.seo.description,
        },
      }));
      toast.success("Conteúdo AIDA gerado com sucesso! Revê e ajusta antes de guardar.");
    } catch (e: any) {
      console.error("AI generation error:", e);
      toast.error(e?.message || "Erro ao gerar conteúdo com IA");
    } finally {
      setGenerating(false);
    }
  }, [form.nome]);

  // Sync existing data when loaded
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (existing && existing.id !== loadedId) {
    const { id, workspace_id, created_at, updated_at, created_by, is_published, ...rest } = existing;
    setForm(rest);
    setLoadedId(existing.id);
  }

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateNome = useCallback((nome: string) => {
    setForm((prev) => ({
      ...prev,
      nome,
      slug: prev.slug || slugify(nome),
      ai_persona_nome: prev.ai_persona_nome || `AI CRM ${nome} Specialist`,
      seo: {
        ...prev.seo,
        title: prev.seo.title || `FastCRM para ${nome} — Sistema com IA`,
        description: prev.seo.description || `CRM com IA para ${nome.toLowerCase()}: automações, pipeline e comunicação omnicanal.`,
      },
    }));
  }, []);

  const handleSave = async (publish = false) => {
    if (!currentWorkspace?.id) return;
    const payload = {
      ...form,
      workspace_id: currentWorkspace.id,
      created_by: user?.id ?? null,
      is_published: publish,
    };
    if (templateId) {
      await updateMut.mutateAsync({ id: templateId, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    onBack();
  };

  const previewConfig = useMemo((): VerticalConfig => ({
    slug: form.slug || "preview",
    nome: form.nome || "Preview",
    dor_principal: form.dor_principal,
    resultado_prometido: form.resultado_prometido,
    dores: form.dores.filter(Boolean),
    modulos_ativos: form.modulos_ativos.filter((m) => m.nome),
    antes_depois: {
      antes: form.antes_depois.antes.filter(Boolean),
      depois: form.antes_depois.depois.filter(Boolean),
    },
    roi_exemplo: form.roi_exemplo,
    cores: form.cores,
    cta_principal: form.cta_principal,
    cta_secundario: form.cta_secundario,
    ai_persona_nome: form.ai_persona_nome,
    seo: {
      title: form.seo.title || `FastCRM para ${form.nome}`,
      description: form.seo.description || "",
      canonical: form.seo.canonical || "",
    },
    testimonials: form.testimonials || [],
    video_section: form.video_section || undefined,
    social_links: form.social_links || undefined,
  }), [form]);

  if (preview) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-background border-b p-3 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Editor
          </Button>
          <Badge variant="secondary">Preview</Badge>
        </div>
        <VerticalLandingTemplate config={previewConfig} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {templateId ? "Editar Template AIDA" : "Novo Template AIDA"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Crie uma landing page vertical para qualquer área de negócio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
          <Button onClick={() => handleSave(true)} disabled={createMut.isPending || updateMut.isPending}>
            <Globe className="h-4 w-4 mr-1" /> Publicar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="dores">Dores</TabsTrigger>
          <TabsTrigger value="solucao">Solução</TabsTrigger>
          <TabsTrigger value="transformacao">Transformação</TabsTrigger>
          <TabsTrigger value="testemunhos">Testemunhos</TabsTrigger>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
          <TabsTrigger value="roi">ROI</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="cta-seo">CTAs & SEO</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
        </TabsList>

        {/* Tab: Identidade */}
        <TabsContent value="identidade">
          <Card>
            <CardHeader><CardTitle>Identidade da Vertical</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Vertical *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Restaurantes, Ginásios, Advocacia..."
                      value={form.nome}
                      onChange={(e) => updateNome(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateAI}
                      disabled={generating || !form.nome.trim()}
                      className="shrink-0"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      {generating ? "A gerar..." : "Gerar com IA"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    placeholder="restaurantes"
                    value={form.slug}
                    onChange={(e) => updateField("slug", slugify(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">URL pública: /{form.slug || "..."}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dor Principal do Público-Alvo *</Label>
                <Textarea
                  placeholder="Ex: Perdem clientes por falta de follow-up e processos manuais"
                  value={form.dor_principal}
                  onChange={(e) => updateField("dor_principal", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resultado Prometido *</Label>
                <Input
                  placeholder="Ex: escalar sem perder qualidade no atendimento"
                  value={form.resultado_prometido}
                  onChange={(e) => updateField("resultado_prometido", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome da Persona AI</Label>
                <Input
                  placeholder="Ex: AI CRM Restaurantes Specialist"
                  value={form.ai_persona_nome}
                  onChange={(e) => updateField("ai_persona_nome", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dores */}
        <TabsContent value="dores">
          <Card>
            <CardHeader><CardTitle>4 Dores do Público-Alvo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {form.dores.map((dor, i) => (
                <div key={i} className="space-y-1">
                  <Label>Dor {i + 1}</Label>
                  <Textarea
                    placeholder={`Descreva a dor ${i + 1} do público-alvo...`}
                    value={dor}
                    onChange={(e) => {
                      const updated = [...form.dores];
                      updated[i] = e.target.value;
                      updateField("dores", updated);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Solução (Módulos) */}
        <TabsContent value="solucao">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Módulos Activos (até 6)</CardTitle>
                {form.modulos_ativos.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateField("modulos_ativos", [
                        ...form.modulos_ativos,
                        { nome: "", desc: "", icon: "Package" },
                      ])
                    }
                  >
                    + Adicionar Módulo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.modulos_ativos.map((mod, i) => (
                <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto] items-end border rounded-lg p-3">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input
                      value={mod.nome}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, nome: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={mod.desc}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, desc: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Ícone</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={mod.icon}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, icon: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  {form.modulos_ativos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        const updated = form.modulos_ativos.filter((_, j) => j !== i);
                        updateField("modulos_ativos", updated);
                      }}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transformação */}
        <TabsContent value="transformacao">
          <Card>
            <CardHeader><CardTitle>Antes vs Depois</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-destructive">Antes (sem FastCRM)</h3>
                  {form.antes_depois.antes.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Item {i + 1}</Label>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = { ...form.antes_depois };
                          updated.antes = [...updated.antes];
                          updated.antes[i] = e.target.value;
                          updateField("antes_depois", updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary">Depois (com FastCRM)</h3>
                  {form.antes_depois.depois.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Item {i + 1}</Label>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = { ...form.antes_depois };
                          updated.depois = [...updated.depois];
                          updated.depois[i] = e.target.value;
                          updateField("antes_depois", updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Testemunhos */}
        <TabsContent value="testemunhos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Testemunhos de Clientes</CardTitle>
                <Button size="sm" variant="outline" onClick={() => updateField("testimonials", [
                  ...(form.testimonials || []),
                  { name: "", role: "", quote: "", rating: 5 },
                ])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.testimonials || []).map((t, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Testemunho #{i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                      const updated = (form.testimonials || []).filter((_, j) => j !== i);
                      updateField("testimonials", updated);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome</Label>
                      <Input value={t.name} onChange={(e) => {
                        const updated = [...(form.testimonials || [])];
                        updated[i] = { ...t, name: e.target.value };
                        updateField("testimonials", updated);
                      }} placeholder="Maria Silva" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo / Empresa</Label>
                      <Input value={t.role} onChange={(e) => {
                        const updated = [...(form.testimonials || [])];
                        updated[i] = { ...t, role: e.target.value };
                        updateField("testimonials", updated);
                      }} placeholder="CEO, Empresa X" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Testemunho</Label>
                    <Textarea value={t.quote} onChange={(e) => {
                      const updated = [...(form.testimonials || [])];
                      updated[i] = { ...t, quote: e.target.value };
                      updateField("testimonials", updated);
                    }} placeholder="O que esta pessoa disse..." rows={3} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Avatar URL (opcional)</Label>
                      <Input value={t.avatar_url || ""} onChange={(e) => {
                        const updated = [...(form.testimonials || [])];
                        updated[i] = { ...t, avatar_url: e.target.value };
                        updateField("testimonials", updated);
                      }} placeholder="https://..." className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Avaliação</Label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => {
                            const updated = [...(form.testimonials || [])];
                            updated[i] = { ...t, rating: star };
                            updateField("testimonials", updated);
                          }} className="focus:outline-none">
                            <Star className={`h-5 w-5 ${star <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Link do Post (opcional)</Label>
                    <Input value={(t as any).post_url || ""} onChange={(e) => {
                      const updated = [...(form.testimonials || [])];
                      updated[i] = { ...t, post_url: e.target.value } as any;
                      updateField("testimonials", updated);
                    }} placeholder="https://linkedin.com/posts/..." className="h-8 text-sm" />
                  </div>
                </div>
              ))}
              {(!form.testimonials || form.testimonials.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum testemunho</p>
                  <p className="text-xs mt-1">Adiciona testemunhos para aumentar credibilidade</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vídeo */}
        <TabsContent value="video">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Play className="h-4 w-4" /> Secção de Vídeo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL do Vídeo</Label>
                <Input
                  value={form.video_section?.url || ""}
                  onChange={(e) => updateField("video_section", { ...form.video_section, url: e.target.value } as any)}
                  placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">Suporta YouTube, Vimeo ou URL direta (.mp4)</p>
              </div>
              <div>
                <Label>Legenda / Título da secção</Label>
                <Input
                  value={form.video_section?.caption || ""}
                  onChange={(e) => updateField("video_section", { ...form.video_section, caption: e.target.value } as any)}
                  placeholder="Veja como funciona o FastCRM"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.video_section?.autoplay || false}
                    onCheckedChange={(v) => updateField("video_section", { ...form.video_section, autoplay: v } as any)}
                  />
                  <Label className="text-sm">Autoplay</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.video_section?.loop || false}
                    onCheckedChange={(v) => updateField("video_section", { ...form.video_section, loop: v } as any)}
                  />
                  <Label className="text-sm">Loop</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.video_section?.muted ?? true}
                    onCheckedChange={(v) => updateField("video_section", { ...form.video_section, muted: v } as any)}
                  />
                  <Label className="text-sm">Mudo</Label>
                </div>
              </div>
              {form.video_section?.url && (
                <div className="border rounded-lg overflow-hidden">
                  <p className="text-xs font-medium text-muted-foreground p-2">Pré-visualização:</p>
                  {form.video_section.url.includes("youtube.com") || form.video_section.url.includes("youtu.be") ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${form.video_section.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                      className="w-full aspect-video"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                    />
                  ) : form.video_section.url.includes("vimeo.com") ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${form.video_section.url.match(/vimeo\.com\/(\d+)/)?.[1] || ""}`}
                      className="w-full aspect-video"
                      allowFullScreen
                    />
                  ) : (
                    <video src={form.video_section.url} controls className="w-full aspect-video" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: ROI */}
        <TabsContent value="roi">
          <Card>
            <CardHeader><CardTitle>Exemplo de ROI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Clientes Extra / {form.roi_exemplo.periodo}</Label>
                  <Input
                    type="number"
                    value={form.roi_exemplo.clientes_extra}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        clientes_extra: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Médio (€)</Label>
                  <Input
                    type="number"
                    value={form.roi_exemplo.valor_medio}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        valor_medio: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input
                    value={form.roi_exemplo.periodo}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        periodo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  ROI estimado:{" "}
                  <span className="font-bold text-foreground">
                    +{form.roi_exemplo.clientes_extra * form.roi_exemplo.valor_medio}€/{form.roi_exemplo.periodo}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Aparência */}
        <TabsContent value="aparencia">
          <AppearanceEditor
            values={form.cores as AppearanceValues}
            onChange={(v) => updateField("cores", v)}
          />
        </TabsContent>

        {/* Tab: CTAs & SEO */}
        <TabsContent value="cta-seo">
          <Card>
            <CardHeader><CardTitle>CTAs & SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>CTA Principal</Label>
                  <Input
                    value={form.cta_principal}
                    onChange={(e) => updateField("cta_principal", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Secundário</Label>
                  <Input
                    value={form.cta_secundario}
                    onChange={(e) => updateField("cta_secundario", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>SEO Title (max 60 chars)</Label>
                <Input
                  maxLength={60}
                  value={form.seo.title}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, title: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{form.seo.title.length}/60</p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description (max 160 chars)</Label>
                <Textarea
                  maxLength={160}
                  value={form.seo.description}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, description: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{form.seo.description.length}/160</p>
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  placeholder="https://fastcrm.metodopare.ai/restaurantes"
                  value={form.seo.canonical}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, canonical: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Redes Sociais */}
        <TabsContent value="social">
          <Card>
            <CardHeader><CardTitle>Redes Sociais & Publicações</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: "facebook", label: "Facebook", icon: <Facebook className="h-3.5 w-3.5" />, placeholder: "https://facebook.com/..." },
                  { key: "instagram", label: "Instagram", icon: <Instagram className="h-3.5 w-3.5" />, placeholder: "https://instagram.com/..." },
                  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-3.5 w-3.5" />, placeholder: "https://linkedin.com/..." },
                  { key: "youtube", label: "YouTube", icon: <Youtube className="h-3.5 w-3.5" />, placeholder: "https://youtube.com/@..." },
                  { key: "twitter", label: "X (Twitter)", icon: <Twitter className="h-3.5 w-3.5" />, placeholder: "https://x.com/..." },
                  { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, placeholder: "https://wa.me/..." },
                  { key: "tiktok", label: "TikTok", icon: <Sparkles className="h-3.5 w-3.5" />, placeholder: "https://tiktok.com/@..." },
                  { key: "website", label: "Website", icon: <Globe className="h-3.5 w-3.5" />, placeholder: "https://..." },
                ] as const).map((s) => (
                  <div key={s.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {s.icon} {s.label}
                    </Label>
                    <Input
                      placeholder={s.placeholder}
                      value={(form.social_links as any)?.[s.key] || ""}
                      onChange={(e) =>
                        updateField("social_links", {
                          ...(form.social_links || {}),
                          [s.key]: e.target.value,
                        } as any)
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Publications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Links de Publicações / Artigos</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pubs = [...((form.social_links as any)?.publications || []), { title: "", url: "" }];
                      updateField("social_links", { ...(form.social_links || {}), publications: pubs } as any);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {((form.social_links as any)?.publications || []).map((pub: { title: string; url: string }, i: number) => (
                  <div key={i} className="grid gap-2 md:grid-cols-[1fr_2fr_auto] items-end border rounded-lg p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={pub.title}
                        placeholder="Nome do artigo"
                        onChange={(e) => {
                          const pubs = [...((form.social_links as any)?.publications || [])];
                          pubs[i] = { ...pub, title: e.target.value };
                          updateField("social_links", { ...(form.social_links || {}), publications: pubs } as any);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={pub.url}
                        placeholder="https://..."
                        onChange={(e) => {
                          const pubs = [...((form.social_links as any)?.publications || [])];
                          pubs[i] = { ...pub, url: e.target.value };
                          updateField("social_links", { ...(form.social_links || {}), publications: pubs } as any);
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        const pubs = ((form.social_links as any)?.publications || []).filter((_: any, idx: number) => idx !== i);
                        updateField("social_links", { ...(form.social_links || {}), publications: pubs } as any);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
