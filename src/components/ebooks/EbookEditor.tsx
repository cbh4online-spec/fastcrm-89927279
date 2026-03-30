import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { useEbook, useUpdateEbook, EbookChapter, EbookContactPage, ContentBlock } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Sparkles, Loader2,
  BookOpen, Globe, FileText, BarChart3,
  Upload, Wand2, Coins, Minimize2, Maximize2,
  Palette, Play, Trash2, Undo2, Redo2,
  Mail, Phone, Link, Type, MessageSquare, ChevronDown,
  Settings, CheckCircle2, Shield, Users, LayoutGrid,
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
import { EbookPageCanvas } from "./EbookPageCanvas";
import { BlockPropertiesPanel } from "./BlockPropertiesPanel";
import { ChapterThumbnail } from "./ChapterThumbnail";
import { BlockActionMenu } from "./BlockActionMenu";
import { EbookThemeSelector } from "./EbookThemeSelector";
import { EbookEditorNotesPanel } from "./EbookEditorNotesPanel";
import { useEbookNotes } from "@/hooks/useEbookNotes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { notes, isLoading: notesLoading, addNote, updateNote, deleteNote } = useEbookNotes(ebookId, ebook?.workspace_id);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
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
  const [useVisualEditor, setUseVisualEditor] = useState(true);
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

  // Load Google Fonts dynamically
  useEffect(() => {
    const gs = (ebook as any)?.global_styles;
    if (!gs) return;
    const fonts = new Set<string>();
    [gs.headingFont, gs.bodyFont].forEach((f: string) => {
      if (f) {
        const match = f.match(/'([^']+)'/);
        if (match) fonts.add(match[1]);
      }
    });
    if (fonts.size === 0) return;
    const id = 'ebook-google-fonts';
    let link = document.getElementById(id) as HTMLLinkElement;
    const href = `https://fonts.googleapis.com/css2?${[...fonts].map(f => `family=${f.replace(/\s/g, '+')}:wght@400;600;700`).join('&')}&display=swap`;
    if (link) { link.href = href; } else {
      link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = href;
      document.head.appendChild(link);
    }
  }, [(ebook as any)?.global_styles?.headingFont, (ebook as any)?.global_styles?.bodyFont]);

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

  // Migrate HTML content to blocks
  const migrateContentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content || content.trim() === '') return [];
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const blocks: ContentBlock[] = [];
    temp.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          blocks.push({ id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'paragraph', content: `<p>${text}</p>`, styles: { paddingTop: '4px', paddingBottom: '4px' } });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      let type: ContentBlock['type'] = 'paragraph';
      let defaultStyles: ContentBlock['styles'] = { paddingTop: '4px', paddingBottom: '4px' };
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') { type = 'heading'; defaultStyles = { paddingTop: '8px', paddingBottom: '4px', fontSize: tag === 'h1' ? '28px' : tag === 'h2' ? '24px' : '20px', fontWeight: '700' }; }
      else if (tag === 'blockquote') { type = 'quote'; defaultStyles = { paddingTop: '12px', paddingBottom: '12px', paddingLeft: '16px' }; }
      else if (tag === 'hr') { type = 'divider'; defaultStyles = { marginTop: '16px', marginBottom: '16px' }; }
      else if (tag === 'ul' || tag === 'ol') { type = 'list'; }
      else if (tag === 'table') { type = 'table'; }
      else if (tag === 'img') { type = 'image'; defaultStyles = { borderRadius: '8px', paddingTop: '8px', paddingBottom: '8px' }; }
      blocks.push({
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        content: type === 'image' ? (el.getAttribute('src') || '') : el.outerHTML,
        styles: defaultStyles,
      });
    });
    return blocks.length > 0 ? blocks : [{ id: `blk-${Date.now()}`, type: 'paragraph', content: content, styles: { paddingTop: '4px', paddingBottom: '4px' } }];
  }, []);

  const ensureChapterBlocks = useCallback((chapter: EbookChapter): EbookChapter => {
    if (chapter.blocks && chapter.blocks.length > 0) return chapter;
    if (!chapter.content || chapter.content.trim() === '') return { ...chapter, blocks: [] };
    return { ...chapter, blocks: migrateContentToBlocks(chapter.content) };
  }, [migrateContentToBlocks]);

  const addChapter = () => {
    if (!ebook) return;
    const newChapter: EbookChapter = {
      id: `ch-${Date.now()}`,
      title: `Capítulo ${ebook.chapters.length + 1}`,
      content: "",
      blocks: [],
      layout: 'single',
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
  const handleDragStart = (_e: DragEvent, index: number) => { setDragSourceIndex(index); };
  const handleDragOver = (e: DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragLeave = () => { setDragOverIndex(null); };
  const handleDragEnd = () => { setDragSourceIndex(null); setDragOverIndex(null); };
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
  const insertBlock = (html: string) => { richEditorRef.current?.insertBlock(html); };

  // Inline image upload handler for toolbar
  const handleInlineImageUpload = async (file: File): Promise<string | null> => {
    return uploadEbookImage(file, `inline/${ebookId}`);
  };

  // AI image generation handler for toolbar
  const handleGenerateInlineImageAI = async (prompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", {
        body: { action: "generate_image", imagePrompt: prompt, ebookId, target: `inline-${Date.now()}` },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      return data?.url || null;
    } catch (e: any) {
      toast.error("Erro ao gerar imagem: " + e.message);
      return null;
    }
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

      {/* ═══════════════ HEADER SIMPLIFICADO ═══════════════ */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-card/80 backdrop-blur shrink-0 h-12">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Title — editable inline */}
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
        </div>

        {/* Status badge */}
        <Badge className={cn("text-xs shrink-0", ebook.status === "published" ? "bg-emerald-500/90 text-white border-0" : "bg-amber-500/90 text-white border-0")}>
          {ebook.status === "published" ? "Publicado" : "Rascunho"}
        </Badge>

        {/* Settings dropdown — groups secondary actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40">
              <Settings className="h-3.5 w-3.5" />
              Definições
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={generateCoverAI} disabled={generatingCoverAI}>
              {generatingCoverAI ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
              Gerar Capa IA
              <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_cover")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
              Upload de Capa
            </DropdownMenuItem>
            {ebook.slug && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(`/ebook/${ebook.slug}`, "_blank")}>
                  <Globe className="h-3.5 w-3.5 mr-2" /> Ver publicação
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Preview */}
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40" onClick={() => setShowPresentation(true)}>
          <Play className="h-3.5 w-3.5" /> Pré-visualizar
        </Button>

        {/* Publish */}
        {ebook.status !== "published" && (
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-primary to-primary/80" onClick={publishEbook}>
            <BookOpen className="h-3.5 w-3.5" /> Publicar
          </Button>
        )}
      </div>

      {/* ═══════════════ 3-COLUMN LAYOUT ═══════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR: Chapter thumbnails (200px) ── */}
        <div className="w-[200px] shrink-0 border-r border-border/40 bg-muted/30 flex flex-col">
          <div className="p-2.5 border-b border-border/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Capítulos</span>
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
                  onDuplicate={() => duplicateChapter(ch.id)}
                  onDelete={() => removeChapter(ch.id)}
                  onMoveUp={() => moveChapter(ch.id, 'up')}
                  onMoveDown={() => moveChapter(ch.id, 'down')}
                />
              ))}
              {!ebook.chapters.length && (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sem capítulos</p>
                </div>
              )}
              <button
                onClick={addChapter}
                className="w-full aspect-[3/2] rounded-lg border-2 border-dashed border-border/40 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER: Editor area ── */}
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
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/30 px-6 py-2 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={activeChapter.title}
                      onChange={(e) => updateChapter(activeChapter.id, "title", e.target.value)}
                      className="font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto text-base bg-transparent"
                      placeholder="Título do capítulo"
                    />
                  </div>
                  <div className="flex gap-1 shrink-0 flex-wrap items-center">
                    {/* Editor mode toggle */}
                    <Button
                      variant={useVisualEditor ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px] gap-1 px-2"
                      onClick={() => {
                        if (!useVisualEditor) {
                          // Switching to visual: ensure blocks
                          const migrated = ensureChapterBlocks(activeChapter);
                          if (migrated !== activeChapter) {
                            saveChapters(ebook.chapters.map(c => c.id === activeChapter.id ? migrated : c));
                          }
                        }
                        setUseVisualEditor(!useVisualEditor);
                        setSelectedBlockId(null);
                      }}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      {useVisualEditor ? "Visual" : "Clássico"}
                    </Button>
                    <div className="w-px h-5 bg-border my-auto mx-0.5" />
                    {!useVisualEditor && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => richEditorRef.current?.undo()} title="Desfazer (Ctrl+Z)">
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => richEditorRef.current?.redo()} title="Refazer (Ctrl+Y)">
                          <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-5 bg-border my-auto mx-0.5" />
                      </>
                    )}
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={generateChapterImageAI} disabled={generatingChapterImgAI}>
                      {generatingChapterImgAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Img IA
                      <span className="text-[10px] opacity-70 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_chapter_image")}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => chapterImgRef.current?.click()} disabled={uploadingChapterImg}>
                      {uploadingChapterImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </Button>
                    <div className="w-px h-5 bg-border my-auto mx-0.5" />
                    {/* AI Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-primary" disabled={generating === activeChapter.id}>
                          {generating === activeChapter.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          IA
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem onClick={() => generateChapterContent(activeChapter)}>
                          <Sparkles className="h-3.5 w-3.5 mr-2" /> Gerar conteúdo
                          <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_chapter")}</span>
                        </DropdownMenuItem>
                        {activeChapter.content && (
                          <>
                            <DropdownMenuItem onClick={() => improveContent(activeChapter)}>
                              <Wand2 className="h-3.5 w-3.5 mr-2" /> Melhorar
                              <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_improve_content")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => condenseContent(activeChapter)}>
                              <Minimize2 className="h-3.5 w-3.5 mr-2" /> Condensar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => expandContent(activeChapter)}>
                              <Maximize2 className="h-3.5 w-3.5 mr-2" /> Expandir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

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

                {/* Editor area — Visual or Classic */}
                {useVisualEditor ? (
                  <EbookPageCanvas
                    chapter={ensureChapterBlocks(activeChapter)}
                    onUpdateChapter={(updatedChapter) => {
                      // Sync content from blocks for backward compatibility
                      const htmlContent = (updatedChapter.blocks || [])
                        .filter(b => b.type !== 'divider' && b.type !== 'spacer')
                        .map(b => b.content)
                        .join('\n');
                      saveChapters(ebook.chapters.map(c =>
                        c.id === activeChapter.id
                          ? { ...updatedChapter, content: htmlContent }
                          : c
                      ));
                    }}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    globalStyles={(ebook as any).global_styles}
                  />
                ) : (
                  <div
                    className="px-6 py-6 bg-card rounded-lg shadow mx-4 mb-6"
                    style={{
                      fontFamily: (ebook as any).global_styles?.bodyFont ? String((ebook as any).global_styles.bodyFont) : undefined,
                      ...(() => {
                        const gs = (ebook as any).global_styles;
                        if (!gs) return {};
                        const vars: Record<string, string> = {};
                        if (gs.primaryColor) vars['--ebook-primary'] = gs.primaryColor;
                        if (gs.accentColor) vars['--ebook-accent'] = gs.accentColor;
                        if (gs.backgroundColor) vars['--ebook-bg'] = gs.backgroundColor;
                        if (gs.headingFont) vars['--ebook-heading-font'] = gs.headingFont;
                        if (gs.bodyFont) vars['--ebook-body-font'] = gs.bodyFont;
                        return vars;
                      })(),
                    } as React.CSSProperties}
                  >
                    <EbookRichEditor
                      ref={richEditorRef}
                      value={activeChapter.content || ""}
                      onChange={(val) => updateChapter(activeChapter.id, "content", val)}
                      placeholder="Escreva o conteúdo deste capítulo. Use a barra lateral para inserir blocos."
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center max-w-xs">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
                    <BookOpen className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {ebook.chapters.length > 0
                      ? "Selecione um capítulo para editar"
                      : "Crie o primeiro capítulo"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ebook.chapters.length > 0
                      ? "Clique num capítulo na barra lateral esquerda"
                      : "Comece a construir o seu eBook adicionando conteúdo"}
                  </p>
                  {ebook.chapters.length === 0 && (
                    <Button size="sm" className="mt-4 gap-1.5" onClick={addChapter}>
                      <Plus className="h-3.5 w-3.5" /> Criar primeiro capítulo
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT SIDEBAR: Tabbed panel (280px) ── */}
        <Tabs defaultValue={selectedBlockId ? "props" : "inserir"} className="w-[280px] shrink-0 flex flex-col border-l border-border/40 bg-muted/20">
          <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent h-10 p-0 shrink-0">
            {selectedBlockId && useVisualEditor && (
              <TabsTrigger value="props" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-primary font-medium">
                Propriedades
              </TabsTrigger>
            )}
            <TabsTrigger value="inserir" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full">
              Inserir
            </TabsTrigger>
            <TabsTrigger value="estilo" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full">
              Estilo
            </TabsTrigger>
            <TabsTrigger value="marca" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full">
              Marca
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full relative">
              Notas
              {notes.length > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] leading-none">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Propriedades (block properties) */}
          {selectedBlockId && useVisualEditor && activeChapter && (() => {
            const ch = ensureChapterBlocks(activeChapter);
            const selectedBlock = (ch.blocks || []).find(b => b.id === selectedBlockId);
            if (!selectedBlock) return null;
            return (
              <TabsContent value="props" className="flex-1 overflow-hidden mt-0">
                <BlockPropertiesPanel
                  block={selectedBlock}
                  onUpdate={(updatedBlock) => {
                    const newBlocks = (ch.blocks || []).map(b => b.id === updatedBlock.id ? updatedBlock : b);
                    const htmlContent = newBlocks
                      .filter(b => b.type !== 'divider' && b.type !== 'spacer')
                      .map(b => b.content)
                      .join('\n');
                    saveChapters(ebook.chapters.map(c =>
                      c.id === activeChapter.id
                        ? { ...c, blocks: newBlocks, content: htmlContent }
                        : c
                    ));
                  }}
                />
              </TabsContent>
            );
          })()}

          {/* Tab: Inserir (blocks) */}
          <TabsContent value="inserir" className="flex-1 overflow-hidden mt-0">
            <EbookBlockToolbar
              onInsertBlock={insertBlock}
              onUploadImage={handleInlineImageUpload}
              onGenerateImageAI={handleGenerateInlineImageAI}
            />
          </TabsContent>

          {/* Tab: Estilo (theme + typography) */}
          <TabsContent value="estilo" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-4">
                {/* Theme selector */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Aparência</h4>
                  <EbookThemeSelector
                    value={(ebook as any).theme || "modern-dark"}
                    onChange={(theme) => updateEbook.mutate({ id: ebookId, theme } as any)}
                  />
                </div>

                {/* Typography */}
                <div className="border-t border-border/30 pt-3 space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Tipografia
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Títulos</label>
                      <Select
                        value={(ebook as any).global_styles?.headingFont || "Georgia, serif"}
                        onValueChange={(val) => {
                          const gs = { ...((ebook as any).global_styles || {}), headingFont: val };
                          updateEbook.mutate({ id: ebookId, global_styles: gs } as any);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Georgia, serif">Georgia</SelectItem>
                          <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                          <SelectItem value="'Lora', serif">Lora</SelectItem>
                          <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                          <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                          <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                          <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Corpo</label>
                      <Select
                        value={(ebook as any).global_styles?.bodyFont || "Georgia, serif"}
                        onValueChange={(val) => {
                          const gs = { ...((ebook as any).global_styles || {}), bodyFont: val };
                          updateEbook.mutate({ id: ebookId, global_styles: gs } as any);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Georgia, serif">Georgia</SelectItem>
                          <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                          <SelectItem value="'Lora', serif">Lora</SelectItem>
                          <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                          <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                          <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Marca (branding) */}
          <TabsContent value="marca" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-4">
                {/* Header / Footer */}
                <div>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-muted-foreground" /> Cabeçalho / Rodapé
                  </span>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Texto do cabeçalho"
                      value={localHeaderText}
                      onChange={(e) => setLocalHeaderText(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Texto do rodapé"
                      value={localFooterText}
                      onChange={(e) => setLocalFooterText(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Contact page */}
                <div className="border-t border-border/30 pt-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> Página de Contactos
                  </span>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Slogan"
                      value={localContactPage.slogan || ""}
                      onChange={(e) => setLocalContactPage(prev => ({ ...prev, slogan: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1.5 items-center">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Email"
                        value={localContactPage.email || ""}
                        onChange={(e) => setLocalContactPage(prev => ({ ...prev, email: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Telefone"
                        value={localContactPage.phone || ""}
                        onChange={(e) => setLocalContactPage(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Website"
                        value={localContactPage.website || ""}
                        onChange={(e) => setLocalContactPage(prev => ({ ...prev, website: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Protection toggle */}
                <div className="border-t border-border/30 pt-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Proteção de Documento
                  </span>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(ebook as any).protection_enabled !== false}
                      onChange={(e) => {
                        updateEbook.mutate({ id: ebookId, ...(({ protection_enabled: e.target.checked }) as any) });
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-xs text-muted-foreground">
                      Ativar proteção anti-cópia e marca d'água na página pública
                    </span>
                  </label>
                </div>

                {/* Lead Gate toggle */}
                <div className="border-t border-border/30 pt-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" /> Captura de Leads
                  </span>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(ebook as any).lead_gate_enabled === true}
                      onChange={(e) => {
                        updateEbook.mutate({ id: ebookId, lead_gate_enabled: e.target.checked } as any);
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-xs text-muted-foreground">
                      Pedir nome e email antes de permitir leitura
                    </span>
                  </label>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5">
                    Os leitores identificados aparecem nas estatísticas do eBook
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Notas */}
          <TabsContent value="notas" className="flex-1 overflow-hidden mt-0">
            <EbookEditorNotesPanel
              notes={notes}
              isLoading={notesLoading}
              addNote={addNote}
              updateNote={updateNote}
              deleteNote={deleteNote}
              activeChapterIndex={ebook ? ebook.chapters.findIndex(c => c.id === activeChapterId) : 0}
              chapterNames={ebook ? ebook.chapters.map(c => c.title) : []}
              onNavigateToChapter={(idx) => {
                if (ebook && ebook.chapters[idx]) {
                  setActiveChapterId(ebook.chapters[idx].id);
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════ STATUS BAR (footer) ═══════════════ */}
      <div className="shrink-0 border-t border-border/40 bg-card/60 backdrop-blur px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{ebook.chapters.length} capítulo{ebook.chapters.length !== 1 ? "s" : ""}</span>
        <span className="text-border">·</span>
        <span>{totalWords.toLocaleString()} palavras</span>
        <span className="text-border">·</span>
        <span>{Math.round(progress)}% concluído</span>
        <span className="flex-1" />
        <span className="flex items-center gap-1 text-emerald-500/80">
          <CheckCircle2 className="h-3 w-3" /> Guardado
        </span>
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
            styleTokens={(ebook as any).global_styles || undefined}
            ebookId={ebookId}
            workspaceId={ebook.workspace_id}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
