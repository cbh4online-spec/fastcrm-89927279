import {
  Type, ImageIcon, Minus, Quote, Table2, Columns2,
  Heading1, Heading2, List, ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EbookBlockToolbarProps {
  onInsertBlock: (html: string) => void;
}

const BLOCKS = [
  {
    group: 'Texto',
    items: [
      { icon: Heading1, label: 'Título H1', html: '<h1>Título</h1>' },
      { icon: Heading2, label: 'Título H2', html: '<h2>Subtítulo</h2>' },
      { icon: Type, label: 'Parágrafo', html: '<p>Escreva aqui...</p>' },
      { icon: List, label: 'Lista', html: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>' },
      { icon: ListOrdered, label: 'Lista Numerada', html: '<ol><li>Primeiro</li><li>Segundo</li><li>Terceiro</li></ol>' },
    ],
  },
  {
    group: 'Média',
    items: [
      { icon: ImageIcon, label: 'Imagem', html: '<p><img src="" alt="Imagem" style="max-width:100%;border-radius:8px;margin:8px 0" /></p>' },
    ],
  },
  {
    group: 'Blocos',
    items: [
      { icon: Quote, label: 'Citação', html: '<blockquote>Insira a sua citação aqui...</blockquote>' },
      { icon: Minus, label: 'Divisor', html: '<hr />' },
      { icon: Table2, label: 'Tabela', html: '<table style="width:100%;border-collapse:collapse"><tr><th style="border:1px solid #ddd;padding:8px;text-align:left">Coluna 1</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Coluna 2</th></tr><tr><td style="border:1px solid #ddd;padding:8px">Dados</td><td style="border:1px solid #ddd;padding:8px">Dados</td></tr></table>' },
      { icon: Columns2, label: '2 Colunas', html: '<div style="display:flex;gap:16px"><div style="flex:1"><p>Coluna esquerda</p></div><div style="flex:1"><p>Coluna direita</p></div></div>' },
    ],
  },
];

export function EbookBlockToolbar({ onInsertBlock }: EbookBlockToolbarProps) {
  return (
    <div className="h-full flex flex-col border-l border-border/40 bg-card/50">
      <div className="p-3 border-b border-border/40">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Blocos</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Clique para inserir</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {BLOCKS.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                {group.group}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => (
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
