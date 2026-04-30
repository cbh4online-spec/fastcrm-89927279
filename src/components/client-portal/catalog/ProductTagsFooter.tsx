import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

interface ProductTagsFooterProps {
  tags: string[] | null | undefined;
  onTagClick?: (tag: string) => void;
  activeTag?: string | null;
}

export function ProductTagsFooter({ tags, onTagClick, activeTag }: ProductTagsFooterProps) {
  const cleanTags = (tags || []).filter((t) => t && t.trim().length > 0);
  if (cleanTags.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tags relacionadas
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cleanTags.map((tag, i) => {
          const isActive = activeTag === tag;
          return (
            <Badge
              key={i}
              variant={isActive ? "default" : "secondary"}
              className={
                onTagClick
                  ? "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-normal"
                  : "text-xs font-normal"
              }
              onClick={
                onTagClick
                  ? (e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }
                  : undefined
              }
              role={onTagClick ? "button" : undefined}
              tabIndex={onTagClick ? 0 : undefined}
              onKeyDown={
                onTagClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTagClick(tag);
                      }
                    }
                  : undefined
              }
            >
              {tag}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
