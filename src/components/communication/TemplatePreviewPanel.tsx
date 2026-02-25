import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Type, List, Hash, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripStructureLabels } from '@/lib/templateUtils';
import type { LibraryTemplate, LibraryTemplateField, LibraryCategory } from './templateLibraryData';
import { CATEGORY_LABELS } from './templateLibraryData';

const CATEGORY_COLORS: Record<LibraryCategory, string> = {
  geral: 'bg-muted text-muted-foreground',
  vendas: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  sucesso: 'bg-green-500/10 text-green-700 dark:text-green-400',
  produto: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  marketing: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  recrutamento: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
};

const FIELD_TYPE_ICON: Record<LibraryTemplateField['type'], React.ElementType> = {
  Text: Type,
  List: List,
  Number: Hash,
  Date: Calendar,
  Select: ChevronDown,
};

/**
 * Split text on `{{variable}}` patterns and return an array of
 * text spans and highlighted Badge elements for each variable.
 */
function highlightVariables(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{\w+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(\w+)\}\}$/);
    if (match) {
      return (
        <Badge
          key={i}
          variant="secondary"
          className="font-mono text-[11px] px-1.5 py-0 mx-0.5 inline-flex align-baseline"
        >
          {match[1]}
        </Badge>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface TemplatePreviewPanelProps {
  template: LibraryTemplate;
  onUse: () => void;
}

export function TemplatePreviewPanel({ template, onUse }: TemplatePreviewPanelProps) {
  const cleanBody = stripStructureLabels(template.body);

  return (
    <div className="w-[340px] border-l shrink-0 flex flex-col animate-slide-in-right bg-card">
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          {/* Name + category */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{template.name}</h3>
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0 shrink-0', CATEGORY_COLORS[template.category])}
              >
                {CATEGORY_LABELS[template.category]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </div>

          {/* Subject */}
          {template.subject && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assunto
              </span>
              <div className="mt-1 text-sm leading-relaxed">
                {highlightVariables(template.subject)}
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Corpo
            </span>
            <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
              {highlightVariables(cleanBody)}
            </div>
          </div>

          {/* Fields summary */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {template.fields.length} Secções
            </span>
            <div className="mt-2 space-y-1">
              {template.fields.map((field, idx) => {
                const FieldIcon = FIELD_TYPE_ICON[field.type];
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FieldIcon className="h-3 w-3 shrink-0" />
                    <span>{field.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Use button */}
      <div className="p-4 border-t">
        <Button className="w-full gap-2" size="sm" onClick={onUse}>
          Usar template
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
