import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { EbookInlineToolbar } from './EbookInlineToolbar';

interface EbookRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onAIRewrite?: (selectedText: string) => void;
}

/** Convert simple markdown to HTML for migration */
function markdownToHtml(md: string): string {
  if (!md) return '';
  // If it already looks like HTML, return as-is
  if (md.includes('<p>') || md.includes('<h1>') || md.includes('<div>')) return md;

  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Paragraphs: split by double newlines
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|blockquote|hr|ul|ol|li|img|div|table)/.test(trimmed)) return trimmed;
    // Wrap in <p>, converting single newlines to <br>
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

export { markdownToHtml };

export function EbookRichEditor({
  value,
  onChange,
  placeholder = 'Comece a escrever aqui...',
  className,
  onAIRewrite,
}: EbookRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const isInternalUpdate = useRef(false);

  // Set initial content (only when value changes externally)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const htmlValue = markdownToHtml(value);
      if (editorRef.current.innerHTML !== htmlValue) {
        editorRef.current.innerHTML = htmlValue || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsEditing(false);
      setShowToolbar(false);
    }, 200);
  }, []);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      setHasSelection(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (selectedText.length > 0 && editorRef.current.contains(range.commonAncestorContainer)) {
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      setToolbarPosition({
        top: rect.top - editorRect.top - 48,
        left: rect.left - editorRect.left + (rect.width / 2),
      });
      setShowToolbar(true);
      setHasSelection(true);
    } else {
      setShowToolbar(false);
      setHasSelection(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); execCommand('bold'); break;
        case 'i': e.preventDefault(); execCommand('italic'); break;
        case 'u': e.preventDefault(); execCommand('underline'); break;
      }
    }
  }, [execCommand]);

  const handleAIRewrite = useCallback(() => {
    const selection = window.getSelection();
    if (selection && onAIRewrite) {
      onAIRewrite(selection.toString());
    }
  }, [onAIRewrite]);

  const isEmpty = !value || value === '<p><br></p>' || value === '<br>' || value.trim() === '';

  return (
    <div className="relative">
      {showToolbar && isEditing && hasSelection && (
        <EbookInlineToolbar
          position={toolbarPosition}
          onCommand={execCommand}
          onAIRewrite={onAIRewrite ? handleAIRewrite : undefined}
        />
      )}

      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "min-h-[50vh] outline-none",
          "prose prose-sm max-w-none font-serif",
          "prose-headings:text-foreground prose-headings:font-bold",
          "prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3",
          "prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-2",
          "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
          "prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-3",
          "prose-strong:text-foreground prose-a:text-primary",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground",
          "prose-img:rounded-lg prose-img:shadow-md prose-img:my-4",
          "prose-hr:border-border",
          "focus:ring-0 rounded-md transition-all",
          isEmpty && !isEditing && "text-muted-foreground",
          className
        )}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {isEmpty && !isEditing && (
        <div
          className="absolute top-0 left-0 text-muted-foreground/60 pointer-events-none select-none font-serif"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
