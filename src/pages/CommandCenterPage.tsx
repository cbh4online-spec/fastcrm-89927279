import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CommandInput } from "@/components/command-center/CommandInput";
import { QuickCommandGrid } from "@/components/command-center/QuickCommandGrid";
import { CommandOutput } from "@/components/command-center/CommandOutput";
import { useSlashCommands, SlashCommand } from "@/hooks/useSlashCommands";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, Terminal, Clock, Zap } from "lucide-react";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommandCenterPage() {
  const { currentWorkspace, loading } = useWorkspace();
  const slash = useSlashCommands();
  const ask = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();

  const handleTextSubmit = useCallback((query: string) => {
    slash.clearResult();
    ask.ask(query);
  }, [slash, ask]);

  const handleSlashCommand = useCallback((cmd: SlashCommand, args: string) => {
    ask.clear();
    slash.executeCommand(cmd, args);
  }, [slash, ask]);

  const handleQuickCommand = useCallback((cmd: SlashCommand) => {
    ask.clear();
    slash.executeCommand(cmd, "");
  }, [slash, ask]);

  const handleRecentClick = useCallback((question: string) => {
    slash.clearResult();
    ask.ask(question);
  }, [slash, ask]);

  if (loading || !currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const hasOutput = !!slash.result || !!ask.result;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <motion.div
          className="text-center space-y-2 pt-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
            <Zap className="h-3 w-3" />
            Revenue Command Center
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            O que quer saber?
          </h1>
          <p className="text-sm text-muted-foreground">
            Pergunte em linguagem natural ou use <kbd className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">/</kbd> para comandos rápidos
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
        >
          <CommandInput
            onSubmit={handleTextSubmit}
            onSlashCommand={handleSlashCommand}
            isLoading={ask.isLoading || slash.isExecuting}
          />
        </motion.div>

        {/* Output */}
        <CommandOutput
          slashResult={slash.result}
          askResult={ask.result}
          onAction={ask.executeAction}
          onDidYouMean={handleTextSubmit}
          pendingAction={ask.pendingAction}
          onConfirmAction={ask.confirmPendingAction}
          onCancelAction={ask.cancelPendingAction}
          onConfirmAutomation={ask.confirmAutomation}
          onCancelAutomation={ask.cancelAutomation}
          isConfirmingAutomation={ask.isConfirmingAutomation}
        />

        {/* Quick Commands (show when no output) */}
        {!hasOutput && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.25 }}
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">Comandos Rápidos</h2>
            </div>
            <QuickCommandGrid onSelect={handleQuickCommand} />
          </motion.div>
        )}

        {/* Recent Queries */}
        {recentQueries && recentQueries.length > 0 && !hasOutput && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.25 }}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">Recentes</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRecentClick(q.question)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "border border-border/50 bg-muted/30",
                    "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                    "transition-colors truncate max-w-[200px]"
                  )}
                >
                  {q.question}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
