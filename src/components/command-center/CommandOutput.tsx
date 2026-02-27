import { SlashCommandResult } from "@/hooks/useSlashCommands";
import { AskResult, AskResultAction, AskResultItem, AutomationPreview } from "@/hooks/useAskFastCRM";
import { AskFastCRMResultPanel } from "@/components/ask-fastcrm/AskFastCRMResultPanel";
import { Loader2, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Props {
  slashResult?: SlashCommandResult | null;
  askResult?: AskResult | null;
  onAction?: (action: AskResultAction) => void;
  onItemClick?: (item: AskResultItem) => void;
  onDidYouMean?: (text: string) => void;
  pendingAction?: AskResultAction | null;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  onConfirmAutomation?: (preview: AutomationPreview) => void;
  onCancelAutomation?: () => void;
  isConfirmingAutomation?: boolean;
}

export function CommandOutput({
  slashResult,
  askResult,
  onAction,
  onItemClick,
  onDidYouMean,
  pendingAction,
  onConfirmAction,
  onCancelAction,
  onConfirmAutomation,
  onCancelAutomation,
  isConfirmingAutomation,
}: Props) {
  if (!slashResult && !askResult) return null;

  if (slashResult) {
    return (
      <motion.div
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">{slashResult.title}</h3>
        </div>
        {slashResult.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">A processar comando...</span>
          </div>
        ) : (
          <div className="text-sm text-foreground/80 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{slashResult.content}</ReactMarkdown>
          </div>
        )}
      </motion.div>
    );
  }

  if (askResult && onAction) {
    return (
      <motion.div
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <AskFastCRMResultPanel
          result={askResult}
          onAction={onAction}
          onItemClick={onItemClick}
          onDidYouMean={onDidYouMean}
          pendingAction={pendingAction}
          onConfirmAction={onConfirmAction}
          onCancelAction={onCancelAction}
          onConfirmAutomation={onConfirmAutomation}
          onCancelAutomation={onCancelAutomation}
          isConfirmingAutomation={isConfirmingAutomation}
        />
      </motion.div>
    );
  }

  return null;
}
