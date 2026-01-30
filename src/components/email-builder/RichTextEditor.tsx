import { useRef, useEffect, useCallback, useState, useId } from 'react';
import { cn } from '@/lib/utils';
import { InlineToolbar } from './InlineToolbar';
import { useEmailEditorContext } from '@/contexts/EmailEditorContext';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escreve aqui...',
  className,
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const editorId = useId();
  
  // Try to get context - may not exist if used outside EmailEditorProvider
  let editorContext: ReturnType<typeof useEmailEditorContext> | null = null;
  try {
    editorContext = useEmailEditorContext();
  } catch {
    // Context not available, that's ok
  }

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      onChange(newValue);
    }
  }, [onChange]);

  const insertVariable = useCallback((variable: string) => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    const selection = window.getSelection();
    let range: Range;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      // Check if selection is within our editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        // Selection is outside, place at end
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
    } else {
      // No selection, create range at end
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }
    
    const span = document.createElement('span');
    span.className = 'variable-tag';
    span.contentEditable = 'false';
    span.textContent = variable;
    span.style.cssText = 'background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; cursor: default; display: inline-block; margin: 0 2px;';
    
    range.deleteContents();
    range.insertNode(span);
    
    // Add a space after and move cursor there
    const space = document.createTextNode(' ');
    range.setStartAfter(span);
    range.insertNode(space);
    range.setStartAfter(space);
    range.setEndAfter(space);
    
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  }, [handleInput]);

  // Register with context
  useEffect(() => {
    if (editorContext) {
      editorContext.registerEditor(editorId, insertVariable);
      return () => {
        editorContext.unregisterEditor(editorId);
      };
    }
  }, [editorContext, editorId, insertVariable]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    if (editorContext) {
      editorContext.setActiveEditor(editorId);
    }
    onFocus?.();
  }, [onFocus, editorContext, editorId]);

  const handleBlur = useCallback(() => {
    // Delay to allow toolbar clicks and variable insertion
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setIsEditing(false);
        setShowToolbar(false);
        onBlur?.();
      }
    }, 200);
  }, [onBlur]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setHasSelection(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (selectedText.length > 0 && editorRef.current?.contains(range.commonAncestorContainer)) {
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
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
      }
    }
  }, [execCommand]);

  const isEmpty = !value || value === '<p><br></p>' || value === '<br>';

  return (
    <div className="relative">
      {/* Toolbar */}
      {showToolbar && isEditing && hasSelection && (
        <InlineToolbar
          position={toolbarPosition}
          onCommand={execCommand}
          onInsertVariable={insertVariable}
        />
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "min-h-[100px] outline-none prose prose-sm max-w-none",
          "focus:ring-2 focus:ring-primary/20 rounded-md transition-all",
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

      {/* Placeholder */}
      {isEmpty && !isEditing && (
        <div 
          className="absolute top-0 left-0 text-muted-foreground pointer-events-none"
          aria-hidden
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
