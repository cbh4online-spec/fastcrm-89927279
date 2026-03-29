import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { useEbook, useUpdateEbook, EbookChapter, EbookContactPage } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Sparkles, Loader2,
  BookOpen, Globe, FileText, BarChart3,
  Upload, Wand2, Coins, Minimize2, Maximize2,
  Palette, Play, Trash2, Undo2, Redo2,
  Mail, Phone, Link, Type, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FlipbookReader } from "./FlipbookReader";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import { EbookRichEditor, type EbookRichEditorHandle } from "./EbookRichEditor";
import { EbookBlockToolbar } from "./EbookBlockToolbar";
import { ChapterThumbnail } from "./ChapterThumbnail";
import { BlockActionMenu } from "./BlockActionMenu";
import { EbookThemeSelector } from "./EbookThemeSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingChapterImg, setUploadingChapterImg] = useState(false);
  const [generatingCoverAI, setGeneratingCoverAI] = useState(false);
  const [generatingChapterImgAI, setGeneratingChapterImgAI] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const chapterImgRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const richEditorRef = useRef<EbookRichEditorHandle>(null);

  // Local state for branding/contact fields (debounced save)
  const [localHeaderText, setLocalHeaderText] = useState("");
  const [localFooterText, setLocalFooterText] = useState("");
  const [localContactPage, setLocalContactPage] = useState<EbookContactPage>({});
  const brandingInitRef = useRef(false);

  // Sync local state from server when ebook loads
  useEffect(() => {
    if (ebook && !brandingInitRef.current) {
      setLocalHeaderText((ebook as any).header_text || "");
      setLocalFooterText((ebook as any).footer_text || "");
      setLocalContactPage((ebook as any).contact_page || {});
      brandingInitRef.current = true;
    }
  }, [ebook]);

  // Debounced save for branding fields
  useEffect(() => {
    if (!brandingInitRef.current) return;
    const timer = setTimeout(() => {
      updateEbook.mutate({
        id: ebookId,
        header_text: localHeaderText,
        footer_text: localFooterText,
        contact_page: localContactPage,
      } as any);
    }, 800);
    return () => clearTimeout(timer);
  }, [localHeaderText, localFooterText, localContactPage, ebookId]);

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

  const duplicateChapter = (chapterId: string) => {
    if (!ebook) return;
    const ch = ebook.chapters.find(c => c.id === chapterId);
    if (!ch) return;
    const dup: EbookChapter = { ...ch, id: `ch-${Date.now()}`, title: `${ch.title} (cópia)` };
    const idx = ebook.chapters.findIndex(c => c.id === chapterId);
    const updated = [...ebook.chapters];
    updated.splice(idx + 1, 0, dup);
    saveChapters(updated);
  };

  const moveChapter = (chapterId: string, direction: 'up' | 'down') => {
    if (!ebook) return;
    const idx = ebook.chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= ebook.chapters.length) return;
    const updated = [...ebook.chapters];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveChapters(updated);
  };

  // Drag & Drop
  const handleDragStart = (_e: DragEvent, index: number) => {
    setDragSourceIndex(index);
  };
  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };
  const handleDrop = (_e: DragEvent, targetIndex: number) => {
    if (dragSourceIndex === null || !ebook) return;
    if (dragSourceIndex === targetIndex) return;
    const updated = [...ebook.chapters];
    const [moved] = updated.splice(dragSourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    saveChapters(updated);
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  // Insert block via rich editor ref
  const insertBlock = (html: string) => {
    richEditorRef.current?.insertBlock(html);
  };

  // Cover & Image handlers
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

  const condenseContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_condense_content")) {
      triggerNoCreditsDialog({ actionLabel: "Condensar Conteúdo", creditsNeeded: getCost("ebook_condense_content") });
      return;
    }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_condense_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "condense_content", chapterContext: chapter.content },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo condensado!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const expandContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_expand_content")) {
      triggerNoCreditsDialog({ actionLabel: "Expandir Conteúdo", creditsNeeded: getCost("ebook_expand_content") });
      return;
    }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_expand_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "expand_content", chapterContext: chapter.content },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo expandido!");
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

  return (
    <div className="space-y-0 h-[calc(100vh-80px)] flex flex-col">
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={chapterImgRef} type="file" accept="image/*" className="hidden" onChange={handleChapterImageUpload} />

      {/* Compact Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-card/80 backdrop-blur shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Cover thumbnail */}
        <div className="w-8 h-10 rounded overflow-hidden bg-muted shrink-0 border border-border/40">
          {ebook.cover_url ? (
            <img src={ebook.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={() => { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { updateEbook.mutate({ id: ebookId, title: tempTitle }); setEditingTitle(false); } }}
              autoFocus
              className="text-sm font-semibold h-auto py-0 border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
            />
          ) : (
            <h1
              className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors truncate"
              onClick={() => { setTempTitle(ebook.title); setEditingTitle(true); }}
            >
              {ebook.title}
            </h1>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{ebook.chapters.length} capítulos</span>
            <span>{totalWords.toLocaleString()} palavras</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5">
          <Badge className={cn("text-[10px]", ebook.status === "published" ? "bg-emerald-500/90 text-white border-0" : "bg-amber-500/90 text-white border-0")}>
            {ebook.status === "published" ? "Publicado" : "Rascunho"}
          </Badge>

          {/* Theme button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border/40">
                <Palette className="h-3 w-3" /> Tema
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-4" align="end">
              <h4 className="text-sm font-semibold mb-3">Escolher Tema</h4>
              <EbookThemeSelector
                value={(ebook as any).theme || "modern-dark"}
                onChange={(theme) => updateEbook.mutate({ id: ebookId, theme } as any)}
              />
            </PopoverContent>
          </Popover>

          {/* Presentation button */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border/40" onClick={() => setShowPresentation(true)}>
            <Play className="h-3 w-3" /> Apresentar
          </Button>

          {/* Cover buttons */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border/40" onClick={generateCoverAI} disabled={generatingCoverAI}>
            {generatingCoverAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Capa IA
            <span className="text-[9px] opacity-70 flex items-center gap-0.5"><Coins className="h-2 w-2" />{getCost("ebook_generate_cover")}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border/40" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
            {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          </Button>

          {ebook.slug && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border/40" onClick={() => window.open(`/ebook/${ebook.slug}`, "_blank")}>
              <Globe className="h-3 w-3" /> Ver
            </Button>
          )}
          {ebook.status !== "published" && (
            <Button size="sm" className="h-7 text-xs gap-1 bg-gradient-to-r from-primary to-primary/80" onClick={publishEbook}>
              <BookOpen className="h-3 w-3" /> Publicar
            </Button>
          )}
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Chapter thumbnails */}
        <div className="w-44 shrink-0 border-r border-border/40 bg-muted/30 flex flex-col">
          <div className="p-2 border-b border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Páginas</span>
            <button onClick={addChapter} className="p-1 rounded hover:bg-accent transition-colors" title="Adicionar capítulo">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {ebook.chapters.map((ch, i) => (
                <ChapterThumbnail
                  key={ch.id}
                  chapter={ch}
                  index={i}
                  isActive={activeChapterId === ch.id}
                  onClick={() => setActiveChapterId(ch.id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === i}
                />
              ))}
              {!ebook.chapters.length && (
                <div className="text-center py-8">
                  <p className="text-[10px] text-muted-foreground">Sem capítulos</p>
                </div>
              )}
              <button
                onClick={addChapter}
                className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border/40 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </ScrollArea>
        </div>

        {/* Center: Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-background" ref={editorRef}>
          <AnimatePresence mode="wait">
            {activeChapter ? (
              <motion.div
                key={activeChapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-3xl mx-auto"
              >
                {/* Chapter header image */}
                {activeChapter.cover_image && (
                  <div className="relative h-52 overflow-hidden">
                    <img src={activeChapter.cover_image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  </div>
                )}

                {/* Chapter toolbar */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/30 px-6 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={activeChapter.title}
                      onChange={(e) => updateChapter(activeChapter.id, "title", e.target.value)}
                      className="font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto text-base bg-transparent"
                      placeholder="Título do capítulo"
                    />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => richEditorRef.current?.undo()} title="Desfazer (Ctrl+Z)">
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => richEditorRef.current?.redo()} title="Refazer (Ctrl+Y)">
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="w-px h-5 bg-border my-auto mx-0.5" />
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={generateChapterImageAI} disabled={generatingChapterImgAI}>
                      {generatingChapterImgAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Img IA
                      <span className="text-[9px] opacity-70 flex items-center gap-0.5"><Coins className="h-2 w-2" />{getCost("ebook_generate_chapter_image")}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => chapterImgRef.current?.click()} disabled={uploadingChapterImg}>
                      {uploadingChapterImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => generateChapterContent(activeChapter)} disabled={generating === activeChapter.id}>
                      {generating === activeChapter.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Gerar
                      <span className="text-[9px] opacity-70 flex items-center gap-0.5"><Coins className="h-2 w-2" />{getCost("ebook_generate_chapter")}</span>
                    </Button>
                    {activeChapter.content && (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => improveContent(activeChapter)} disabled={generating === activeChapter.id}>
                          <Sparkles className="h-3 w-3" /> Melhorar
                          <span className="text-[9px] opacity-70"><Coins className="h-2 w-2 inline" />{getCost("ebook_improve_content")}</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => condenseContent(activeChapter)} disabled={generating === activeChapter.id}>
                          <Minimize2 className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => expandContent(activeChapter)} disabled={generating === activeChapter.id}>
                          <Maximize2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}

                    {/* Block action menu for this chapter */}
                    <div className="group">
                      <BlockActionMenu
                        onDuplicate={() => duplicateChapter(activeChapter.id)}
                        onDelete={() => removeChapter(activeChapter.id)}
                        onMoveUp={() => moveChapter(activeChapter.id, 'up')}
                        onMoveDown={() => moveChapter(activeChapter.id, 'down')}
                        onAIRewrite={activeChapter.content ? () => improveContent(activeChapter) : undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* WYSIWYG Editor */}
                <div className="px-6 py-6 bg-white rounded-lg shadow mx-4 mb-6">
                  <EbookRichEditor
                    ref={richEditorRef}
                    value={activeChapter.content || ""}
                    onChange={(val) => updateChapter(activeChapter.id, "content", val)}
                    placeholder="Comece a escrever o conteúdo do capítulo...&#10;&#10;Use a toolbar de blocos à direita para inserir elementos.&#10;Selecione texto para formatar com a toolbar flutuante."
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
                    <BookOpen className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Selecione um capítulo</p>
                  <p className="text-xs text-muted-foreground mt-1">ou adicione um novo na barra lateral</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar: Block toolbar + Branding */}
        <div className="w-48 shrink-0 flex flex-col border-l border-border/40 bg-muted/20 overflow-y-auto">
          <div>
            <EbookBlockToolbar
              onInsertBlock={insertBlock}
              onUndo={() => richEditorRef.current?.undo()}
              onRedo={() => richEditorRef.current?.redo()}
            />
          </div>

          {/* Branding section */}
          <div className="border-t border-border/40 p-3 space-y-3 overflow-y-auto flex-1">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Type className="h-3 w-3" /> Cabeçalho / Rodapé
              </span>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Texto do cabeçalho"
                  value={localHeaderText}
                  onChange={(e) => setLocalHeaderText(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Texto do rodapé"
                  value={localFooterText}
                  onChange={(e) => setLocalFooterText(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <div className="border-t border-border/30 pt-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Página de Contactos
              </span>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Slogan"
                  value={localContactPage.slogan || ""}
                  onChange={(e) => setLocalContactPage(prev => ({ ...prev, slogan: e.target.value }))}
                  className="h-7 text-xs"
                />
                <div className="flex gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground mt-2 shrink-0" />
                  <Input
                    placeholder="Email"
                    value={localContactPage.email || ""}
                    onChange={(e) => setLocalContactPage(prev => ({ ...prev, email: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground mt-2 shrink-0" />
                  <Input
                    placeholder="Telefone"
                    value={localContactPage.phone || ""}
                    onChange={(e) => setLocalContactPage(prev => ({ ...prev, phone: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <Link className="h-3 w-3 text-muted-foreground mt-2 shrink-0" />
                  <Input
                    placeholder="Website"
                    value={localContactPage.website || ""}
                    onChange={(e) => setLocalContactPage(prev => ({ ...prev, website: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Presentation Dialog (Fullscreen) */}
      <Dialog open={showPresentation} onOpenChange={setShowPresentation}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 border-0 rounded-none bg-slate-950 [&>button]:text-white [&>button]:z-50">
          <FlipbookReader
            title={ebook.title}
            subtitle={ebook.subtitle || undefined}
            author={ebook.author_name || undefined}
            coverUrl={ebook.cover_url || undefined}
            chapters={ebook.chapters}
            headerText={localHeaderText || undefined}
            footerText={localFooterText || undefined}
            contactPage={Object.keys(localContactPage).length > 0 ? localContactPage : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
