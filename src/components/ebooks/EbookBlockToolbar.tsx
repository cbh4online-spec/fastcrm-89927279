import { useRef } from 'react';
import {
  Type, ImageIcon, Minus, Quote, Table2, Columns2,
  Heading1, Heading2, List, ListOrdered, Undo2, Redo2,
  Upload, Wand2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface EbookBlockToolbarProps {
  onInsertBlock: (html: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onGenerateImageAI?: (prompt: string) => Promise<string | null>;
}

const TEXT_BLOCKS = [
  { icon: Heading1, label: 'Título H1', html: '<h1>Título</h1>' },
  { icon: Heading2, label: 'Título H2', html: '<h2>Subtítulo</h2>' },
  { icon: Type, label: 'Parágrafo', html: '<p>Escreva aqui...</p>' },
  { icon: List, label: 'Lista', html: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>' },
  { icon: ListOrdered, label: 'Lista Numerada', html: '<ol><li>Primeiro</li><li>Segundo</li><li>Terceiro</li></ol>' },
];

const LAYOUT_BLOCKS = [
  { icon: Quote, label: 'Citação', html: '<blockquote>Insira a sua citação aqui...</blockquote>' },
  { icon: Minus, label: 'Divisor', html: '<hr />' },
  { icon: Table2, label: 'Tabela', html: '<table style="width:100%;border-collapse:collapse"><tr><th style="border:1px solid #ddd;padding:8px;text-align:left">Coluna 1</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Coluna 2</th></tr><tr><td style="border:1px solid #ddd;padding:8px">Dados</td><td style="border:1px solid #ddd;padding:8px">Dados</td></tr></table>' },
  { icon: Columns2, label: '2 Colunas', html: '<div style="display:flex;gap:16px"><div style="flex:1"><p>Coluna esquerda</p></div><div style="flex:1"><p>Coluna direita</p></div></div>' },
];

export function EbookBlockToolbar({ onInsertBlock, onUndo, onRedo, onUploadImage, onGenerateImageAI }: EbookBlockToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        onInsertBlock(`<img src="${url}" alt="imagem" style="max-width:100%;border-radius:8px;margin:12px 0" />`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateAI = async () => {
    if (!onGenerateImageAI) return;
    const prompt = window.prompt("Descreva a imagem que pretende gerar:");
    if (!prompt?.trim()) return;
    setGeneratingAI(true);
    try {
      const url = await onGenerateImageAI(prompt.trim());
      if (url) {
        onInsertBlock(`<img src="${url}" alt="${prompt.trim()}" style="max-width:100%;border-radius:8px;margin:12px 0" />`);
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  const renderBlockButton = (item: { icon: any; label: string; html: string }) => (
    <button
      key={item.label}
      onClick={() => onInsertBlock(item.html)}
      className={cn(
        "flex flex-col items-center gap-1 p-2.5 rounded-lg border border-transparent",
        "hover:bg-accent hover:border-border/60 transition-all duration-150",
        "text-muted-foreground hover:text-foreground group"
      )}
      title={item.label}
    >
      <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
        <item.icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
    </button>
  );

  return (
    <div className="h-full flex flex-col border-l border-border/40 bg-card/50">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {(onUndo || onRedo) && (
        <div className="p-2 border-b border-border/40 flex items-center gap-1">
          <button
            onClick={onUndo}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 p-1.5 rounded-md text-xs font-medium",
              "hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            )}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="text-[10px]">Desfazer</span>
          </button>
          <button
            onClick={onRedo}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 p-1.5 rounded-md text-xs font-medium",
              "hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            )}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
            <span className="text-[10px]">Refazer</span>
          </button>
        </div>
      )}

      <div className="p-3 border-b border-border/40">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Blocos</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Clique para inserir</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Texto */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Texto</p>
            <div className="grid grid-cols-2 gap-1">
              {TEXT_BLOCKS.map(renderBlockButton)}
            </div>
          </div>

          {/* Média */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Média</p>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-lg border border-transparent",
                  "hover:bg-accent hover:border-border/60 transition-all duration-150",
                  "text-muted-foreground hover:text-foreground group",
                  uploading && "opacity-50 pointer-events-none"
                )}
                title="Upload de imagem"
              >
                <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </div>
                <span className="text-[10px] font-medium leading-tight text-center">Imagem</span>
              </button>

              {onGenerateImageAI && (
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-lg border border-transparent",
                    "hover:bg-accent hover:border-border/60 transition-all duration-150",
                    "text-muted-foreground hover:text-foreground group",
                    generatingAI && "opacity-50 pointer-events-none"
                  )}
                  title="Gerar imagem com IA"
                >
                  <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                    {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">Img IA</span>
                </button>
              )}
            </div>
          </div>

          {/* Blocos */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Blocos</p>
            <div className="grid grid-cols-2 gap-1">
              {LAYOUT_BLOCKS.map(renderBlockButton)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
