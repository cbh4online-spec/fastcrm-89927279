import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LibraryTemplate, LibraryCategory } from './templateLibraryData';
import { CATEGORY_LABELS } from './templateLibraryData';

const CATEGORY_COLORS: Record<LibraryCategory, string> = {
  geral: 'bg-muted text-muted-foreground',
  vendas: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  sucesso: 'bg-green-500/10 text-green-700 dark:text-green-400',
  produto: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  marketing: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  recrutamento: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
};

interface TemplateLibraryCardProps {
  template: LibraryTemplate;
  isSelected: boolean;
  onClick: () => void;
  onHover?: () => void;
}

export function TemplateLibraryCard({ template, isSelected, onClick, onHover }: TemplateLibraryCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all',
        'hover:bg-accent/50 hover:border-primary/30',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card'
      )}
    >
      {/* Field chips */}
      <div className="hidden sm:flex flex-col gap-1 min-w-[140px] max-w-[180px]">
        {template.fields.slice(0, 3).map((field) => (
          <div
            key={field.name}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span className="truncate font-medium">{field.name}</span>
            <span className="text-muted-foreground/50">›</span>
            <span className="text-muted-foreground/70">{field.type}</span>
          </div>
        ))}
        {template.fields.length > 3 && (
          <span className="text-[10px] text-muted-foreground/50">
            +{template.fields.length - 3} mais
          </span>
        )}
      </div>

      {/* Title + description + badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm truncate">{template.name}</span>
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', CATEGORY_COLORS[template.category])}>
            {CATEGORY_LABELS[template.category]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
      </div>

      {/* Section count */}
      <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
        {template.fields.length} Secções
      </div>
    </button>
  );
}
