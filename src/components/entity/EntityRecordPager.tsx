import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EntityListNavigation } from "@/hooks/useEntityListNavigation";

interface EntityRecordPagerProps {
  navigation: EntityListNavigation;
  /** Etiqueta singular, ex.: "Contacto" */
  label?: string;
  /**
   * Interceção antes de navegar (ex.: alterações por guardar).
   * Devolver `false` (ou uma promessa que resolve `false`) cancela a navegação.
   */
  onBeforeNavigate?: (direction: "prev" | "next") => boolean | Promise<boolean>;
  className?: string;
  /** Ativa atalhos Alt + ← / Alt + → */
  enableShortcuts?: boolean;
}

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function EntityRecordPager({
  navigation,
  label = "Registo",
  onBeforeNavigate,
  className,
  enableShortcuts = true,
}: EntityRecordPagerProps) {
  const { hasContext, index, total, prevId, nextId, goPrev, goNext } = navigation;

  const run = async (direction: "prev" | "next") => {
    if (onBeforeNavigate) {
      const ok = await onBeforeNavigate(direction);
      if (!ok) return;
    }
    if (direction === "prev") goPrev();
    else goNext();
  };

  useEffect(() => {
    if (!hasContext || !enableShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowLeft" && prevId) {
        e.preventDefault();
        void run("prev");
      } else if (e.key === "ArrowRight" && nextId) {
        e.preventDefault();
        void run("next");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasContext, enableShortcuts, prevId, nextId, onBeforeNavigate]);

  if (!hasContext) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border bg-background px-1 py-0.5",
        className,
      )}
      role="group"
      aria-label={`Navegar entre ${label.toLowerCase()}s`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              disabled={!prevId}
              aria-label={`${label} anterior`}
              onClick={() => void run("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{prevId ? `${label} anterior (Alt + ←)` : "Já está no primeiro"}</TooltipContent>
      </Tooltip>

      <span className="whitespace-nowrap px-1 text-xs text-muted-foreground tabular-nums">
        <span className="hidden sm:inline">{label} </span>
        {index} de {total}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              disabled={!nextId}
              aria-label={`${label} seguinte`}
              onClick={() => void run("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{nextId ? `${label} seguinte (Alt + →)` : "Já está no último"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
