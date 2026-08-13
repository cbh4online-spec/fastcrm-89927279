import { useState, useMemo } from "react";
import { sanitizeHtml } from "@/utils/sanitize";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreProductDescriptionProps {
  description: string;
  maxCollapsedLength?: number;
}

/**
 * Renderiza a descrição comercial do produto com:
 * - Parsing de parágrafos e listas
 * - "Ler mais / Ler menos" com gradiente de fade
 * - Sanitização HTML via DOMPurify
 */
export function StoreProductDescription({
  description,
  maxCollapsedLength = 200,
}: StoreProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const safeDescription = typeof description === "string" ? description : "";
  const isLong = safeDescription.length > maxCollapsedLength;

  const formattedHtml = useMemo(() => {
    let text = safeDescription;

    // Converter padrões de lista (linhas começando com - ou • ou *)
    text = text.replace(/^[\s]*[-•*]\s+(.+)$/gm, "<li>$1</li>");
    // Agrupar <li> consecutivos em <ul>
    text = text.replace(/((?:<li>.+<\/li>\s*)+)/g, "<ul>$1</ul>");

    // Converter \n\n em parágrafos
    const paragraphs = text.split(/\n{2,}/);
    if (paragraphs.length > 1) {
      text = paragraphs
        .map((p) => {
          const trimmed = p.trim();
          if (!trimmed) return "";
          if (trimmed.startsWith("<ul>") || trimmed.startsWith("<li>")) return trimmed;
          return `<p>${trimmed}</p>`;
        })
        .join("");
    } else {
      // Single block — wrap se não tem tags
      if (!text.includes("<p>") && !text.includes("<ul>")) {
        // Converter \n simples em <br>
        text = `<p>${text.replace(/\n/g, "<br/>")}</p>`;
      }
    }

    return sanitizeHtml(text);
  }, [description]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Descrição</h2>
      <div className="relative">
        <div
          className={cn(
            "prose prose-sm text-muted-foreground max-w-none",
            "prose-p:mb-2 prose-ul:my-2 prose-li:my-0.5",
            !expanded && isLong && "max-h-[120px] overflow-hidden"
          )}
          dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-primary hover:text-primary/80 px-0 h-auto font-medium text-sm"
        >
          {expanded ? (
            <>
              Ler menos <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Ler mais <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
