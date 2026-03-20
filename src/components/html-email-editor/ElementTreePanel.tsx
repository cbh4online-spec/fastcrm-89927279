import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Type, Heading, Image, Link2, Minus, Square, PaintBucket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditableElementType } from './types';
import { ELEMENT_TYPE_LABELS, ELEMENT_TYPE_COLORS } from './types';

interface TreeElement {
  id: string;
  type: EditableElementType;
  tagName: string;
  preview: string;
}

interface ElementTreePanelProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}

const TREE_ICONS: Record<EditableElementType, React.ReactNode> = {
  cta: <PaintBucket className="h-3 w-3 shrink-0" />,
  text: <Type className="h-3 w-3 shrink-0" />,
  heading: <Heading className="h-3 w-3 shrink-0" />,
  image: <Image className="h-3 w-3 shrink-0" />,
  link: <Link2 className="h-3 w-3 shrink-0" />,
  divider: <Minus className="h-3 w-3 shrink-0" />,
  container: <Square className="h-3 w-3 shrink-0" />,
};

export function ElementTreePanel({ iframeRef, selectedElementId, onSelectElement }: ElementTreePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [elements, setElements] = useState<TreeElement[]>([]);

  // Request element list from iframe
  const refreshTree = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'html-editor-get-tree' }, '*');
  }, [iframeRef]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'html-editor-tree') {
        setElements(e.data.payload || []);
      }
    };
    window.addEventListener('message', handler);

    // Initial scan after a delay for iframe to load
    const t = setTimeout(refreshTree, 500);
    // Refresh on any update
    const interval = setInterval(refreshTree, 3000);

    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [refreshTree]);

  const handleClick = (id: string) => {
    // Tell iframe to select the element
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'html-editor-select-by-id',
        payload: id,
      }, '*');
    }
  };

  return (
    <div className="border-t bg-background">
      <button
        onClick={() => { setCollapsed(!collapsed); if (collapsed) refreshTree(); }}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Árvore de elementos ({elements.length})
      </button>

      {!collapsed && (
        <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-0.5">
          {elements.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
              Nenhum elemento editável detetado
            </p>
          ) : (
            elements.map((el) => (
              <button
                key={el.id}
                onClick={() => handleClick(el.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                  selectedElementId === el.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {TREE_ICONS[el.type]}
                <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                  {ELEMENT_TYPE_LABELS[el.type]}
                </span>
                <span className="truncate text-[11px] opacity-70">
                  {el.preview}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
