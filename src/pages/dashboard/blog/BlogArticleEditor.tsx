import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, Eye, Sparkles, Plus, Trash2, Loader2, GripVertical,
} from "lucide-react";
import { useSaveBlogArticle } from "@/hooks/useBlogAdmin";
import { useGenerateSEOContent } from "@/modules/growth-seo/hooks/useGenerateSEOContent";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SEOEntity, SEOContent, ContentSection, FAQ, Intent, EntityStatus } from "@/modules/growth-seo/types";

interface BlogArticleEditorProps {
  article?: SEOEntity | null;
  onBack: () => void;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function BlogArticleEditor({ article, onBack }: BlogArticleEditorProps) {
  const saveArticle = useSaveBlogArticle();
  const { generateContent, isGenerating } = useGenerateSEOContent();
  const { currentWorkspace } = useWorkspace();

  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [h1, setH1] = useState(article?.h1 || "");
  const [metaDescription, setMetaDescription] = useState(article?.meta_description || "");
  const [tldr, setTldr] = useState(article?.tldr || "");
  const [ogImage, setOgImage] = useState(article?.og_image || "");
  const [intent, setIntent] = useState<Intent>(article?.intent || "informational");
  const [status, setStatus] = useState<EntityStatus>(article?.status || "draft");
  const [language, setLanguage] = useState(article?.language || "pt");
  const [country, setCountry] = useState(article?.country || "PT");
  const [priority, setPriority] = useState(article?.priority || 0.5);
  const [changeFreq, setChangeFreq] = useState(article?.change_frequency || "monthly");
  const [canonicalUrl, setCanonicalUrl] = useState(article?.canonical_url || "");
  const [publishedAt, setPublishedAt] = useState(
    article?.published_at ? article.published_at.slice(0, 16) : ""
  );

  const content = (article?.content || {}) as SEOContent;
  const [sections, setSections] = useState<ContentSection[]>(content.sections || []);
  const [faqs, setFaqs] = useState<FAQ[]>(content.faqs || []);
  const [ctaText, setCtaText] = useState(content.cta?.text || "");
  const [ctaUrl, setCtaUrl] = useState(content.cta?.url || "");

  const [autoSlug, setAutoSlug] = useState(!article?.id);

  useEffect(() => {
    if (autoSlug && title) {
      setSlug(generateSlug(title));
    }
  }, [title, autoSlug]);

  const handleSave = (saveStatus?: EntityStatus) => {
    const finalStatus = saveStatus || status;
    const built: SEOContent = {
      sections,
      faqs,
      cta: ctaText ? { type: "signup" as const, text: ctaText, url: ctaUrl } : undefined,
    };

    saveArticle.mutate(
      {
        ...(article?.id ? { id: article.id } : {}),
        title,
        slug,
        h1: h1 || title,
        meta_description: metaDescription,
        tldr,
        og_image: ogImage || null,
        intent,
        status: finalStatus,
        language,
        country,
        priority,
        change_frequency: changeFreq,
        canonical_url: canonicalUrl || null,
        published_at:
          finalStatus === "published"
            ? publishedAt
              ? new Date(publishedAt).toISOString()
              : new Date().toISOString()
            : publishedAt
            ? new Date(publishedAt).toISOString()
            : null,
        content: built as Record<string, unknown>,
      } as Partial<SEOEntity> & { id?: string },
      { onSuccess: onBack }
    );
  };

  const handleGenerate = async () => {
    if (!title) return;
    const result = await generateContent({
      entity_type: "blog",
      topic: title,
      intent,
      language,
      workspace_id: currentWorkspace?.id,
    });
    if (result?.content) {
      const c = result.content;
      if (c.meta_description) setMetaDescription(c.meta_description);
      if (c.h1) setH1(c.h1);
      if (c.tldr) setTldr(c.tldr);
      if (c.sections) setSections(c.sections);
      if (c.faqs) setFaqs(c.faqs);
      if (c.cta) {
        setCtaText(c.cta.text || "");
        setCtaUrl(c.cta.url || "");
      }
    }
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), heading: "", content: "", type: "text" },
    ]);
  };

  const updateSection = (idx: number, patch: Partial<ContentSection>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const addFaq = () => {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  };

  const updateFaq = (idx: number, patch: Partial<FAQ>) => {
    setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeFaq = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            {article?.id ? "Editar Artigo" : "Novo Artigo"}
          </h2>
          <Badge variant="secondary">
            {status === "published" ? "Publicado" : status === "archived" ? "Arquivado" : "Rascunho"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || !title}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar com IA
          </Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saveArticle.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Rascunho
          </Button>
          <Button onClick={() => handleSave("published")} disabled={saveArticle.isPending}>
            {saveArticle.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEO Fields */}
          <Card>
            <CardHeader><CardTitle className="text-base">SEO & Metadados</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do artigo" />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/60 caracteres</p>
              </div>
              <div>
                <Label>Slug</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
                    placeholder="url-do-artigo"
                  />
                  {!autoSlug && (
                    <Button variant="ghost" size="sm" onClick={() => { setAutoSlug(true); setSlug(generateSlug(title)); }}>
                      Auto
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>H1</Label>
                <Input value={h1} onChange={(e) => setH1(e.target.value)} placeholder="Título principal da página" />
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Descrição para motores de busca" rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 caracteres</p>
              </div>
              <div>
                <Label>TL;DR</Label>
                <Textarea value={tldr} onChange={(e) => setTldr(e.target.value)} placeholder="Resumo curto do artigo" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Secções do Conteúdo</CardTitle>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" /> Secção
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Adicione secções ao artigo ou gere conteúdo com IA.
                </p>
              )}
              {sections.map((sec, idx) => (
                <div key={sec.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={sec.heading}
                      onChange={(e) => updateSection(idx, { heading: e.target.value })}
                      placeholder={`Título da secção ${idx + 1}`}
                      className="flex-1"
                    />
                    <Select
                      value={sec.type}
                      onValueChange={(v) => updateSection(idx, { type: v as ContentSection["type"] })}
                    >
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="list">Lista</SelectItem>
                        <SelectItem value="steps">Passos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeSection(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    value={sec.content}
                    onChange={(e) => updateSection(idx, { content: e.target.value })}
                    placeholder="Conteúdo da secção..."
                    rows={4}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">FAQs</CardTitle>
              <Button variant="outline" size="sm" onClick={addFaq}>
                <Plus className="h-4 w-4 mr-1" /> FAQ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione perguntas frequentes para melhorar SEO.
                </p>
              )}
              {faqs.map((faq, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFaq(idx, { question: e.target.value })}
                      placeholder="Pergunta"
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeFaq(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, { answer: e.target.value })}
                    placeholder="Resposta"
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardHeader><CardTitle className="text-base">Call-to-Action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Texto do CTA</Label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Experimente grátis" />
              </div>
              <div>
                <Label>URL do CTA</Label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/signup" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Intenção</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as Intent)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informational">Informacional</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="transactional">Transaccional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>País</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT">Portugal</SelectItem>
                    <SelectItem value="BR">Brasil</SelectItem>
                    <SelectItem value="ES">Espanha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <Label>Prioridade Sitemap</Label>
                <Input type="number" min={0} max={1} step={0.1} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
              </div>
              <div>
                <Label>Frequência Alteração</Label>
                <Select value={changeFreq} onValueChange={setChangeFreq}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Media</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Imagem OG (URL)</Label>
                <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." />
              </div>
              {ogImage && (
                <img
                  src={ogImage}
                  alt="OG Preview"
                  className="w-full rounded-md border object-cover aspect-video"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Agendamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Data de Publicação</Label>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe vazio para publicar imediatamente
                </p>
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
