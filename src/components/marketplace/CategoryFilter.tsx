import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ModuleCategory, CATEGORY_INFO } from "@/types/marketplace";
import { getIconByName } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

interface CategoryFilterProps {
  selectedCategory: ModuleCategory | "all";
  onCategoryChange: (category: ModuleCategory | "all") => void;
  moduleCounts?: Record<ModuleCategory | "all", number>;
}

export function CategoryFilter({ 
  selectedCategory, 
  onCategoryChange,
  moduleCounts = {} as Record<ModuleCategory | "all", number>
}: CategoryFilterProps) {
  const categories = Object.values(CATEGORY_INFO);

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-4">
        {/* All category */}
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange("all")}
          className={cn(
            "flex-shrink-0 gap-2",
            selectedCategory === "all" && "shadow-md"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Todos</span>
          {moduleCounts.all !== undefined && (
            <span className="text-xs opacity-70">({moduleCounts.all})</span>
          )}
        </Button>

        {/* Category buttons */}
        {categories.map((category) => {
          const IconComponent = getIconByName(category.icon);
          const isSelected = selectedCategory === category.id;
          const count = moduleCounts[category.id];

          return (
            <Button
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "flex-shrink-0 gap-2",
                isSelected && "shadow-md",
                !isSelected && "hover:bg-muted"
              )}
            >
              <IconComponent className={cn("w-4 h-4", !isSelected && category.color)} />
              <span>{category.name}</span>
              {count !== undefined && count > 0 && (
                <span className="text-xs opacity-70">({count})</span>
              )}
            </Button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
