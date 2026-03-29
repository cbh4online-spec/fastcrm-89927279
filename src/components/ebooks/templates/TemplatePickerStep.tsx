import { useState } from "react";
import { useEbookTemplates } from "@/hooks/useEbookTemplates";
import { CATEGORY_LABELS } from "@/types/ebook-templates";
import type { EbookTemplate, TemplateCategory } from "@/types/ebook-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS: { value: TemplateCategory | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial" },
  { value: "corporate", label: "Corporate" },
];

interface Props {
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null, template: EbookTemplate | null) => void;
}

export function TemplatePickerStep({ selectedTemplateId, onSelect }: Props) {
  const [filter, setFilter] = useState<TemplateCategory | "all">("all");
  const { data: templates, isLoading } = useEbookTemplates(
    filter !== "all" ? { category: filter } : undefined
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Escolha um template visual</p>
        <p className="text-xs text-muted-foreground">
          Selecione um template para definir o visual do eBook, ou continue sem template.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* "No template" option */}
      <button
        onClick={() => onSelect(null, null)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
          selectedTemplateId === null
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-primary/30"
        )}
      >
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Sem template</p>
          <p className="text-xs text-muted-foreground">Começar com um design em branco</p>
        </div>
        {selectedTemplateId === null && (
          <Check className="h-4 w-4 text-primary shrink-0" />
        )}
      </button>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
          {(templates || []).map((tpl) => {
            const t = tpl.style_tokens;
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl.id, tpl)}
                className={cn(
                  "relative rounded-xl border-2 overflow-hidden text-left transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                {/* Mini color preview */}
                <div
                  className="h-24 relative overflow-hidden"
                  style={{ backgroundColor: t.backgroundColor }}
                >
                  <div className="absolute inset-2 flex flex-col gap-1">
                    <div
                      className="flex-1 rounded-sm flex flex-col justify-end p-2"
                      style={{ backgroundColor: t.primaryColor }}
                    >
                      <div className="h-2 w-3/4 rounded-sm mb-0.5" style={{ backgroundColor: t.backgroundColor, opacity: 0.9 }} />
                      <div className="h-1.5 w-1/2 rounded-sm" style={{ backgroundColor: t.accentColor, opacity: 0.8 }} />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 h-6 rounded-sm" style={{ backgroundColor: `${t.accentColor}22` }} />
                      <div className="flex-1 h-6 rounded-sm" style={{ backgroundColor: `${t.accentColor}22` }} />
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium text-foreground truncate">{tpl.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {CATEGORY_LABELS[tpl.category] || tpl.category}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">{tpl.page_layouts.length}p</span>
                  </div>
                  {/* Color swatches */}
                  <div className="flex gap-0.5">
                    {[t.primaryColor, t.secondaryColor, t.accentColor].map((c, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-full border border-border/40" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
