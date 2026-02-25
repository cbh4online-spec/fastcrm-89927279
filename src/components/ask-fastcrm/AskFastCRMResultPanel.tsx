import { AskResult, AskResultAction, AskResultItem, AutomationPreview } from "@/hooks/useAskFastCRM";
import { AskAutomationPreview } from "./AskAutomationPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, TrendingDown, Minus, ListTodo, Eye, Zap, Bookmark, ArrowRight, UserPlus, Lightbulb, AlertTriangle, MoreHorizontal, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = {
  ListTodo,
  Eye,
  Zap,
  Bookmark,
  ArrowRight,
  UserPlus,
};

const MAX_VISIBLE_ITEMS = 10;
const MAX_VISIBLE_ACTIONS = 3;

const EMPTY_CHIPS = [
  { label: "No activity 7d", query: "Deals with no activity in 7 days" },
  { label: "No activity 14d", query: "Deals with no activity in 14 days" },
  { label: "No activity 30d", query: "Deals with no activity in 30 days" },
];

interface Props {
  result: AskResult;
  onAction: (action: AskResultAction) => void;
  onItemClick?: (item: AskResultItem) => void;
  onDidYouMean?: (text: string) => void;
  pendingAction?: AskResultAction | null;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  selectedItemIndex?: number;
  onConfirmAutomation?: (preview: AutomationPreview) => void;
  onCancelAutomation?: () => void;
  isConfirmingAutomation?: boolean;
}

export function AskFastCRMResultPanel({ result, onAction, onItemClick, onDidYouMean, pendingAction, onConfirmAction, onCancelAction, selectedItemIndex = -1, onConfirmAutomation, onCancelAutomation, isConfirmingAutomation }: Props) {
  const TrendIcon =
    result.metric?.trend === "up"
      ? TrendingUp
      : result.metric?.trend === "down"
        ? TrendingDown
        : Minus;

  const visibleItems = result.items.slice(0, MAX_VISIBLE_ITEMS);
  const hasMoreItems = result.items.length > MAX_VISIBLE_ITEMS;
  const visibleActions = result.actions.slice(0, MAX_VISIBLE_ACTIONS);
  const overflowActions = result.actions.slice(MAX_VISIBLE_ACTIONS);

  const isEmptyResult = result.items.length === 0 && !result.did_you_mean?.length && !result.metric && !result.automation_preview;
  const isAutomationIntent = result.intent === "create_automation_rule" && !!result.automation_preview;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Header */}
      <div>
        <p className="font-semibold text-base text-foreground">
          {result.answer?.headline || (result as any).header || ""}
        </p>
        {result.answer?.subtext && (
          <p className="text-sm text-muted-foreground mt-0.5">{result.answer.subtext}</p>
        )}
      </div>

      {/* Automation preview */}
      {isAutomationIntent && result.automation_preview && (
        <AskAutomationPreview
          preview={result.automation_preview}
          onConfirm={(preview) => onConfirmAutomation?.(preview)}
          onCancel={() => onCancelAutomation?.()}
          isConfirming={isConfirmingAutomation}
        />
      )}

      {/* Bulk action confirmation overlay */}
      {pendingAction && (
        <motion.div
          className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">
                This will affect {pendingAction.payload?.deal_ids?.length || 0} items
              </p>
              {/* Preview first 5 items */}
              {result.items.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {result.items.slice(0, 5).map((item) => (
                    <li key={item.id} className="text-xs text-muted-foreground truncate">
                      • {item.title}
                    </li>
                  ))}
                  {result.items.length > 5 && (
                    <li className="text-xs text-muted-foreground">
                      …and {result.items.length - 5} more
                    </li>
                  )}
                </ul>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                {pendingAction.label} — confirm to proceed.
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="default" onClick={onConfirmAction} className="gap-1.5">
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelAction}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty results state */}
      {isEmptyResult && (
        <motion.div
          className="flex flex-col items-center text-center py-6 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <SearchX className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nothing found for that query.</p>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Try:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EMPTY_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => onDidYouMean?.(chip.query)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "border border-border/60 bg-muted/30",
                    "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                    "transition-colors"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* "Did you mean?" chips */}
      {result.did_you_mean && result.did_you_mean.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <p className="text-xs text-muted-foreground font-medium">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {result.did_you_mean.map((text) => (
              <button
                key={text}
                onClick={() => onDidYouMean?.(text)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium",
                  "border border-border/60 bg-muted/30",
                  "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                  "transition-colors"
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Metric card */}
      {result.metric && (
        <motion.div
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <div>
            <p className="text-xs text-muted-foreground">{result.metric.label}</p>
            <p className="text-xl font-bold text-foreground">{result.metric.value}</p>
          </div>
          <TrendIcon
            className={cn(
              "h-5 w-5 ml-auto",
              result.metric.trend === "up" && "text-green-500",
              result.metric.trend === "down" && "text-destructive",
              result.metric.trend === "neutral" && "text-muted-foreground"
            )}
          />
        </motion.div>
      )}

      {/* Items list */}
      {visibleItems.length > 0 && (
        <motion.div
          className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/50"
          role="listbox"
          aria-label="Results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {visibleItems.map((item, idx) => (
            <motion.button
              key={item.id}
              id={`ask-result-${idx}`}
              role="option"
              aria-selected={selectedItemIndex === idx}
              onClick={() => onItemClick?.(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                selectedItemIndex === idx
                  ? "bg-accent"
                  : "hover:bg-muted/40"
              )}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.03, duration: 0.15 }}
            >
              {item.health_label && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 shrink-0",
                    item.health_label === "AT_RISK" && "border-destructive/50 text-destructive",
                    item.health_label === "WATCH" && "border-amber-500/50 text-amber-600",
                    item.health_label === "HEALTHY" && "border-green-500/50 text-green-600"
                  )}
                >
                  {item.health_label === "AT_RISK" ? "Risk" : item.health_label === "WATCH" ? "Watch" : "Ok"}
                </Badge>
              )}
              {item.stage && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  {item.stage}
                </Badge>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                )}
              </div>
              {item.value !== undefined && item.value > 0 && (
                <span className="text-sm font-medium text-foreground shrink-0">
                  €{item.value.toLocaleString()}
                </span>
              )}
            </motion.button>
          ))}
          {hasMoreItems && (
            <button
              onClick={() => onAction({ id: "view_all", label: "View all", icon: "Eye", type: "navigate", payload: { link: "/dashboard/opportunities" } })}
              className="w-full px-3 py-2 text-sm text-primary hover:bg-muted/40 transition-colors text-center font-medium"
            >
              View all ({result.items.length})
            </button>
          )}
        </motion.div>
      )}

      {/* Auto-suggestion */}
      {result.suggestion && (
        <motion.div
          className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
        >
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{result.suggestion.text}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onAction(result.suggestion!.action)}
            >
              {result.suggestion.action.label}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Actions — max 3 visible + overflow dropdown */}
      {result.actions.length > 0 && (
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
        >
          {visibleActions.map((action) => {
            const Icon = iconMap[action.icon] || Eye;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => onAction(action)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            );
          })}
          {overflowActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  More…
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflowActions.map((action) => {
                  const Icon = iconMap[action.icon] || Eye;
                  return (
                    <DropdownMenuItem key={action.id} onClick={() => onAction(action)} className="gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
