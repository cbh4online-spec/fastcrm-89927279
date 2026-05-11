import { useState } from "react";
import { Languages, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslateMessage } from "@/hooks/useTranslateMessage";
import { cn } from "@/lib/utils";

interface InlineMessageTranslatorProps {
  text: string;
  className?: string;
  defaultTargetLanguage?: string;
}

const LANGS: { code: string; label: string }[] = [
  { code: "pt-PT", label: "Português (PT)" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
];

export function InlineMessageTranslator({
  text,
  className,
  defaultTargetLanguage = "pt-PT",
}: InlineMessageTranslatorProps) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [target, setTarget] = useState<string>(defaultTargetLanguage);
  const translate = useTranslateMessage();

  if (!text || text.trim().length < 2) return null;

  const handleTranslate = async (lang: string) => {
    setTarget(lang);
    const res = await translate.mutateAsync({ text, target_language: lang });
    setTranslated(res.translated_text);
  };

  return (
    <div className={cn("mt-2 pt-2 border-t border-border/40", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => handleTranslate(target)}
          disabled={translate.isPending}
        >
          {translate.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Languages className="w-3 h-3" />
          )}
          {translated ? "Traduzir novamente" : "Traduzir"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] gap-0.5 text-muted-foreground"
              disabled={translate.isPending}
            >
              {target}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            {LANGS.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => handleTranslate(l.code)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {translated && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setTranslated(null)}
          >
            ocultar
          </button>
        )}
      </div>
      {translated && (
        <p className="mt-1.5 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 italic">
          {translated}
        </p>
      )}
    </div>
  );
}
