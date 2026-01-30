import { useState } from 'react';
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
import type { EmailDesign, EmailLayout, EmailBlockType } from '@/types/emailBuilder';

interface EmailBuilderProps {
  initialDesign?: EmailDesign;
  onSave: (design: EmailDesign, html: string) => void;
  onCancel: () => void;
}

type SidebarTab = 'elements' | 'layouts' | 'design';
type PreviewMode = 'desktop' | 'tablet' | 'mobile';

export function EmailBuilder({ initialDesign, onSave, onCancel }: EmailBuilderProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('elements');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

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
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">Editor de Email</h2>
            <p className="text-xs text-muted-foreground">
              {design.blocks.length} blocos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Preview mode toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setShowHtml(true)}>
            <Code className="h-4 w-4 mr-2" />
            HTML
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r bg-background flex flex-col">
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as SidebarTab)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
              <TabsTrigger value="elements" className="gap-1 text-xs py-2">
                <LayoutGrid className="h-3 w-3" />
                Elementos
              </TabsTrigger>
              <TabsTrigger value="layouts" className="gap-1 text-xs py-2">
                <LayoutGrid className="h-3 w-3" />
                Layouts
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-1 text-xs py-2">
                <Palette className="h-3 w-3" />
                Design
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
            
            <TabsContent value="design" className="flex-1 m-0 overflow-hidden">
              <DesignSidebar
                globalStyles={design.globalStyles}
                onUpdateStyles={updateGlobalStyles}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 flex overflow-hidden">
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
          />
        </div>
        
        {/* Right sidebar - Block Editor */}
        {selectedBlock && (
          <div className="w-72 border-l bg-background">
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
            />
          </div>
        )}
      </div>
      
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
