import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { AskFastCRMResultPanel } from "./AskFastCRMResultPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
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
  "remind": "Remind me if no activity for 7 days",
  "alert": "Alert me when deals are at risk",
  "follow-up": "Create follow-up when deal enters Proposal",
  "notify": "Notify me if close date is in 3 days",
  "invoice": "Alert me when invoice is overdue",
  "overdue": "Alert me when invoice is overdue",
};

interface AskFastCRMInlineProps {
  initialQuery?: string;
  fullPage?: boolean;
}

export function AskFastCRMInline({ initialQuery, fullPage }: AskFastCRMInlineProps) {
  const [input, setInput] = useState("");
  const { isLoading, result, ask, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQueryHandled = useRef(false);

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

  // Auto-submit initialQuery on mount
  useEffect(() => {
    if (initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      setInput(initialQuery);
      setTimeout(() => ask(initialQuery), 150);
    }
  }, [initialQuery, ask]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    ask(input.trim());
  }, [input, isLoading, ask]);

  const handleChip = useCallback((chip: string) => {
    setInput(chip);
    ask(chip);
  }, [ask]);

  const handleItemClick = useCallback((item: { link: string }) => {
    navigate(item.link);
  }, [navigate]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setInput(suggestion);
    ask(suggestion);
  }, [ask]);

  return (
    <div className={cn(
      "flex flex-col rounded-lg border bg-card",
      fullPage ? "h-[calc(100vh-5rem)]" : "h-[calc(100vh-16rem)]"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-sm">Ask FastCRM</h3>
          <p className="text-xs text-muted-foreground">
            Revenue intelligence at your command.
          </p>
        </div>
      </div>

      {/* Autocomplete suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            className="border-b border-border/50 mx-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionSelect(s)}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors rounded"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!result && !isLoading && suggestions.length === 0 && (
          <div className="flex flex-col items-center text-center py-8 space-y-6">
            <Sparkles className="h-10 w-10 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Ask about your revenue
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Query your pipeline, forecast, and deals — then act on the results.
              </p>
            </div>

            {/* Recent queries */}
            {recentQueries && recentQueries.length > 0 && (
              <div className="space-y-2 w-full max-w-md">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Recent
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
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
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Suggested
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
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
          <div className="space-y-3 py-8">
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
            onAction={(action) => {
              executeAction(action);
            }}
            onItemClick={handleItemClick}
            onDidYouMean={(text) => {
              setInput(text);
              ask(text);
            }}
            pendingAction={pendingAction}
            onConfirmAction={confirmPendingAction}
            onCancelAction={cancelPendingAction}
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

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your revenue..."
            disabled={isLoading}
            aria-label="Ask FastCRM"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
