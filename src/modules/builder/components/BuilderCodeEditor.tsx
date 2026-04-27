import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface Props {
  value: string;
  onChange: (next: string) => void;
  saveState: SaveState;
  className?: string;
  readOnly?: boolean;
}

export interface BuilderCodeEditorHandle {
  /** Insere HTML na posição actual do cursor (substitui selecção, se existir). */
  insertAtCursor: (snippet: string) => void;
  /** Devolve a selecção actual ou string vazia. */
  getSelection: () => string;
  /** Foca o editor. */
  focus: () => void;
}

export const BuilderCodeEditor = forwardRef<BuilderCodeEditorHandle, Props>(function BuilderCodeEditor(
  { value, onChange, saveState, className, readOnly },
  ref,
) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    setMounted(true);
  };

  useImperativeHandle(ref, () => ({
    insertAtCursor: (snippet) => {
      const editor = editorRef.current;
      if (!editor) {
        // fallback: append to end
        onChange(`${value}\n${snippet}`);
        return;
      }
      const selection = editor.getSelection();
      const pretty = `\n${snippet.trim()}\n`;
      if (selection) {
        editor.executeEdits("builder-block-insert", [
          { range: selection, text: pretty, forceMoveMarkers: true },
        ]);
      } else {
        const pos = editor.getPosition();
        if (pos) {
          editor.executeEdits("builder-block-insert", [
            {
              range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
              text: pretty,
              forceMoveMarkers: true,
            },
          ]);
        }
      }
      editor.focus();
    },
    getSelection: () => {
      const editor = editorRef.current;
      if (!editor) return "";
      const sel = editor.getSelection();
      if (!sel || sel.isEmpty()) return "";
      const model = editor.getModel();
      if (!model) return "";
      return model.getValueInRange(sel);
    },
    focus: () => editorRef.current?.focus(),
  }), [onChange, value]);

  useEffect(() => {
    return () => {
      editorRef.current = null;
    };
  }, []);

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 rounded-lg border overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/60 backdrop-blur">
        <div className="text-xs font-medium text-muted-foreground">HTML</div>
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            renderLineHighlight: "line",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
          theme="vs-dark"
          loading={
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              A carregar editor…
            </div>
          }
        />
        {!mounted && null}
      </div>
    </div>
  );
});

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> A guardar…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Guardado
      </span>
    );
  }
  if (state === "dirty") {
    return <span className="text-xs text-amber-600 dark:text-amber-400">Alterações por guardar…</span>;
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Erro ao guardar
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Pronto</span>;
}
