import { Button } from "@/components/ui/button";
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
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!selectedCategory ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => onCategoryChange(null)}
          >
            Todos
          </Button>
          {categories.map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={selectedCategory === key ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => onCategoryChange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Uso</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!selectedUseCase ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => onUseCaseChange(null)}
          >
            Todos
          </Button>
          {useCases.map(uc => (
            <Button
              key={uc}
              size="sm"
              variant={selectedUseCase === uc ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => onUseCaseChange(uc)}
            >
              {USE_CASE_LABELS[uc] || uc}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
