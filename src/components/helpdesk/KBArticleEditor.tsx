import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { X, Eye, Code } from "lucide-react";
import type { KBArticle, KBCategory, ArticleFormData } from "@/hooks/useKBAdmin";

const ARTICLE_TYPES = [
  { value: "guide", label: "Guia" },
  { value: "how-to", label: "How-to" },
  { value: "reference", label: "Referência" },
  { value: "faq", label: "FAQ" },
  { value: "video", label: "Vídeo" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KBArticle | null;
  categories: KBCategory[];
  onSave: (data: ArticleFormData & { id?: string }) => void;
  isSaving?: boolean;
}

export function KBArticleEditor({ open, onOpenChange, article, categories, onSave, isSaving }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [articleType, setArticleType] = useState<KBArticle["article_type"]>("guide");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setSummary(article.summary);
      setContentMd(article.content_md);
      setCategorySlug(article.category_slug);
      setArticleType(article.article_type);
      setTags(article.tags ?? []);
      setIsPublished(article.is_published);
    } else {
      setTitle("");
      setSummary("");
      setContentMd("");
      setCategorySlug(categories[0]?.slug ?? "");
      setArticleType("guide");
      setTags([]);
      setIsPublished(false);
    }
  }, [article, open, categories]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!title.trim() || !contentMd.trim() || !categorySlug) return;
    onSave({
      id: article?.id,
      title: title.trim(),
      summary: summary.trim(),
      content_md: contentMd,
      category_slug: categorySlug,
      article_type: articleType,
      tags,
      related_slugs: article?.related_slugs ?? [],
      is_published: isPublished,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do artigo" />
            </div>
            <div>
              <Label>Resumo</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo curto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={categorySlug} onValueChange={setCategorySlug}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={articleType} onValueChange={(v) => setArticleType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Adicionar tag..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1">
                    {t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>{isPublished ? "Publicado" : "Rascunho"}</Label>
            </div>
          </div>

          {/* Content editor with preview */}
          <div>
            <Label>Conteúdo (Markdown)</Label>
            <Tabs defaultValue="edit" className="mt-1">
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs gap-1"><Code className="h-3 w-3" />Editar</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1"><Eye className="h-3 w-3" />Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea
                  value={contentMd}
                  onChange={(e) => setContentMd(e.target.value)}
                  className="min-h-[300px] font-mono text-xs"
                  placeholder="# Título&#10;&#10;Escreve o conteúdo em Markdown..."
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto bg-muted/30">
                  {contentMd ? (
                    <MarkdownRenderer content={contentMd} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem conteúdo para pré-visualizar</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !title.trim() || !contentMd.trim()}>
            {isSaving ? "A guardar..." : article ? "Guardar" : "Criar Artigo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
