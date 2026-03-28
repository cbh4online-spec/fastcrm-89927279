import { useState, useCallback, useRef } from "react";
import { useEbook, useUpdateEbook, EbookChapter } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2,
  BookOpen, Globe, CheckCircle2, Circle, FileText, BarChart3,
  Image, Upload, Wand2, Coins
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FlipbookReader } from "./FlipbookReader";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";

interface EbookEditorProps {
  ebookId: string;
  onBack: () => void;
}

async function uploadEbookImage(file: File, path: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${path}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("ebook-assets").upload(filePath, file, { upsert: true });
  if (error) { toast.error("Erro no upload: " + error.message); return null; }
  const { data } = supabase.storage.from("ebook-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

export function EbookEditor({ ebookId, onBack }: EbookEditorProps) {
  const { data: ebook, isLoading } = useEbook(ebookId);
  const updateEbook = useUpdateEbook();
  const { canAfford, getCost, consumeCredits } = useCreditWallet();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingChapterImg, setUploadingChapterImg] = useState(false);
  const [generatingCoverAI, setGeneratingCoverAI] = useState(false);
  const [generatingChapterImgAI, setGeneratingChapterImgAI] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const chapterImgRef = useRef<HTMLInputElement>(null);

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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ebook) return;
    setUploadingCover(true);
    const url = await uploadEbookImage(file, `covers/${ebookId}`);
    if (url) {
      updateEbook.mutate({ id: ebookId, cover_url: url });
      toast.success("Capa atualizada!");
    }
    setUploadingCover(false);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleChapterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ebook || !activeChapterId) return;
    setUploadingChapterImg(true);
    const url = await uploadEbookImage(file, `chapters/${ebookId}`);
    if (url) {
      saveChapters(ebook.chapters.map(c => c.id === activeChapterId ? { ...c, cover_image: url } : c));
      toast.success("Imagem do capítulo atualizada!");
    }
    setUploadingChapterImg(false);
    if (chapterImgRef.current) chapterImgRef.current.value = "";
  };

  const generateCoverAI = async () => {
    if (!ebook) return;
    if (!canAfford("ebook_generate_cover")) {
      triggerNoCreditsDialog({ actionLabel: "Gerar Capa IA", creditsNeeded: getCost("ebook_generate_cover") });
      return;
    }
    setGeneratingCoverAI(true);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_cover", referenceType: "ebook", referenceId: ebookId });
      const prompt = `Create a professional, modern eBook cover image for a book titled "${ebook.title}"${ebook.subtitle ? ` with subtitle "${ebook.subtitle}"` : ""}. The image should be visually striking, suitable for a digital book cover, with abstract or thematic elements. Do NOT include any text in the image. High quality, editorial style.`;
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_image", imagePrompt: prompt, ebookId, target: "cover" },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) {
        updateEbook.mutate({ id: ebookId, cover_url: data.url });
        toast.success("Capa gerada com IA!");
      }
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGeneratingCoverAI(false); }
  };

  const generateChapterImageAI = async () => {
    if (!ebook || !activeChapterId) return;
    const ch = ebook.chapters.find(c => c.id === activeChapterId);
    if (!ch) return;
    if (!canAfford("ebook_generate_chapter_image")) {
      triggerNoCreditsDialog({ actionLabel: "Imagem Capítulo IA", creditsNeeded: getCost("ebook_generate_chapter_image") });
      return;
    }
    setGeneratingChapterImgAI(true);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_chapter_image", referenceType: "ebook", referenceId: ebookId });
      const prompt = `Create a professional, atmospheric illustration for an eBook chapter titled "${ch.title}" from the book "${ebook.title}". The image should be evocative, editorial quality, suitable as a chapter header. Abstract or thematic, no text in the image. Wide format, cinematic.`;
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_image", imagePrompt: prompt, ebookId, target: `chapter-${activeChapterId}` },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) {
        saveChapters(ebook.chapters.map(c => c.id === activeChapterId ? { ...c, cover_image: data.url } : c));
        toast.success("Imagem do capítulo gerada com IA!");
      }
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGeneratingChapterImgAI(false); }
  };

  const generateChapterContent = async (chapter: EbookChapter) => {
    if (!ebook) return;
    if (!canAfford("ebook_generate_chapter")) {
      triggerNoCreditsDialog({ actionLabel: "Gerar Capítulo IA", creditsNeeded: getCost("ebook_generate_chapter") });
      return;
    }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_chapter", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_chapter", title: ebook.title, chapterTitle: chapter.title, chapterContext: chapter.description || "", tone: "Professional" },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || "");
      toast.success("Capítulo gerado com sucesso!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const improveContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_improve_content")) {
      triggerNoCreditsDialog({ actionLabel: "Melhorar Conteúdo IA", creditsNeeded: getCost("ebook_improve_content") });
      return;
    }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_improve_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "improve_content", chapterContext: chapter.content },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo melhorado!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const publishEbook = () => {
    if (!ebook) return;
    updateEbook.mutate({ id: ebookId, status: "published" }, { onSuccess: () => toast.success("eBook publicado!") });
  };

  if (isLoading || !ebook) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeChapter = ebook.chapters.find((c) => c.id === activeChapterId);
  const totalWords = ebook.chapters.reduce((sum, ch) => sum + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const filledChapters = ebook.chapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
  const progress = ebook.chapters.length > 0 ? (filledChapters / ebook.chapters.length) * 100 : 0;
  const activeChapterIndex = ebook.chapters.findIndex(c => c.id === activeChapterId);

  return (
    <div className="space-y-5">
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={chapterImgRef} type="file" accept="image/*" className="hidden" onChange={handleChapterImageUpload} />

      {/* Header with cover preview */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Cover image band */}
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-accent">
          {ebook.cover_url ? (
            <img src={ebook.cover_url} alt="" className="w-full h-full object-cover opacity-60" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              onClick={generateCoverAI}
              disabled={generatingCoverAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/90 backdrop-blur text-primary-foreground text-xs font-medium hover:bg-primary transition-all"
            >
              {generatingCoverAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              Gerar com IA
            </button>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur border border-border/60 text-xs font-medium hover:bg-background transition-all"
            >
              {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload
            </button>
          </div>
        </div>
        <div className="relative px-5 pb-5 -mt-8">
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
                <h1 className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors text-foreground" onClick={() => { setTempTitle(ebook.title); setEditingTitle(true); }}>
                  {ebook.title}
                </h1>
              )}
              <div className="flex items-center gap-4 mt-3">
                <Badge className={ebook.status === "published" ? "bg-emerald-500/90 text-white border-0" : "bg-amber-500/90 text-white border-0"}>
                  {ebook.status === "published" ? "Publicado" : "Rascunho"}
                </Badge>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{ebook.chapters.length} capítulos</span>
                  <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{totalWords.toLocaleString()} palavras</span>
                  <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{Math.round(progress)}% completo</span>
                </div>
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
        {/* Sidebar */}
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
                      {hasContent ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-amber-400 shrink-0" />}
                      <span className="truncate flex-1">{ch.title}</span>
                      {ch.cover_image && <Image className="h-3 w-3 text-muted-foreground shrink-0" />}
                      {hasContent && <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{ch.content!.split(/\s+/).filter(Boolean).length}w</span>}
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
              <button onClick={addChapter} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-primary border-2 border-dashed border-border/60 hover:border-primary/30 transition-all mt-2">
                <Plus className="h-3.5 w-3.5" /><span>Adicionar capítulo</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Editor area */}
        <div className="col-span-9">
          <AnimatePresence mode="wait">
            {activeChapter ? (
              <motion.div key={activeChapter.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
                <Card className="h-full border-border/60 overflow-hidden">
                  {/* Chapter cover image */}
                  {activeChapter.cover_image && (
                    <div className="relative h-48 overflow-hidden">
                      <img src={activeChapter.cover_image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Capítulo {activeChapterIndex + 1}</span>
                      </div>
                    </div>
                  )}
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
                        {/* Chapter image - AI generate */}
                        <Button variant="outline" size="sm" onClick={generateChapterImageAI} disabled={generatingChapterImgAI} className="border-primary/20 hover:bg-primary/5 text-primary">
                          {generatingChapterImgAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-1" />Imagem IA</>}
                        </Button>
                        {/* Chapter image - upload */}
                        <Button variant="outline" size="sm" onClick={() => chapterImgRef.current?.click()} disabled={uploadingChapterImg} className="border-primary/20 hover:bg-primary/5">
                          {uploadingChapterImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Upload</>}
                        </Button>
                        {/* Edit/Preview tabs */}
                        <div className="flex bg-muted/50 rounded-md p-0.5 mr-1">
                          <button onClick={() => setPreviewMode(false)} className={cn("px-3 py-1 rounded text-xs font-medium transition-all", !previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            Editar
                          </button>
                          <button onClick={() => setPreviewMode(true)} className={cn("px-3 py-1 rounded text-xs font-medium transition-all", previewMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            Preview
                          </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => generateChapterContent(activeChapter)} disabled={generating === activeChapter.id} className="border-primary/20 hover:bg-primary/5 text-primary">
                          {generating === activeChapter.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" />Gerar</>}
                        </Button>
                        {activeChapter.content && (
                          <Button variant="outline" size="sm" onClick={() => improveContent(activeChapter)} disabled={generating === activeChapter.id} className="border-primary/20 hover:bg-primary/5 text-primary">
                            <Sparkles className="h-4 w-4 mr-1" />Melhorar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeChapter(activeChapter.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-60px)] overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {previewMode ? (
                        <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-4 px-2">
                          <FlipbookReader
                            title={ebook.title}
                            subtitle={ebook.subtitle || undefined}
                            author={ebook.author_name || undefined}
                            coverUrl={ebook.cover_url || undefined}
                            chapters={ebook.chapters}
                            compact
                          />
                        </motion.div>
                      ) : (
                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                          <Textarea
                            value={activeChapter.content}
                            onChange={(e) => updateChapter(activeChapter.id, "content", e.target.value)}
                            className="min-h-[50vh] resize-none border-none shadow-none focus-visible:ring-0 px-0 font-mono text-sm leading-relaxed bg-transparent"
                            placeholder="Escreva o conteúdo do capítulo em Markdown...&#10;&#10;Use ![legenda](url) para adicionar imagens inline.&#10;A IA pode gerar o conteúdo automaticamente — clique em 'Gerar' acima."
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
