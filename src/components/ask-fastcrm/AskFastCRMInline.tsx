import { useState } from "react";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { AskFastCRMResultPanel } from "./AskFastCRMResultPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SUGGESTED_CHIPS = [
  "Deals at risk",
  "No activity in 14 days",
  "No next step",
  "Closing this month",
  "Stuck in stage",
  "High value deals",
];

export function AskFastCRMInline() {
  const [input, setInput] = useState("");
  const { isLoading, result, ask, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    ask(input.trim());
  };

  const handleChip = (chip: string) => {
    setInput(chip);
    ask(chip);
  };

  const handleItemClick = (item: { link: string }) => {
    navigate(item.link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] rounded-lg border bg-card">
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!result && !isLoading && (
          <div className="flex flex-col items-center text-center py-8 space-y-4">
            <Sparkles className="h-10 w-10 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Ask about your revenue
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Query your pipeline, forecast, and deals — then act on the results.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
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
