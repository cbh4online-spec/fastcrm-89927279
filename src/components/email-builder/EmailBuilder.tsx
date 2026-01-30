import { useState, useCallback } from 'react';
import { 
  LayoutGrid, 
  Palette, 
  Eye, 
  Save, 
  X, 
  Monitor,
  Tablet,
  Smartphone,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useEmailBuilder } from '@/hooks/useEmailBuilder';
import { renderEmailToHtml, renderEmailPreview } from '@/utils/emailRenderer';
import { ElementsSidebar } from './ElementsSidebar';
import { LayoutsSidebar } from './LayoutsSidebar';
import { DesignSidebar } from './DesignSidebar';
import { BlockEditor } from './BlockEditor';
import { EmailCanvas } from './EmailCanvas';
import { VariablePicker } from './VariablePicker';
import { ImageUploader } from './ImageUploader';
import { EmailEditorProvider, useEmailEditorContext } from '@/contexts/EmailEditorContext';
import type { EmailDesign, EmailLayout, EmailBlockType, ImageBlockContent } from '@/types/emailBuilder';

interface EmailBuilderProps {
  initialDesign?: EmailDesign;
  onSave: (design: EmailDesign, html: string) => void;
  onCancel: () => void;
}

type SidebarTab = 'elements' | 'layouts';
type PreviewMode = 'desktop' | 'tablet' | 'mobile';

function EmailBuilderContent({ initialDesign, onSave, onCancel }: EmailBuilderProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('elements');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [imageUploaderBlockId, setImageUploaderBlockId] = useState<string | null>(null);

  const {
    design,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    draggedBlockType,
    setDraggedBlockType,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlocks,
    duplicateBlock,
    updateGlobalStyles,
    loadLayout,
  } = useEmailBuilder({ initialDesign });

  const handleSave = () => {
    const html = renderEmailToHtml(design);
    onSave(design, html);
  };

  const handleSelectLayout = (layout: EmailLayout) => {
    loadLayout(layout.blocks, layout.globalStyles);
    setSidebarTab('elements');
  };

  const handleDragStart = (type: EmailBlockType) => {
    setDraggedBlockType(type);
  };

  const handleDragEnd = () => {
    setDraggedBlockType(null);
  };

  const handleElementClick = (type: EmailBlockType) => {
    addBlock(type);
  };

  const handleDropNewBlock = (type: EmailBlockType, index: number) => {
    addBlock(type, index);
    setDraggedBlockType(null);
  };

  const handleOpenImageUploader = (blockId: string) => {
    setImageUploaderBlockId(blockId);
  };

  const handleImageSelect = (url: string, alt?: string) => {
    if (imageUploaderBlockId) {
      const block = design.blocks.find(b => b.id === imageUploaderBlockId);
      if (block && (block.type === 'image' || block.type === 'logo')) {
        updateBlock(imageUploaderBlockId, {
          content: { ...block.content, src: url, alt: alt || 'Imagem' } as ImageBlockContent,
        });
      }
    }
    setImageUploaderBlockId(null);
  };

  const handleInsertVariable = useCallback((variable: string) => {
    // This is now handled by the EmailEditorContext
    // The VariablePicker will call context.insertVariable directly
    console.log('Insert variable via context:', variable);
  }, []);

  const previewWidths: Record<PreviewMode, number> = {
    desktop: 600,
    tablet: 480,
    mobile: 320,
  };

  const blockIndex = selectedBlock 
    ? design.blocks.findIndex(b => b.id === selectedBlock.id)
    : -1;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm">Editor de Email</h2>
            <p className="text-xs text-muted-foreground">
              {design.blocks.length} blocos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Preview mode toggle */}
          <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/50">
            <Button
              variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="w-px h-6 bg-border" />
          
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowHtml(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            HTML
          </Button>
          
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowPreview(true)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
          
          <Button size="sm" className="h-8" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Guardar
          </Button>
        </div>
      </div>
      
      {/* Main content - 3 column layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar - Elements & Layouts */}
        <div className="w-64 shrink-0 border-r bg-background flex flex-col min-h-0">
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as SidebarTab)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-10 bg-transparent">
              <TabsTrigger value="elements" className="gap-1.5 text-xs data-[state=active]:bg-muted rounded-none">
                <LayoutGrid className="h-3.5 w-3.5" />
                Elementos
              </TabsTrigger>
              <TabsTrigger value="layouts" className="gap-1.5 text-xs data-[state=active]:bg-muted rounded-none">
                <LayoutGrid className="h-3.5 w-3.5" />
                Templates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="elements" className="flex-1 m-0 overflow-hidden">
              <ElementsSidebar
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onElementClick={handleElementClick}
              />
            </TabsContent>
            
            <TabsContent value="layouts" className="flex-1 m-0 overflow-hidden">
              <LayoutsSidebar onSelectLayout={handleSelectLayout} />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Canvas - Center */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <EmailCanvas
            blocks={design.blocks}
            globalStyles={{
              ...design.globalStyles,
              contentWidth: previewWidths[previewMode],
            }}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onDeleteBlock={deleteBlock}
            onDuplicateBlock={duplicateBlock}
            onMoveBlock={moveBlock}
            onReorderBlocks={reorderBlocks}
            draggedBlockType={draggedBlockType}
            onDropNewBlock={handleDropNewBlock}
            onUpdateBlock={updateBlock}
            onOpenImageUploader={handleOpenImageUploader}
          />
          
          {/* Variable picker bar */}
          <VariablePicker onInsert={handleInsertVariable} variant="bar" />
        </div>
        
        {/* Right sidebar - Always visible: Design or Block Editor */}
        <div className="w-80 shrink-0 border-l bg-background flex flex-col min-h-0">
          {selectedBlock ? (
            <BlockEditor
              block={selectedBlock}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onDuplicate={() => duplicateBlock(selectedBlock.id)}
              onMoveUp={() => moveBlock(selectedBlock.id, 'up')}
              onMoveDown={() => moveBlock(selectedBlock.id, 'down')}
              onClose={() => setSelectedBlockId(null)}
              canMoveUp={blockIndex > 0}
              canMoveDown={blockIndex < design.blocks.length - 1}
              onOpenImageUploader={() => handleOpenImageUploader(selectedBlock.id)}
            />
          ) : (
            <DesignSidebar
              globalStyles={design.globalStyles}
              onUpdateStyles={updateGlobalStyles}
            />
          )}
        </div>
      </div>
      
      {/* Image Uploader Modal */}
      <ImageUploader
        open={imageUploaderBlockId !== null}
        onOpenChange={(open) => !open && setImageUploaderBlockId(null)}
        onImageSelect={handleImageSelect}
      />
      
      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
            <DialogDescription>
              Pré-visualização com dados de exemplo
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
            <div 
              className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
              style={{ maxWidth: design.globalStyles.contentWidth }}
            >
              <iframe
                srcDoc={renderEmailPreview(design)}
                className="w-full min-h-[500px] border-0"
                title="Email Preview"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* HTML Modal */}
      <Dialog open={showHtml} onOpenChange={setShowHtml}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Código HTML</DialogTitle>
            <DialogDescription>
              HTML gerado do email
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-[500px]">
              <code>{renderEmailToHtml(design)}</code>
            </pre>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(renderEmailToHtml(design));
              }}
            >
              Copiar HTML
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper with provider
export function EmailBuilder(props: EmailBuilderProps) {
  return (
    <EmailEditorProvider>
      <EmailBuilderContent {...props} />
    </EmailEditorProvider>
  );
}
