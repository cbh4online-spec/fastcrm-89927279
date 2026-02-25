import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { AskFastCRMResultPanel } from "./AskFastCRMResultPanel";
import { Sparkles, Loader2, Command } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const SUGGESTED_CHIPS = [
  "Deals at risk",
  "Closing this month",
  "Pipeline summary",
  "Inactive deals",
  "No next step",
  "High value deals",
  "Forecast",
  "Stage bottlenecks",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskFastCRMDialog({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const { isLoading, result, ask, clear, executeAction } = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut ⌘J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      clear();
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, clear]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    ask(input.trim());
  };

  const handleChip = (chip: string) => {
    setInput(chip);
    ask(chip);
  };

  const handleItemClick = (item: { link: string }) => {
    onOpenChange(false);
    navigate(item.link);
  };

  const handleAction = (action: any) => {
    executeAction(action);
    if (action.type === "navigate" || action.type === "automation") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Ask FastCRM</DialogTitle>

        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex-1 flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your revenue..."
              disabled={isLoading}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
            />
          </form>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <Command className="h-2.5 w-2.5" />J
          </kbd>
        </div>

        {/* Content area */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {!result && !isLoading && (
            <div className="space-y-4">
              {/* Recent queries */}
              {recentQueries && recentQueries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleChip(q.question)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium",
                          "border border-border/60 bg-muted/40",
                          "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                          "transition-colors"
                        )}
                      >
                        {q.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Suggested
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChip(chip)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium",
                        "border border-border/60 bg-muted/30",
                        "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                        "transition-colors"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && !result && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-2/3 rounded-lg" />
            </div>
          )}

          {result && (
            <AskFastCRMResultPanel
              result={result}
              onAction={handleAction}
              onItemClick={handleItemClick}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
