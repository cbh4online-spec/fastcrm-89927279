import { useState, useCallback } from "react";
import { useEbook, useUpdateEbook, EbookChapter } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Plus, Trash2, Sparkles, Loader2, ChevronDown, ChevronRight,
  BookOpen, Download, Globe, GripVertical
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

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
      const content = data?.content || "";
      updateChapter(chapter.id, "content", content);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </button>
          {editingTitle ? (
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={() => { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); } }}
              autoFocus
              className="text-xl font-bold h-auto py-0 border-none shadow-none focus-visible:ring-0 px-0"
            />
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setTempTitle(ebook.title); setEditingTitle(true); }}
            >
              {ebook.title}
            </h1>
          )}
          <div className="flex gap-2 items-center mt-1">
            <Badge variant={ebook.status === "published" ? "default" : "secondary"}>
              {ebook.status === "published" ? "Publicado" : "Rascunho"}
            </Badge>
            <span className="text-xs text-muted-foreground">{ebook.chapters.length} capítulos • {totalWords} palavras</span>
          </div>
        </div>
        <div className="flex gap-2">
          {ebook.slug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/ebook/${ebook.slug}`, "_blank")}>
              <Globe className="h-4 w-4 mr-1" /> Ver
            </Button>
          )}
          {ebook.status !== "published" && (
            <Button size="sm" onClick={publishEbook}>
              <BookOpen className="h-4 w-4 mr-1" /> Publicar
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-4 min-h-[60vh]">
        {/* Sidebar - chapters */}
        <div className="col-span-3 space-y-2">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Capítulos</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addChapter}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3 space-y-0.5">
              {ebook.chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChapterId(ch.id); setPreviewMode(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                    activeChapterId === ch.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <span className="truncate flex-1">{ch.title}</span>
                  {ch.content ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {ch.content.split(/\s+/).filter(Boolean).length}w
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  )}
                </button>
              ))}
              {!ebook.chapters.length && (
                <p className="text-xs text-muted-foreground text-center py-4">Adicione capítulos</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor area */}
        <div className="col-span-9">
          {activeChapter ? (
            <Card className="h-full">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <Input
                      value={activeChapter.title}
                      onChange={(e) => updateChapter(activeChapter.id, "title", e.target.value)}
                      className="font-medium border-none shadow-none focus-visible:ring-0 px-0 h-auto text-base"
                      placeholder="Título do capítulo"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? "Editar" : "Preview"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateChapterContent(activeChapter)}
                      disabled={generating === activeChapter.id}
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
                      >
                        <Sparkles className="h-4 w-4 mr-1" />Melhorar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeChapter(activeChapter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-60px)] overflow-y-auto">
                {previewMode ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{activeChapter.content || "*Sem conteúdo*"}</ReactMarkdown>
                  </div>
                ) : (
                  <Textarea
                    value={activeChapter.content}
                    onChange={(e) => updateChapter(activeChapter.id, "content", e.target.value)}
                    className="min-h-[50vh] resize-none border-none shadow-none focus-visible:ring-0 px-0 font-mono text-sm"
                    placeholder="Escreva o conteúdo do capítulo em Markdown...

A IA pode gerar o conteúdo automaticamente — clique em 'Gerar' acima."
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Selecione um capítulo para editar</p>
                <p className="text-xs mt-1">ou adicione um novo capítulo</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
