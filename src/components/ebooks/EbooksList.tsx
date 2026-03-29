import { useState } from "react";
import { useEbooks, useCreateEbook, useDeleteEbook } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Trash2, ExternalLink, Loader2, Sparkles, FileText, PenLine, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface EbooksListProps {
  onSelectEbook: (id: string) => void;
  onOpenWizard?: () => void;
}

export function EbooksList({ onSelectEbook, onOpenWizard }: EbooksListProps) {
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

  const totalWords = ebooks?.reduce((sum, eb) => sum + eb.chapters.reduce((s, ch) => s + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0), 0) || 0;
  const publishedCount = ebooks?.filter(e => e.status === "published").length || 0;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <BookMarked className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Biblioteca de eBooks</h1>
                <Badge variant="outline" className="border-primary/30 text-primary text-xs font-medium">PREMIUM</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Crie eBooks com IA para captura de leads nos seus funis</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* KPIs */}
            <div className="hidden md:flex items-center gap-4 mr-4">
              <div className="text-center px-4 py-1.5 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{ebooks?.length || 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">eBooks</p>
              </div>
              <div className="text-center px-4 py-1.5 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{publishedCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Publicados</p>
              </div>
              <div className="text-center px-4 py-1.5 rounded-lg bg-background/60 border border-border/50">
                <p className="text-lg font-bold text-foreground">{totalWords.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Palavras</p>
              </div>
            </div>
            <Button onClick={() => onOpenWizard ? onOpenWizard() : setShowCreate(true)} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Criar com IA
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(true)} className="border-primary/20 hover:bg-primary/5">
              <Plus className="h-4 w-4 mr-2" />
              Criar Manual
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !ebooks?.length ? (
        /* Premium Empty State */
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <BookOpen className="h-12 w-12 text-primary/60" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Comece a sua biblioteca</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">Crie eBooks profissionais para captura de leads. Use a IA para gerar conteúdo ou escreva manualmente.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setAiMode(false); setShowCreate(true); }} className="border-primary/20 hover:bg-primary/5">
                <PenLine className="h-4 w-4 mr-2" />
                Criar Manual
              </Button>
              <Button onClick={() => onOpenWizard ? onOpenWizard() : (() => { setAiMode(true); setShowCreate(true); })()} className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4 mr-2" />
                Criar com IA
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ebooks.map((ebook, index) => {
            const words = ebook.chapters.reduce((s, ch) => s + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0);
            const filledChapters = ebook.chapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
            const progress = ebook.chapters.length > 0 ? (filledChapters / ebook.chapters.length) * 100 : 0;

            return (
              <motion.div
                key={ebook.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card
                  className="cursor-pointer group overflow-hidden border border-border/50 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  onClick={() => onSelectEbook(ebook.id)}
                >
                  {/* Cover gradient */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/15 via-primary/5 to-accent overflow-hidden">
                    {ebook.cover_url ? (
                      <img src={ebook.cover_url} alt={ebook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-semibold text-sm text-foreground truncate">{ebook.title}</h3>
                      {ebook.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{ebook.subtitle}</p>}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge
                        className={
                          ebook.status === "published"
                            ? "bg-emerald-500/90 text-white border-0 text-[10px]"
                            : ebook.status === "archived"
                            ? "bg-muted text-muted-foreground border-0 text-[10px]"
                            : "bg-amber-500/90 text-white border-0 text-[10px]"
                        }
                      >
                        {ebook.status === "published" ? "Publicado" : ebook.status === "archived" ? "Arquivado" : "Rascunho"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{filledChapters}/{ebook.chapters.length} capítulos escritos</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {ebook.author_name && (
                          <span className="flex items-center gap-1">
                            <PenLine className="h-3 w-3" />
                            {ebook.author_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {words.toLocaleString()} palavras
                        </span>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {ebook.slug && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(`/ebook/${ebook.slug}`, "_blank"); }}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteEbook.mutate(ebook.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog - Premium */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Criar eBook</DialogTitle>
          </DialogHeader>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setAiMode(false)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                !aiMode ? "bg-background shadow-sm border border-border/60 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${!aiMode ? "bg-primary/10" : "bg-muted"}`}>
                <PenLine className={`h-3.5 w-3.5 ${!aiMode ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              Manual
            </button>
            <button
              onClick={() => setAiMode(true)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                aiMode ? "bg-background shadow-sm border border-border/60 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${aiMode ? "bg-primary/10" : "bg-muted"}`}>
                <Sparkles className={`h-3.5 w-3.5 ${aiMode ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              Com IA
            </button>
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
              <Button onClick={handleAICreate} disabled={!aiPrompt.trim() || generating} className="bg-gradient-to-r from-primary to-primary/80">
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
