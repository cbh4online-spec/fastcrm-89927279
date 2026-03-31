import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EbookBlockToolbar } from "../EbookBlockToolbar";
import { BlockPropertiesPanel } from "../BlockPropertiesPanel";
import { EbookEditorNotesPanel } from "../EbookEditorNotesPanel";
import { EbookBrandingPanel } from "./EbookBrandingPanel";
import { EbookThemePanel } from "./EbookThemePanel";
import { EbookCtaPanel } from "./EbookCtaPanel";
import type { EbookChapter, ContentBlock, EbookContactPage, Ebook } from "@/hooks/useEbooks";

interface EbookRightPanelProps {
  ebook: Ebook;
  activeChapter: EbookChapter | undefined;
  selectedBlockId: string | null;
  useVisualEditor: boolean;
  ensureChapterBlocks: (ch: EbookChapter) => EbookChapter;
  onSaveChapters: (chapters: EbookChapter[]) => void;
  onInsertBlock: (html: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  onGenerateImageAI: (prompt: string) => Promise<string | null>;
  // Branding
  localHeaderText: string;
  localFooterText: string;
  localContactPage: EbookContactPage;
  protectionEnabled: boolean;
  leadGateEnabled: boolean;
  onHeaderTextChange: (val: string) => void;
  onFooterTextChange: (val: string) => void;
  onContactPageChange: (val: EbookContactPage) => void;
  onProtectionChange: (val: boolean) => void;
  onLeadGateChange: (val: boolean) => void;
  // Consent
  consentRequired: boolean;
  consentText: string;
  privacyPolicyUrl: string;
  marketingOptInEnabled: boolean;
  marketingOptInLabel: string;
  onConsentRequiredChange: (val: boolean) => void;
  onConsentTextChange: (val: string) => void;
  onPrivacyPolicyUrlChange: (val: string) => void;
  onMarketingOptInEnabledChange: (val: boolean) => void;
  onMarketingOptInLabelChange: (val: string) => void;
  // SEO
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
  onSeoTitleChange: (val: string) => void;
  onSeoDescriptionChange: (val: string) => void;
  onOgImageUrlChange: (val: string) => void;
  onCanonicalUrlChange: (val: string) => void;
  onNoindexChange: (val: boolean) => void;
  // Theme
  theme: string;
  headingFont: string;
  bodyFont: string;
  onThemeChange: (theme: string) => void;
  onHeadingFontChange: (font: string) => void;
  onBodyFontChange: (font: string) => void;
  // Notes
  notes: any[];
  notesLoading: boolean;
  addNote: any;
  updateNote: any;
  deleteNote: any;
  activeChapterId: string | null;
  onNavigateToChapter: (idx: number) => void;
}

export function EbookRightPanel({
  ebook, activeChapter, selectedBlockId, useVisualEditor, ensureChapterBlocks,
  onSaveChapters, onInsertBlock, onUploadImage, onGenerateImageAI,
  localHeaderText, localFooterText, localContactPage, protectionEnabled, leadGateEnabled,
  onHeaderTextChange, onFooterTextChange, onContactPageChange, onProtectionChange, onLeadGateChange,
  consentText, privacyPolicyUrl, marketingOptInEnabled, marketingOptInLabel,
  onConsentTextChange, onPrivacyPolicyUrlChange, onMarketingOptInEnabledChange, onMarketingOptInLabelChange,
  seoTitle, seoDescription, ogImageUrl, canonicalUrl, noindex,
  onSeoTitleChange, onSeoDescriptionChange, onOgImageUrlChange, onCanonicalUrlChange, onNoindexChange,
  theme, headingFont, bodyFont, onThemeChange, onHeadingFontChange, onBodyFontChange,
  notes, notesLoading, addNote, updateNote, deleteNote, activeChapterId, onNavigateToChapter,
}: EbookRightPanelProps) {
  return (
    <Tabs defaultValue={selectedBlockId ? "props" : "inserir"} className="w-[280px] shrink-0 flex flex-col border-l border-border/40 bg-muted/20">
      <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent h-10 p-0 shrink-0">
        {selectedBlockId && useVisualEditor && (
          <TabsTrigger value="props" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-primary font-medium">
            Props
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
        <TabsTrigger value="ctas" className="flex-1 rounded-none text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full">
          CTAs
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

      {/* Tab: Propriedades */}
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
                onSaveChapters(ebook.chapters.map(c =>
                  c.id === activeChapter.id ? { ...c, blocks: newBlocks, content: htmlContent } : c
                ));
              }}
            />
          </TabsContent>
        );
      })()}

      {/* Tab: Inserir */}
      <TabsContent value="inserir" className="flex-1 overflow-hidden mt-0">
        <EbookBlockToolbar onInsertBlock={onInsertBlock} onUploadImage={onUploadImage} onGenerateImageAI={onGenerateImageAI} />
      </TabsContent>

      {/* Tab: Estilo */}
      <TabsContent value="estilo" className="flex-1 overflow-hidden mt-0">
        <EbookThemePanel
          theme={theme}
          headingFont={headingFont}
          bodyFont={bodyFont}
          onThemeChange={onThemeChange}
          onHeadingFontChange={onHeadingFontChange}
          onBodyFontChange={onBodyFontChange}
        />
      </TabsContent>

      {/* Tab: Marca */}
      <TabsContent value="marca" className="flex-1 overflow-hidden mt-0">
        <EbookBrandingPanel
          localHeaderText={localHeaderText}
          localFooterText={localFooterText}
          localContactPage={localContactPage}
          protectionEnabled={protectionEnabled}
          leadGateEnabled={leadGateEnabled}
          onHeaderTextChange={onHeaderTextChange}
          onFooterTextChange={onFooterTextChange}
          onContactPageChange={onContactPageChange}
          onProtectionChange={onProtectionChange}
          onLeadGateChange={onLeadGateChange}
          consentText={consentText}
          privacyPolicyUrl={privacyPolicyUrl}
          marketingOptInEnabled={marketingOptInEnabled}
          marketingOptInLabel={marketingOptInLabel}
          onConsentTextChange={onConsentTextChange}
          onPrivacyPolicyUrlChange={onPrivacyPolicyUrlChange}
          onMarketingOptInEnabledChange={onMarketingOptInEnabledChange}
          onMarketingOptInLabelChange={onMarketingOptInLabelChange}
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          ogImageUrl={ogImageUrl}
          canonicalUrl={canonicalUrl}
          noindex={noindex}
          onSeoTitleChange={onSeoTitleChange}
          onSeoDescriptionChange={onSeoDescriptionChange}
          onOgImageUrlChange={onOgImageUrlChange}
          onCanonicalUrlChange={onCanonicalUrlChange}
          onNoindexChange={onNoindexChange}
        />
      </TabsContent>

      {/* Tab: CTAs */}
      <TabsContent value="ctas" className="flex-1 overflow-hidden mt-0">
        <EbookCtaPanel
          ebookId={ebook.id}
          workspaceId={ebook.workspace_id}
          chapters={ebook.chapters.map(c => ({ id: c.id, title: c.title }))}
        />
      </TabsContent>

      {/* Tab: Notas */}
      <TabsContent value="notas" className="flex-1 overflow-hidden mt-0">
        <EbookEditorNotesPanel
          notes={notes}
          isLoading={notesLoading}
          addNote={addNote}
          updateNote={updateNote}
          deleteNote={deleteNote}
          activeChapterIndex={ebook.chapters.findIndex(c => c.id === activeChapterId)}
          chapterNames={ebook.chapters.map(c => c.title)}
          onNavigateToChapter={onNavigateToChapter}
        />
      </TabsContent>
    </Tabs>
  );
}
