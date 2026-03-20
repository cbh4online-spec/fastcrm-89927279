import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Eye,
  Save,
  X,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HtmlPreviewPanel } from './HtmlPreviewPanel';
import { HtmlContextPanel } from './HtmlContextPanel';
import type { EditableElement, ElementUpdate } from './types';

interface HtmlEmailEditorProps {
  htmlContent: string;
  campaignName?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

export function HtmlEmailEditor({ htmlContent, campaignName, onSave, onCancel }: HtmlEmailEditorProps) {
  const [currentHtml, setCurrentHtml] = useState(htmlContent);
  const [selectedElement, setSelectedElement] = useState<EditableElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-save timer
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      handleExportHtml((html) => {
        setCurrentHtml(html);
        setLastSaved(new Date());
      });
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, []);

  const handleElementSelect = useCallback((element: EditableElement) => {
    if (isPreviewOnly) return;
    setSelectedElement(element);
  }, [isPreviewOnly]);

  const handleElementDeselect = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const handleElementUpdate = useCallback((update: ElementUpdate) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'html-editor-update',
      payload: update,
    }, '*');
  }, []);

  const handleHtmlUpdated = useCallback((html: string) => {
    setCurrentHtml(html);
  }, []);

  const handleExportHtml = useCallback((callback?: (html: string) => void) => {
    if (!iframeRef.current?.contentWindow) return;
    
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'html-editor-full-html') {
        window.removeEventListener('message', handler);
        if (callback) callback(e.data.payload);
      }
    };
    window.addEventListener('message', handler);
    iframeRef.current.contentWindow.postMessage({ type: 'html-editor-get-html' }, '*');
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    handleExportHtml((html) => {
      onSave(html);
      setSaving(false);
      toast.success('Email guardado');
    });
  }, [onSave, handleExportHtml]);

  const handleDownload = useCallback(() => {
    handleExportHtml((html) => {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaignName || 'email'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('HTML exportado');
    });
  }, [campaignName, handleExportHtml]);

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm">{campaignName || 'Editor HTML'}</h2>
            <p className="text-xs text-muted-foreground">
              {lastSaved
                ? `Guardado às ${lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : 'Editor visual de HTML'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device toggle */}
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
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border" />

          <Button
            variant={isPreviewOnly ? 'secondary' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => {
              setIsPreviewOnly(!isPreviewOnly);
              if (!isPreviewOnly) setSelectedElement(null);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>

          <Button variant="outline" size="sm" className="h-8" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>

          <Button size="sm" className="h-8" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel — Live Preview */}
        <div className={cn("flex-1 flex flex-col overflow-hidden min-w-0", isPreviewOnly ? "w-full" : "")}>
          <HtmlPreviewPanel
            htmlContent={currentHtml}
            previewMode={previewMode}
            isPreviewOnly={isPreviewOnly}
            iframeRef={iframeRef}
            onElementSelect={handleElementSelect}
            onElementDeselect={handleElementDeselect}
            onHtmlUpdated={handleHtmlUpdated}
          />
        </div>

        {/* Right Panel — Context Controls */}
        {!isPreviewOnly && (
          <div className="w-[380px] shrink-0 border-l bg-background flex flex-col min-h-0 overflow-y-auto">
            <HtmlContextPanel
              selectedElement={selectedElement}
              onUpdate={handleElementUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
