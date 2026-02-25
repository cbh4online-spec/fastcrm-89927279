import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { AskFastCRMResultPanel } from "./AskFastCRMResultPanel";
import { Sparkles, Command } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTED_CHIPS = [
  "Deals at risk",
  "No activity in 14 days",
  "No next step",
  "Closing this month",
  "Stuck in stage",
  "High value deals",
];

const AUTOCOMPLETE_MAP: Record<string, string> = {
  "risk": "Which deals are at risk?",
  "at risk": "Which deals are at risk?",
  "close": "What will close this month?",
  "closing": "What will close this month?",
  "stuck": "Which deals are stuck in stage?",
  "no act": "Deals with no activity in 14 days",
  "inactive": "Deals with no activity in 14 days",
  "next step": "Deals with no next step",
  "high": "Show highest value deals",
  "value": "Show highest value deals",
  "pipeline": "How is my pipeline?",
  "forecast": "What's blocking my forecast?",
  // Automation suggestions — deals
  "remind": "Remind me if no activity for 7 days",
  "alert": "Alert me when deals are at risk",
  "auto-assign": "Auto-assign high value deals",
  "follow-up": "Create follow-up when deal enters Proposal",
  "notify": "Notify me if close date is in 3 days",
  // Automation suggestions — contacts
  "contact reply": "Notify me if contact hasn't replied in 14 days",
  "new contact": "Create task when new contact is created",
  "assign contact": "Assign new contacts to SDR team",
  // Automation suggestions — invoices
  "invoice": "Alert me when invoice is overdue",
  "overdue": "Alert me when invoice is overdue",
  "due date": "Notify me 3 days before invoice due date",
  "fatura": "Alertar-me quando fatura estiver vencida",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskFastCRMDialog({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { isLoading, result, ask, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounce(input, 150);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (debouncedInput.length < 2 || result || isLoading) return [];
    const q = debouncedInput.toLowerCase();
    const matches: string[] = [];
    for (const [key, suggestion] of Object.entries(AUTOCOMPLETE_MAP)) {
      if (key.includes(q) || q.includes(key)) {
        if (!matches.includes(suggestion)) matches.push(suggestion);
      }
      if (matches.length >= 3) break;
    }
    return matches;
  }, [debouncedInput, result, isLoading]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Global keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, clear]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    ask(input.trim());
  }, [input, isLoading, ask]);

  const handleChip = useCallback((chip: string) => {
    setInput(chip);
    ask(chip);
  }, [ask]);

  const handleItemClick = useCallback((item: { link: string }) => {
    onOpenChange(false);
    navigate(item.link);
  }, [onOpenChange, navigate]);

  const handleAction = useCallback((action: any) => {
    executeAction(action);
    if (action.type === "navigate" || action.type === "automation") {
      onOpenChange(false);
    }
  }, [executeAction, onOpenChange]);

  const handleDidYouMean = useCallback((text: string) => {
    setInput(text);
    ask(text);
  }, [ask]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setInput(suggestion);
    ask(suggestion);
  }, [ask]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSuggestionSelect(suggestions[selectedIndex]);
      }
    } else if (result && result.items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < Math.min(result.items.length, 10) - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.min(result.items.length, 10) - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleItemClick(result.items[selectedIndex]);
      }
    }
  }, [suggestions, selectedIndex, result, handleSuggestionSelect, handleItemClick]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden" onKeyDown={handleKeyDown}>
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
              aria-label="Ask FastCRM"
              aria-autocomplete="list"
              aria-activedescendant={selectedIndex >= 0 ? `ask-suggestion-${selectedIndex}` : undefined}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
            />
          </form>
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        {/* Autocomplete suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              className="border-b border-border/50"
              role="listbox"
              aria-label="Autocomplete suggestions"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  id={`ask-suggestion-${i}`}
                  role="option"
                  aria-selected={selectedIndex === i}
                  onClick={() => handleSuggestionSelect(s)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    selectedIndex === i
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {!result && !isLoading && suggestions.length === 0 && (
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
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.2 }}
                >
                  <Skeleton className={cn("h-5 rounded-lg", i === 0 ? "w-3/4" : i === 4 ? "w-2/3" : "w-full")} />
                </motion.div>
              ))}
            </div>
          )}

          {result && (
            <AskFastCRMResultPanel
              result={result}
              onAction={handleAction}
              onItemClick={handleItemClick}
              onDidYouMean={handleDidYouMean}
              pendingAction={pendingAction}
              onConfirmAction={confirmPendingAction}
              onCancelAction={cancelPendingAction}
              selectedItemIndex={selectedIndex}
              onConfirmAutomation={(preview) => {
                confirmAutomation(preview);
              }}
              onCancelAutomation={() => {
                cancelAutomation();
              }}
              isConfirmingAutomation={isConfirmingAutomation}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
