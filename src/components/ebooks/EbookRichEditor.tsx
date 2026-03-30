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

/** Apply inline markdown formatting (bold, italic, links, images) */
function applyInlineFormatting(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Convert markdown to HTML with full support for lists, tables, code blocks */
function markdownToHtml(md: string): string {
  if (!md) return '';
  // Skip if already HTML
  if (md.includes('<p>') || md.includes('<h1>') || md.includes('<div>')) return md;

  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // --- Code fences ---
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      output.push(`<pre><code>${codeLines.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
      continue;
    }

    // --- Headings ---
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      output.push(`<h${level}>${applyInlineFormatting(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // --- HR ---
    if (/^---+$/.test(line.trim())) {
      output.push('<hr />');
      i++;
      continue;
    }

    // --- Blockquote ---
    if (line.match(/^>\s/)) {
      output.push(`<blockquote>${applyInlineFormatting(line.replace(/^>\s/, ''))}</blockquote>`);
      i++;
      continue;
    }

    // --- Unordered list ---
    if (/^\s*[\*\-]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[\*\-]\s+/.test(lines[i])) {
        items.push(applyInlineFormatting(lines[i].replace(/^\s*[\*\-]\s+/, '')));
        i++;
      }
      output.push('<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>');
      continue;
    }

    // --- Ordered list ---
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(applyInlineFormatting(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i++;
      }
      output.push('<ol>' + items.map(item => `<li>${item}</li>`).join('') + '</ol>');
      continue;
    }

    // --- GFM Table ---
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+/.test(lines[i + 1])) {
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length === 0) break;
        rows.push(cells);
        i++;
      }
      let table = '<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr>';
      table += headerCells.map(c => `<th style="border:1px solid #ddd;padding:6px 10px;text-align:left">${applyInlineFormatting(c)}</th>`).join('');
      table += '</tr></thead><tbody>';
      for (const row of rows) {
        table += '<tr>' + row.map(c => `<td style="border:1px solid #ddd;padding:6px 10px">${applyInlineFormatting(c)}</td>`).join('') + '</tr>';
      }
      table += '</tbody></table>';
      output.push(table);
      continue;
    }

    // --- Empty line ---
    if (line.trim() === '') {
      i++;
      continue;
    }

    // --- Paragraph: collect consecutive non-special lines ---
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' &&
      !/^(#{1,6}\s|>\s|\s*[\*\-]\s|\s*\d+\.\s|---+$|```)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+/.test(lines[i + 1]))) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${applyInlineFormatting(paraLines.join('<br>'))}</p>`);
    }
  }

  return output.join('\n');
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
      if (editorRef.current.innerHTML !== htmlValue) {
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
    <div className="relative group/editor">
      {showToolbar && isFocused && hasSelection && (
        <EbookInlineToolbar
          position={toolbarPosition}
          onCommand={execCommand}
          onAIRewrite={onAIRewrite ? handleAIRewrite : undefined}
        />
      )}

      {/* Hint bar — shows editing tip based on focus state */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 mb-2 rounded-md text-xs transition-all duration-200",
        isFocused
          ? "bg-primary/5 text-primary/70 border border-primary/15"
          : "bg-muted/30 text-muted-foreground/50 border border-transparent group-hover/editor:bg-muted/50 group-hover/editor:text-muted-foreground/70"
      )}>
        {isFocused ? (
          <span>Selecione texto para formatar · <kbd className="px-1 py-0.5 rounded bg-primary/10 text-[10px] font-mono">Ctrl+B</kbd> negrito · <kbd className="px-1 py-0.5 rounded bg-primary/10 text-[10px] font-mono">Ctrl+I</kbd> itálico</span>
        ) : (
          <span>Clique para editar o conteúdo</span>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable
        style={{
          fontFamily: 'var(--ebook-body-font, inherit)',
        }}
        className={cn(
          "min-h-[50vh] outline-none text-foreground cursor-text",
          "prose prose-sm max-w-none dark:prose-invert",
          "prose-headings:text-foreground prose-headings:font-bold",
          "[&_h1]:[font-family:var(--ebook-heading-font,inherit)] [&_h2]:[font-family:var(--ebook-heading-font,inherit)] [&_h3]:[font-family:var(--ebook-heading-font,inherit)]",
          "prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3",
          "prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-2",
          "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
          "prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-3",
          "prose-strong:text-foreground prose-a:text-primary",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground",
          "prose-img:rounded-lg prose-img:shadow-md prose-img:my-4",
          "prose-hr:border-border",
          "rounded-md transition-all border border-transparent p-3",
          isFocused && "ring-1 ring-primary/20 border-primary/30 bg-background",
          !isFocused && "hover:border-border/50 hover:bg-accent/5",
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
          className="absolute top-10 left-3 text-muted-foreground/60 pointer-events-none select-none font-serif"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
    </div>
  );
});
