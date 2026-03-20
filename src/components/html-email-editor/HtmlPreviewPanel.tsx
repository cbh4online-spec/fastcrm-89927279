import { useEffect, useCallback, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { getIframeScript, getIframeStyles } from './iframeBridge';
import type { EditableElement } from './types';

interface HtmlPreviewPanelProps {
  htmlContent: string;
  previewMode: 'desktop' | 'mobile';
  isPreviewOnly: boolean;
  iframeRef: RefObject<HTMLIFrameElement>;
  onElementSelect: (element: EditableElement) => void;
  onElementDeselect: () => void;
  onHtmlUpdated: (html: string) => void;
}

export function HtmlPreviewPanel({
  htmlContent,
  previewMode,
  isPreviewOnly,
  iframeRef,
  onElementSelect,
  onElementDeselect,
  onHtmlUpdated,
}: HtmlPreviewPanelProps) {

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.type) return;

      switch (e.data.type) {
        case 'html-editor-select':
          onElementSelect({
            id: e.data.payload.id,
            type: e.data.payload.elementType,
            tagName: e.data.payload.tagName,
            content: e.data.payload.content,
            attributes: e.data.payload.attributes,
            styles: e.data.payload.styles,
            outerHtml: e.data.payload.outerHtml,
          });
          break;
        case 'html-editor-deselect':
          onElementDeselect();
          break;
        case 'html-editor-html-updated':
          onHtmlUpdated(e.data.payload);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onElementSelect, onElementDeselect, onHtmlUpdated]);

  // Build the iframe srcDoc with injected scripts
  const buildSrcDoc = useCallback(() => {
    // Inject editor styles and script into the HTML
    const editorStyle = `<style data-editor>${getIframeStyles()}</style>`;
    const editorScript = `<script data-editor>${getIframeScript()}</script>`;

    let doc = htmlContent;

    // Insert styles before </head> or at the start
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${editorStyle}</head>`);
    } else {
      doc = editorStyle + doc;
    }

    // Insert script before </body> or at the end
    if (doc.includes('</body>')) {
      doc = doc.replace('</body>', `${editorScript}</body>`);
    } else {
      doc = doc + editorScript;
    }

    return doc;
  }, [htmlContent]);

  const previewWidth = previewMode === 'mobile' ? 375 : 600;

  return (
    <div className="flex-1 overflow-auto p-6 bg-muted/50 flex justify-center">
      <div
        className={cn(
          "bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300",
          isPreviewOnly && "pointer-events-none"
        )}
        style={{ width: previewWidth, maxWidth: '100%' }}
      >
        <iframe
          ref={iframeRef as any}
          srcDoc={buildSrcDoc()}
          className="w-full border-0"
          style={{ minHeight: 600, height: '100%' }}
          title="Email Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
