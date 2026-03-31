import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, Upload, Wand2, Coins, Minimize2, Maximize2,
  Undo2, Redo2, LayoutGrid, ChevronDown, BookOpen, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EbookRichEditor, type EbookRichEditorHandle } from "../EbookRichEditor";
import { EbookPageCanvas } from "../EbookPageCanvas";
import { BlockActionMenu } from "../BlockActionMenu";
import type { EbookChapter, ContentBlock, Ebook } from "@/hooks/useEbooks";

interface EbookCanvasEditorProps {
  ebook: Ebook;
  activeChapter: EbookChapter | undefined;
  useVisualEditor: boolean;
  onToggleEditorMode: () => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateChapterTitle: (chapterId: string, title: string) => void;
  onUpdateChapterContent: (chapterId: string, content: string) => void;
  onSaveChapters: (chapters: EbookChapter[]) => void;
  ensureChapterBlocks: (ch: EbookChapter) => EbookChapter;
  onGenerateChapterImageAI: () => void;
  onUploadChapterImage: () => void;
  onGenerateChapterContent: (ch: EbookChapter) => void;
  onImproveContent: (ch: EbookChapter) => void;
  onCondenseContent: (ch: EbookChapter) => void;
  onExpandContent: (ch: EbookChapter) => void;
  onDuplicateChapter: (id: string) => void;
  onDeleteChapter: (id: string) => void;
  onMoveChapter: (id: string, dir: 'up' | 'down') => void;
  onAddChapter: () => void;
  generating: string | null;
  generatingChapterImgAI: boolean;
  uploadingChapterImg: boolean;
  getCost: (key: string) => number;
  richEditorRef: React.RefObject<EbookRichEditorHandle>;
}

export function EbookCanvasEditor({
  ebook, activeChapter, useVisualEditor, onToggleEditorMode,
  selectedBlockId, onSelectBlock,
  onUpdateChapterTitle, onUpdateChapterContent, onSaveChapters, ensureChapterBlocks,
  onGenerateChapterImageAI, onUploadChapterImage,
  onGenerateChapterContent, onImproveContent, onCondenseContent, onExpandContent,
  onDuplicateChapter, onDeleteChapter, onMoveChapter, onAddChapter,
  generating, generatingChapterImgAI, uploadingChapterImg, getCost, richEditorRef,
}: EbookCanvasEditorProps) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background">
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
                  onChange={(e) => onUpdateChapterTitle(activeChapter.id, e.target.value)}
                  className="font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto text-base bg-transparent"
                  placeholder="Título do capítulo"
                />
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap items-center">
                <Button
                  variant={useVisualEditor ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] gap-1 px-2"
                  onClick={onToggleEditorMode}
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
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onGenerateChapterImageAI} disabled={generatingChapterImgAI}>
                  {generatingChapterImgAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Img IA
                  <span className="text-[10px] opacity-70 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_chapter_image")}</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onUploadChapterImage} disabled={uploadingChapterImg}>
                  {uploadingChapterImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                </Button>
                <div className="w-px h-5 bg-border my-auto mx-0.5" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-primary" disabled={generating === activeChapter.id}>
                      {generating === activeChapter.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      IA
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem onClick={() => onGenerateChapterContent(activeChapter)}>
                      <Sparkles className="h-3.5 w-3.5 mr-2" /> Gerar conteúdo
                      <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_chapter")}</span>
                    </DropdownMenuItem>
                    {activeChapter.content && (
                      <>
                        <DropdownMenuItem onClick={() => onImproveContent(activeChapter)}>
                          <Wand2 className="h-3.5 w-3.5 mr-2" /> Melhorar
                          <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_improve_content")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCondenseContent(activeChapter)}>
                          <Minimize2 className="h-3.5 w-3.5 mr-2" /> Condensar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExpandContent(activeChapter)}>
                          <Maximize2 className="h-3.5 w-3.5 mr-2" /> Expandir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="group">
                  <BlockActionMenu
                    onDuplicate={() => onDuplicateChapter(activeChapter.id)}
                    onDelete={() => onDeleteChapter(activeChapter.id)}
                    onMoveUp={() => onMoveChapter(activeChapter.id, 'up')}
                    onMoveDown={() => onMoveChapter(activeChapter.id, 'down')}
                    onAIRewrite={activeChapter.content ? () => onImproveContent(activeChapter) : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Editor area */}
            {useVisualEditor ? (
              <EbookPageCanvas
                chapter={ensureChapterBlocks(activeChapter)}
                onUpdateChapter={(updatedChapter) => {
                  const htmlContent = (updatedChapter.blocks || [])
                    .filter(b => b.type !== 'divider' && b.type !== 'spacer')
                    .map(b => b.content)
                    .join('\n');
                  onSaveChapters(ebook.chapters.map(c =>
                    c.id === activeChapter.id
                      ? { ...updatedChapter, content: htmlContent }
                      : c
                  ));
                }}
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
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
                  onChange={(val) => onUpdateChapterContent(activeChapter.id, val)}
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
                {ebook.chapters.length > 0 ? "Selecione um capítulo para editar" : "Crie o primeiro capítulo"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {ebook.chapters.length > 0 ? "Clique num capítulo na barra lateral esquerda" : "Comece a construir o seu eBook adicionando conteúdo"}
              </p>
              {ebook.chapters.length === 0 && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={onAddChapter}>
                  <Plus className="h-3.5 w-3.5" /> Criar primeiro capítulo
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
