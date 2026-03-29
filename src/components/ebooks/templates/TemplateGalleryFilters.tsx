import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, USE_CASE_LABELS } from "@/types/ebook-templates";

interface Props {
  selectedCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  selectedUseCase: string | null;
  onUseCaseChange: (uc: string | null) => void;
}

const categories = Object.entries(CATEGORY_LABELS);
const useCases = ["ebook", "lead_magnet", "guide", "brand_book", "report", "workbook", "proposal", "premium_guide"];

export function TemplateGalleryFilters({ selectedCategory, onCategoryChange, selectedUseCase, onUseCaseChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Category */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Estilo</h4>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 w-fit overflow-x-auto max-w-full flex-nowrap scrollbar-none">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
              !selectedCategory
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Todos
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              onClick={() => onCategoryChange(key)}
              className={cn(
                "flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
                selectedCategory === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Uso</h4>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 w-fit overflow-x-auto max-w-full flex-nowrap scrollbar-none">
          <button
            onClick={() => onUseCaseChange(null)}
            className={cn(
              "flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
              !selectedUseCase
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Todos
          </button>
          {useCases.map(uc => (
            <button
              key={uc}
              onClick={() => onUseCaseChange(uc)}
              className={cn(
                "flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
                selectedUseCase === uc
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {USE_CASE_LABELS[uc] || uc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
