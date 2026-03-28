import { useState, useCallback } from "react";
import { useEbook, useUpdateEbook, EbookChapter } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2,
  BookOpen, Globe, CheckCircle2, Circle, FileText, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EbookEditorProps {
  ebookId: string;
  onBack: () => void;
}

export function EbookEditor({ ebookId, onBack }: EbookEditorProps) {
  const { data: ebook, isLoading } = useEbook(ebookId);
  const updateEbook = useUpdateEbook();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const saveChapters = useCallback((chapters: EbookChapter[]) => {
    updateEbook.mutate({ id: ebookId, chapters });
  }, [ebookId, updateEbook]);

  const addChapter = () => {
    if (!ebook) return;
    const newChapter: EbookChapter = {
      id: `ch-${Date.now()}`,
      title: `Capítulo ${ebook.chapters.length + 1}`,
      content: "",
    };
    const updated = [...ebook.chapters, newChapter];
    saveChapters(updated);
    setActiveChapterId(newChapter.id);
  };

  const removeChapter = (chapterId: string) => {
    if (!ebook) return;
    saveChapters(ebook.chapters.filter((c) => c.id !== chapterId));
    if (activeChapterId === chapterId) setActiveChapterId(null);
  };

  const updateChapter = (chapterId: string, field: keyof EbookChapter, value: string) => {
    if (!ebook) return;
    saveChapters(ebook.chapters.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c)));
  };

  const generateChapterContent = async (chapter: EbookChapter) => {
    if (!ebook) return;
    setGenerating(chapter.id);
    try {
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: {
          action: "generate_chapter",
          title: ebook.title,
          chapterTitle: chapter.title,
          chapterContext: chapter.description || "",
          tone: "Professional",
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || "");
      toast.success("Capítulo gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setGenerating(null);
    }
  };

  const improveContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    setGenerating(chapter.id);
    try {
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "improve_content", chapterContext: chapter.content },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo melhorado!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setGenerating(null);
    }
  };

  const publishEbook = () => {
    if (!ebook) return;
    updateEbook.mutate({ id: ebookId, status: "published" }, {
      onSuccess: () => toast.success("eBook publicado!"),
    });
  };

  if (isLoading || !ebook) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeChapter = ebook.chapters.find((c) => c.id === activeChapterId);
  const totalWords = ebook.chapters.reduce((sum, ch) => sum + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const filledChapters = ebook.chapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
  const progress = ebook.chapters.length > 0 ? (filledChapters / ebook.chapters.length) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <button onClick={onBack} className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> eBooks
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={() => { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); } }}
                  autoFocus
                  className="text-xl font-bold h-auto py-0 border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                />
              ) : (
                <h1
                  className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors text-foreground"
                  onClick={() => { setTempTitle(ebook.title); setEditingTitle(true); }}
                >
                  {ebook.title}
                </h1>
              )}
              {/* Stats bar */}
              <div className="flex items-center gap-4 mt-3">
                <Badge
                  className={
                    ebook.status === "published"
                      ? "bg-emerald-500/90 text-white border-0"
                      : "bg-amber-500/90 text-white border-0"
                  }
                >
                  {ebook.status === "published" ? "Publicado" : "Rascunho"}
                </Badge>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {ebook.chapters.length} capítulos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {totalWords.toLocaleString()} palavras
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {Math.round(progress)}% completo
                  </span>
                </div>
                {/* Mini progress */}
                <div className="hidden md:flex items-center gap-2 flex-1 max-w-[200px]">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              {ebook.slug && (
                <Button variant="outline" size="sm" onClick={() => window.open(`/ebook/${ebook.slug}`, "_blank")} className="border-primary/20 hover:bg-primary/5">
                  <Globe className="h-4 w-4 mr-1" /> Ver
                </Button>
              )}
              {ebook.status !== "published" && (
                <Button size="sm" onClick={publishEbook} className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <BookOpen className="h-4 w-4 mr-1" /> Publicar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-5 min-h-[60vh]">
        {/* Sidebar - chapters */}
        <div className="col-span-3 space-y-2">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Capítulos</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={addChapter}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3 pt-2 space-y-0.5">
              <AnimatePresence>
                {ebook.chapters.map((ch, i) => {
                  const hasContent = ch.content && ch.content.trim().length > 0;
                  return (
                    <motion.button
                      key={ch.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      onClick={() => { setActiveChapterId(ch.id); setPreviewMode(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200",
                        activeChapterId === ch.id
                          ? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-sm"
                          : "hover:bg-muted/70 border border-transparent"
                      )}
                    >
                      {hasContent ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate flex-1">{ch.title}</span>
                      {hasContent && (
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {ch.content!.split(/\s+/).filter(Boolean).length}w
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              {!ebook.chapters.length && (
                <div className="text-center py-8">
                  <Circle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Adicione capítulos</p>
                </div>
              )}
              {/* Add chapter dashed button */}
              <button
                onClick={addChapter}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-primary border-2 border-dashed border-border/60 hover:border-primary/30 transition-all mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar capítulo</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Editor area */}
        <div className="col-span-9">
          <AnimatePresence mode="wait">
            {activeChapter ? (
              <motion.div
                key={activeChapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card className="h-full border-border/60">
                  <CardHeader className="py-3 px-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <Input
                          value={activeChapter.title}
                          onChange={(e) => updateChapter(activeChapter.id, "title", e.target.value)}
                          className="font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto text-base bg-transparent"
                          placeholder="Título do capítulo"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {/* Edit/Preview tabs */}
                        <div className="flex bg-muted/50 rounded-md p-0.5 mr-1">
                          <button
                            onClick={() => setPreviewMode(false)}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-medium transition-all",
                              !previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setPreviewMode(true)}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-medium transition-all",
                              previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Preview
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateChapterContent(activeChapter)}
                          disabled={generating === activeChapter.id}
                          className="border-primary/20 hover:bg-primary/5 text-primary"
                        >
                          {generating === activeChapter.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><Sparkles className="h-4 w-4 mr-1" />Gerar</>
                          )}
                        </Button>
                        {activeChapter.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => improveContent(activeChapter)}
                            disabled={generating === activeChapter.id}
                            className="border-primary/20 hover:bg-primary/5 text-primary"
                          >
                            <Sparkles className="h-4 w-4 mr-1" />Melhorar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeChapter(activeChapter.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 h-[calc(100%-60px)] overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {previewMode ? (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-relaxed prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                        >
                          <ReactMarkdown>{activeChapter.content || "*Sem conteúdo*"}</ReactMarkdown>
                        </motion.div>
                      ) : (
                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Textarea
                            value={activeChapter.content}
                            onChange={(e) => updateChapter(activeChapter.id, "content", e.target.value)}
                            className="min-h-[50vh] resize-none border-none shadow-none focus-visible:ring-0 px-0 font-mono text-sm leading-relaxed bg-transparent"
                            placeholder="Escreva o conteúdo do capítulo em Markdown...

A IA pode gerar o conteúdo automaticamente — clique em 'Gerar' acima."
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <Card className="h-full flex items-center justify-center border-dashed border-2 border-border/40">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
                      <BookOpen className="h-8 w-8 text-primary/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Selecione um capítulo</p>
                    <p className="text-xs text-muted-foreground mt-1">ou adicione um novo para começar a escrever</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
