import { useState } from "react";
import { useEbooks, useCreateEbook, useDeleteEbook } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Trash2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EbooksListProps {
  onSelectEbook: (id: string) => void;
}

export function EbooksList({ onSelectEbook }: EbooksListProps) {
  const { data: ebooks, isLoading } = useEbooks();
  const createEbook = useCreateEbook();
  const deleteEbook = useDeleteEbook();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const ebook = await createEbook.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
    setShowCreate(false);
    setTitle("");
    setDescription("");
    onSelectEbook(ebook.id);
  };

  const handleAICreate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_outline", title: aiPrompt.trim(), chapterCount: 5 },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      const result = data?.result;
      if (!result) throw new Error("No result");
      const chapters = (result.chapters || []).map((ch: any, i: number) => ({
        id: `ch-${i}`,
        title: ch.title,
        description: ch.description,
        content: "",
        sections: ch.sections || [],
      }));
      const ebook = await createEbook.mutateAsync({
        title: result.title || aiPrompt.trim(),
        subtitle: result.subtitle,
        chapters,
      });
      setShowCreate(false);
      setAiPrompt("");
      setAiMode(false);
      onSelectEbook(ebook.id);
    } catch (e: any) {
      toast.error("Erro ao gerar: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">eBooks</h1>
          <p className="text-sm text-muted-foreground">Crie eBooks com IA para captura de leads nos seus funis</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar eBook
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !ebooks?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum eBook criado</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro eBook com assistência de IA</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar eBook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ebooks.map((ebook) => (
            <Card key={ebook.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onSelectEbook(ebook.id)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{ebook.title}</h3>
                    {ebook.subtitle && <p className="text-xs text-muted-foreground truncate">{ebook.subtitle}</p>}
                  </div>
                  <Badge variant={ebook.status === "published" ? "default" : "secondary"} className="ml-2 shrink-0">
                    {ebook.status === "published" ? "Publicado" : ebook.status === "archived" ? "Arquivado" : "Rascunho"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{ebook.chapters.length} capítulos</span>
                  <div className="flex gap-1">
                    {ebook.slug && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); window.open(`/ebook/${ebook.slug}`, "_blank"); }}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteEbook.mutate(ebook.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar eBook</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button variant={!aiMode ? "default" : "outline"} size="sm" onClick={() => setAiMode(false)} className="flex-1">
              Manual
            </Button>
            <Button variant={aiMode ? "default" : "outline"} size="sm" onClick={() => setAiMode(true)} className="flex-1">
              <Sparkles className="h-4 w-4 mr-1" />
              Com IA
            </Button>
          </div>

          {aiMode ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Descreva o eBook que pretende</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Um guia completo de marketing digital para pequenas empresas, cobrindo SEO, redes sociais e email marketing"
                  rows={4}
                />
              </div>
              <p className="text-xs text-muted-foreground">A IA irá gerar o título, subtítulo e estrutura de capítulos automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Guia Completo de Marketing Digital" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição do eBook..." rows={2} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            {aiMode ? (
              <Button onClick={handleAICreate} disabled={!aiPrompt.trim() || generating}>
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A gerar...</> : <><Sparkles className="h-4 w-4 mr-2" />Gerar eBook</>}
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!title.trim() || createEbook.isPending}>Criar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
