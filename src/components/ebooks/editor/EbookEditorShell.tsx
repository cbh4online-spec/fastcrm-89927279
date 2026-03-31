import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { useEbook, useUpdateEbook, EbookChapter, EbookContactPage, ContentBlock } from "@/hooks/useEbooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import type { EbookRichEditorHandle } from "../EbookRichEditor";
import { useEbookNotes } from "@/hooks/useEbookNotes";
import { useEbookPersistence } from "@/hooks/useEbookPersistence";
import { useEbookCtas } from "@/hooks/useEbookCtas";
import { runPreflight } from "@/utils/ebookPreflight";

import { EbookEditorHeader } from "./EbookEditorHeader";
import { EbookChapterSidebar } from "./EbookChapterSidebar";
import { EbookCanvasEditor } from "./EbookCanvasEditor";
import { EbookRightPanel } from "./EbookRightPanel";
import { EbookStatusBar } from "./EbookStatusBar";
import { EbookPreviewDialog } from "./EbookPreviewDialog";
import { EbookPreflightDialog } from "./EbookPreflightDialog";

interface EbookEditorShellProps {
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

export function EbookEditorShell({ ebookId, onBack }: EbookEditorShellProps) {
  const { data: ebook, isLoading } = useEbook(ebookId);
  const updateEbook = useUpdateEbook();
  const { canAfford, getCost, consumeCredits } = useCreditWallet();
  const { notes, isLoading: notesLoading, addNote, updateNote, deleteNote } = useEbookNotes(ebookId, ebook?.workspace_id);

  // Centralised persistence
  const {
    isDirty, saveStatus, lastSavedAt,
    queueSave, forceSave, retrySave,
  } = useEbookPersistence({ ebookId });

  // Core state
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingChapterImg, setUploadingChapterImg] = useState(false);
  const [generatingCoverAI, setGeneratingCoverAI] = useState(false);
  const [generatingChapterImgAI, setGeneratingChapterImgAI] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [useVisualEditor, setUseVisualEditor] = useState(true);

  // Drag state
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  // Branding local state
  const [localHeaderText, setLocalHeaderText] = useState("");
  const [localFooterText, setLocalFooterText] = useState("");
  const [localContactPage, setLocalContactPage] = useState<EbookContactPage>({});
  // Consent local state
  const [localConsentText, setLocalConsentText] = useState("");
  const [localPrivacyPolicyUrl, setLocalPrivacyPolicyUrl] = useState("");
  const [localMarketingOptInEnabled, setLocalMarketingOptInEnabled] = useState(false);
  const [localMarketingOptInLabel, setLocalMarketingOptInLabel] = useState("");
  // SEO local state
  const [localSeoTitle, setLocalSeoTitle] = useState("");
  const [localSeoDescription, setLocalSeoDescription] = useState("");
  const [localOgImageUrl, setLocalOgImageUrl] = useState("");
  const [localCanonicalUrl, setLocalCanonicalUrl] = useState("");
  const [localNoindex, setLocalNoindex] = useState(false);
  // Preflight
  const [showPreflight, setShowPreflight] = useState(false);
  const brandingInitRef = useRef(false);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const chapterImgRef = useRef<HTMLInputElement>(null);
  const richEditorRef = useRef<EbookRichEditorHandle>(null);

  // Sync branding from server
  useEffect(() => {
    if (ebook && !brandingInitRef.current) {
      setLocalHeaderText((ebook as any).header_text || "");
      setLocalFooterText((ebook as any).footer_text || "");
      setLocalContactPage((ebook as any).contact_page || {});
      brandingInitRef.current = true;
    }
  }, [ebook]);

  // Load Google Fonts
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

  // Debounced branding save — via centralised persistence
  useEffect(() => {
    if (!brandingInitRef.current) return;
    queueSave({ header_text: localHeaderText, footer_text: localFooterText, contact_page: localContactPage });
  }, [localHeaderText, localFooterText, localContactPage]);

  // ── Chapter operations — all go through queueSave ──
  const saveChapters = useCallback((chapters: EbookChapter[]) => {
    queueSave({ chapters });
  }, [queueSave]);

