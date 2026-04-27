import { useEffect, useRef, useState } from "react";
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

export function BuilderCodeEditor({ value, onChange, saveState, className, readOnly }: Props) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    setMounted(true);
  };

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
}

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
