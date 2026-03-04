import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CommandInput } from "@/components/command-center/CommandInput";
import { QuickCommandGrid } from "@/components/command-center/QuickCommandGrid";
import { CommandOutput } from "@/components/command-center/CommandOutput";
import { ContextOSDashboard } from "@/components/context-os/ContextOSDashboard";
import { ActionCommandPalette } from "@/components/command-center/ActionCommandPalette";
import { useSlashCommands, SlashCommand } from "@/hooks/useSlashCommands";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Terminal, Clock, Zap, Database } from "lucide-react";
import { useCallback as useCallbackR } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CommandCenterPage() {
  const { currentWorkspace, loading } = useWorkspace();
  const slash = useSlashCommands();
  const ask = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
      <div className="max-w-4xl mx-auto pb-12">
        <Tabs defaultValue="command" className="space-y-6">
          <div className="flex justify-center pt-4">
            <TabsList className="bg-muted/30 border border-border/50">
              <TabsTrigger value="command" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Zap className="h-3.5 w-3.5" /> Comando
              </TabsTrigger>
              <TabsTrigger value="context" className="gap-1.5 text-xs data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
                <Database className="h-3.5 w-3.5" /> Context OS
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="command" className="space-y-8">
            {/* Header */}
            <motion.div
              className="text-center space-y-2"
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
                Pergunte em linguagem natural ou use <kbd className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">/</kbd> para comandos rápidos · <kbd className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">⌘K</kbd> para ações
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

            {/* Quick Commands */}
            {!hasOutput && (
              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.25 }}>
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Comandos Rápidos</h2>
                </div>
                <QuickCommandGrid onSelect={handleQuickCommand} />
              </motion.div>
            )}

            {/* Recent */}
            {recentQueries && recentQueries.length > 0 && !hasOutput && (
              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.25 }}>
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
          </TabsContent>

          <TabsContent value="context">
            <ContextOSDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Command Palette (Cmd+K) */}
      <ActionCommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </DashboardLayout>
  );
}