  const migrateContentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content || content.trim() === '') return [];
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const blocks: ContentBlock[] = [];
    temp.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) blocks.push({ id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'paragraph', content: `<p>${text}</p>`, styles: { paddingTop: '4px', paddingBottom: '4px' } });
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
      blocks.push({ id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, content: type === 'image' ? (el.getAttribute('src') || '') : el.outerHTML, styles: defaultStyles });
    });
    return blocks.length > 0 ? blocks : [{ id: `blk-${Date.now()}`, type: 'paragraph', content, styles: { paddingTop: '4px', paddingBottom: '4px' } }];
  }, []);

  const ensureChapterBlocks = useCallback((chapter: EbookChapter): EbookChapter => {
    if (chapter.blocks && chapter.blocks.length > 0) return chapter;
    if (!chapter.content || chapter.content.trim() === '') return { ...chapter, blocks: [] };
    return { ...chapter, blocks: migrateContentToBlocks(chapter.content) };
  }, [migrateContentToBlocks]);

  const addChapter = () => {
    if (!ebook) return;
    const newChapter: EbookChapter = { id: `ch-${Date.now()}`, title: `Capítulo ${ebook.chapters.length + 1}`, content: "", blocks: [], layout: 'single' };
    saveChapters([...ebook.chapters, newChapter]);
    setActiveChapterId(newChapter.id);
  };

  const removeChapter = (chapterId: string) => {
    if (!ebook) return;
    saveChapters(ebook.chapters.filter(c => c.id !== chapterId));
    if (activeChapterId === chapterId) setActiveChapterId(null);
  };

  const updateChapter = (chapterId: string, field: keyof EbookChapter, value: string) => {
    if (!ebook) return;
    saveChapters(ebook.chapters.map(c => c.id === chapterId ? { ...c, [field]: value } : c));
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
    setDragSourceIndex(null); setDragOverIndex(null);
  };

  // Insert & image handlers
  const insertBlock = (html: string) => { richEditorRef.current?.insertBlock(html); };
  const handleInlineImageUpload = async (file: File): Promise<string | null> => uploadEbookImage(file, `inline/${ebookId}`);
  const handleGenerateInlineImageAI = async (prompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "generate_image", imagePrompt: prompt, ebookId, target: `inline-${Date.now()}` } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      return data?.url || null;
    } catch (e: any) { toast.error("Erro ao gerar imagem: " + e.message); return null; }
  };

  // Cover & chapter image handlers
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ebook) return;
    setUploadingCover(true);
    const url = await uploadEbookImage(file, `covers/${ebookId}`);
    if (url) { updateEbook.mutate({ id: ebookId, cover_url: url }); toast.success("Capa atualizada!"); }
    setUploadingCover(false);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleChapterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ebook || !activeChapterId) return;
    setUploadingChapterImg(true);
    const url = await uploadEbookImage(file, `chapters/${ebookId}`);
    if (url) { saveChapters(ebook.chapters.map(c => c.id === activeChapterId ? { ...c, cover_image: url } : c)); toast.success("Imagem do capítulo atualizada!"); }
    setUploadingChapterImg(false);
    if (chapterImgRef.current) chapterImgRef.current.value = "";
  };

  // AI actions
  const generateCoverAI = async () => {
    if (!ebook) return;
    if (!canAfford("ebook_generate_cover")) { triggerNoCreditsDialog({ actionLabel: "Gerar Capa IA", creditsNeeded: getCost("ebook_generate_cover") }); return; }
    setGeneratingCoverAI(true);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_cover", referenceType: "ebook", referenceId: ebookId });
      const prompt = `Create a professional, modern eBook cover image for a book titled "${ebook.title}"${ebook.subtitle ? ` with subtitle "${ebook.subtitle}"` : ""}. The image should be visually striking, suitable for a digital book cover, with abstract or thematic elements. Do NOT include any text in the image. High quality, editorial style.`;
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "generate_image", imagePrompt: prompt, ebookId, target: "cover" } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) { updateEbook.mutate({ id: ebookId, cover_url: data.url }); toast.success("Capa gerada com IA!"); }
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGeneratingCoverAI(false); }
  };

  const generateChapterImageAI = async () => {
    if (!ebook || !activeChapterId) return;
    const ch = ebook.chapters.find(c => c.id === activeChapterId);
    if (!ch) return;
    if (!canAfford("ebook_generate_chapter_image")) { triggerNoCreditsDialog({ actionLabel: "Imagem Capítulo IA", creditsNeeded: getCost("ebook_generate_chapter_image") }); return; }
    setGeneratingChapterImgAI(true);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_chapter_image", referenceType: "ebook", referenceId: ebookId });
      const prompt = `Create a professional, atmospheric illustration for an eBook chapter titled "${ch.title}" from the book "${ebook.title}". The image should be evocative, editorial quality, suitable as a chapter header. Abstract or thematic, no text in the image. Wide format, cinematic.`;
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "generate_image", imagePrompt: prompt, ebookId, target: `chapter-${activeChapterId}` } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) { saveChapters(ebook.chapters.map(c => c.id === activeChapterId ? { ...c, cover_image: data.url } : c)); toast.success("Imagem do capítulo gerada com IA!"); }
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGeneratingChapterImgAI(false); }
  };

  const generateChapterContent = async (chapter: EbookChapter) => {
    if (!ebook) return;
    if (!canAfford("ebook_generate_chapter")) { triggerNoCreditsDialog({ actionLabel: "Gerar Capítulo IA", creditsNeeded: getCost("ebook_generate_chapter") }); return; }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_generate_chapter", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "generate_chapter", title: ebook.title, chapterTitle: chapter.title, chapterContext: chapter.description || "", tone: "Professional" } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || "");
      toast.success("Capítulo gerado com sucesso!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const improveContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_improve_content")) { triggerNoCreditsDialog({ actionLabel: "Melhorar Conteúdo IA", creditsNeeded: getCost("ebook_improve_content") }); return; }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_improve_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "improve_content", chapterContext: chapter.content } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo melhorado!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const condenseContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_condense_content")) { triggerNoCreditsDialog({ actionLabel: "Condensar Conteúdo", creditsNeeded: getCost("ebook_condense_content") }); return; }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_condense_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "condense_content", chapterContext: chapter.content } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo condensado!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const expandContent = async (chapter: EbookChapter) => {
    if (!chapter.content) return;
    if (!canAfford("ebook_expand_content")) { triggerNoCreditsDialog({ actionLabel: "Expandir Conteúdo", creditsNeeded: getCost("ebook_expand_content") }); return; }
    setGenerating(chapter.id);
    try {
      await consumeCredits.mutateAsync({ actionKey: "ebook_expand_content", referenceType: "ebook", referenceId: ebookId });
      const { data, error } = await supabase.functions.invoke("ebook-ai-assist", { body: { action: "expand_content", chapterContext: chapter.content } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      updateChapter(chapter.id, "content", data?.content || chapter.content);
      toast.success("Conteúdo expandido!");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setGenerating(null); }
  };

  const publishEbook = () => {
    if (!ebook) return;
    // Force save before publishing
    forceSave();
    updateEbook.mutate({ id: ebookId, status: "published" }, { onSuccess: () => toast.success("eBook publicado!") });
  };

  const handleToggleEditorMode = () => {
    if (!useVisualEditor && activeChapter) {
      const migrated = ensureChapterBlocks(activeChapter);
      if (migrated !== activeChapter && ebook) {
        saveChapters(ebook.chapters.map(c => c.id === activeChapter.id ? migrated : c));
      }
    }
    setUseVisualEditor(!useVisualEditor);
    setSelectedBlockId(null);
  };

  // ── Loading state ──
  if (isLoading || !ebook) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeChapter = ebook.chapters.find(c => c.id === activeChapterId);
  const totalWords = ebook.chapters.reduce((sum, ch) => sum + (ch.content?.split(/\s+/).filter(Boolean).length || 0), 0);
  const filledChapters = ebook.chapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
  const progress = ebook.chapters.length > 0 ? (filledChapters / ebook.chapters.length) * 100 : 0;

  return (
    <div className="space-y-0 h-[calc(100vh-80px)] flex flex-col">
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={chapterImgRef} type="file" accept="image/*" className="hidden" onChange={handleChapterImageUpload} />

      <EbookEditorHeader
        ebook={ebook}
        onBack={() => { if (isDirty) forceSave(); onBack(); }}
        onUpdateTitle={(title) => queueSave({ title } as any)}
        onGenerateCoverAI={generateCoverAI}
        onUploadCover={() => coverInputRef.current?.click()}
        onPreview={() => setShowPresentation(true)}
        onPublish={publishEbook}
        generatingCoverAI={generatingCoverAI}
        uploadingCover={uploadingCover}
        getCost={getCost}
      />

      <div className="flex-1 flex overflow-hidden">
        <EbookChapterSidebar
          chapters={ebook.chapters}
          activeChapterId={activeChapterId}
          onSelectChapter={setActiveChapterId}
          onAddChapter={addChapter}
          onDuplicateChapter={duplicateChapter}
          onDeleteChapter={removeChapter}
          onMoveChapter={moveChapter}
          dragOverIndex={dragOverIndex}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragEnd}
        />

        <EbookCanvasEditor
          ebook={ebook}
          activeChapter={activeChapter}
          useVisualEditor={useVisualEditor}
          onToggleEditorMode={handleToggleEditorMode}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onUpdateChapterTitle={(id, title) => updateChapter(id, "title", title)}
          onUpdateChapterContent={(id, content) => updateChapter(id, "content", content)}
          onSaveChapters={saveChapters}
          ensureChapterBlocks={ensureChapterBlocks}
          onGenerateChapterImageAI={generateChapterImageAI}
          onUploadChapterImage={() => chapterImgRef.current?.click()}
          onGenerateChapterContent={generateChapterContent}
          onImproveContent={improveContent}
          onCondenseContent={condenseContent}
          onExpandContent={expandContent}
          onDuplicateChapter={duplicateChapter}
          onDeleteChapter={removeChapter}
          onMoveChapter={moveChapter}
          onAddChapter={addChapter}
          generating={generating}
          generatingChapterImgAI={generatingChapterImgAI}
          uploadingChapterImg={uploadingChapterImg}
          getCost={getCost}
          richEditorRef={richEditorRef as React.RefObject<EbookRichEditorHandle>}
        />

        <EbookRightPanel
          ebook={ebook}
          activeChapter={activeChapter}
          selectedBlockId={selectedBlockId}
          useVisualEditor={useVisualEditor}
          ensureChapterBlocks={ensureChapterBlocks}
          onSaveChapters={saveChapters}
          onInsertBlock={insertBlock}
          onUploadImage={handleInlineImageUpload}
          onGenerateImageAI={handleGenerateInlineImageAI}
          localHeaderText={localHeaderText}
          localFooterText={localFooterText}
          localContactPage={localContactPage}
          protectionEnabled={(ebook as any).protection_enabled !== false}
          leadGateEnabled={(ebook as any).lead_gate_enabled === true}
          onHeaderTextChange={setLocalHeaderText}
          onFooterTextChange={setLocalFooterText}
          onContactPageChange={setLocalContactPage}
          onProtectionChange={(val) => queueSave({ protection_enabled: val })}
          onLeadGateChange={(val) => queueSave({ lead_gate_enabled: val })}
          theme={(ebook as any).theme || "modern-dark"}
          headingFont={(ebook as any).global_styles?.headingFont || "Georgia, serif"}
          bodyFont={(ebook as any).global_styles?.bodyFont || "Georgia, serif"}
          onThemeChange={(theme) => queueSave({ theme })}
          onHeadingFontChange={(val) => { const gs = { ...((ebook as any).global_styles || {}), headingFont: val }; queueSave({ global_styles: gs }); }}
          onBodyFontChange={(val) => { const gs = { ...((ebook as any).global_styles || {}), bodyFont: val }; queueSave({ global_styles: gs }); }}
          notes={notes}
          notesLoading={notesLoading}
          addNote={addNote}
          updateNote={updateNote}
          deleteNote={deleteNote}
          activeChapterId={activeChapterId}
          onNavigateToChapter={(idx) => { if (ebook.chapters[idx]) setActiveChapterId(ebook.chapters[idx].id); }}
        />
      </div>

      <EbookStatusBar
        chaptersCount={ebook.chapters.length}
        totalWords={totalWords}
        progress={progress}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        isDirty={isDirty}
        onRetry={retrySave}
      />

      <EbookPreviewDialog
        open={showPresentation}
        onOpenChange={setShowPresentation}
        ebook={ebook}
        headerText={localHeaderText || undefined}
        footerText={localFooterText || undefined}
        contactPage={localContactPage}
      />
    </div>
  );
}
