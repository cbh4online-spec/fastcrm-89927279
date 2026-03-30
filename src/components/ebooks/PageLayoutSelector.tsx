import { cn } from '@/lib/utils';
import type { PageLayout } from '@/hooks/useEbooks';

interface PageLayoutSelectorProps {
  value: PageLayout;
  onChange: (layout: PageLayout) => void;
}

const LAYOUTS: { value: PageLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'single',
    label: 'Coluna Única',
    preview: (
      <div className="w-full h-full flex flex-col gap-0.5 p-1">
        <div className="flex-1 bg-current/20 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'two-col-50',
    label: '2 Col. (50/50)',
    preview: (
      <div className="w-full h-full flex gap-0.5 p-1">
        <div className="flex-1 bg-current/20 rounded-[2px]" />
        <div className="flex-1 bg-current/20 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'two-col-60-40',
    label: '2 Col. (60/40)',
    preview: (
      <div className="w-full h-full flex gap-0.5 p-1">
        <div className="flex-[3] bg-current/20 rounded-[2px]" />
        <div className="flex-[2] bg-current/20 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'two-col-40-60',
    label: '2 Col. (40/60)',
    preview: (
      <div className="w-full h-full flex gap-0.5 p-1">
        <div className="flex-[2] bg-current/20 rounded-[2px]" />
        <div className="flex-[3] bg-current/20 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'hero-image',
    label: 'Hero + Texto',
    preview: (
      <div className="w-full h-full flex flex-col gap-0.5 p-1">
        <div className="h-[40%] bg-current/20 rounded-[2px]" />
        <div className="flex-1 bg-current/15 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'text-image-split',
    label: 'Texto + Imagem',
    preview: (
      <div className="w-full h-full flex gap-0.5 p-1">
        <div className="flex-1 bg-current/15 rounded-[2px] flex flex-col gap-0.5 p-0.5">
          <div className="h-1 bg-current/20 rounded-[1px]" />
          <div className="h-1 bg-current/20 rounded-[1px] w-3/4" />
        </div>
        <div className="flex-1 bg-current/25 rounded-[2px]" />
      </div>
    ),
  },
  {
    value: 'three-col',
    label: '3 Colunas',
    preview: (
      <div className="w-full h-full flex gap-0.5 p-1">
        <div className="flex-1 bg-current/20 rounded-[2px]" />
        <div className="flex-1 bg-current/20 rounded-[2px]" />
        <div className="flex-1 bg-current/20 rounded-[2px]" />
      </div>
    ),
  },
];

export function PageLayoutSelector({ value, onChange }: PageLayoutSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {LAYOUTS.map((layout) => (
        <button
          key={layout.value}
          onClick={() => onChange(layout.value)}
          className={cn(
            "flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all",
            value === layout.value
              ? "border-primary bg-primary/5 text-primary"
              : "border-border/40 text-muted-foreground hover:border-border hover:bg-accent/50"
          )}
        >
          <div className="w-full aspect-[4/3] rounded-md border border-current/10 overflow-hidden">
            {layout.preview}
          </div>
          <span className="text-[9px] font-medium leading-tight text-center">{layout.label}</span>
        </button>
      ))}
    </div>
  );
}
