import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { EbookInlineToolbar } from './EbookInlineToolbar';

interface EbookRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onAIRewrite?: (selectedText: string) => void;
}

export interface EbookRichEditorHandle {
  insertBlock: (html: string) => void;
  undo: () => void;
  redo: () => void;
}

/** Convert simple markdown to HTML for migration */
function markdownToHtml(md: string): string {
  if (!md) return '';
  if (md.includes('<p>') || md.includes('<h1>') || md.includes('<div>')) return md;

  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|blockquote|hr|ul|ol|li|img|div|table)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

export { markdownToHtml };

function placeCursorAtEnd(editor: HTMLElement) {
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export const EbookRichEditor = forwardRef<EbookRichEditorHandle, EbookRichEditorProps>(function EbookRichEditor({
  value,
  onChange,
  placeholder = 'Comece a escrever aqui...',
  className,
  onAIRewrite,
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const lastValueRef = useRef(value);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    insertBlock(html: string) {
      const editor = editorRef.current;
      if (!editor) return;

      const sel = window.getSelection();
      const cursorInEditor = sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode);

      if (cursorInEditor && sel) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const frag = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        if (lastNode) {
          const newRange = document.createRange();
          newRange.setStartAfter(lastNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      } else {
        // No cursor in editor — focus, place cursor at end, then append
        placeCursorAtEnd(editor);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) {
          editor.appendChild(temp.firstChild);
        }
        // Move cursor after appended content
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const s = window.getSelection();
        if (s) {
          s.removeAllRanges();
          s.addRange(range);
        }
      }
      onChange(editor.innerHTML);
      lastValueRef.current = editor.innerHTML;
    },
    undo() {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand('undo');
      onChange(editor.innerHTML);
      lastValueRef.current = editor.innerHTML;
    },
    redo() {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand('redo');
      onChange(editor.innerHTML);
      lastValueRef.current = editor.innerHTML;
    },
  }), [onChange]);

  // Sync content only when editor is NOT focused
  useEffect(() => {
    if (editorRef.current && !isFocusedRef.current) {
      const htmlValue = markdownToHtml(value);
      if (lastValueRef.current !== value && editorRef.current.innerHTML !== htmlValue) {
        editorRef.current.innerHTML = htmlValue || '';
        lastValueRef.current = value;
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      isFocusedRef.current = false;
      setIsFocused(false);
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
        top: Math.max(8, rect.top - editorRect.top - 48),
        left: Math.max(100, Math.min(rect.left - editorRect.left + (rect.width / 2), editorRect.width - 100)),
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
      {showToolbar && isFocused && hasSelection && (
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
          "min-h-[50vh] outline-none text-foreground",
          "prose prose-sm max-w-none dark:prose-invert",
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
          isEmpty && !isFocused && "text-muted-foreground",
          className
        )}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {isEmpty && !isFocused && (
        <div
          className="absolute top-0 left-0 text-muted-foreground/60 pointer-events-none select-none font-serif"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
    </div>
  );
});
