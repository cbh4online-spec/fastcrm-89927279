import { useState, useEffect, useRef, useCallback } from "react";
import { CommandInput } from "./CommandInput";
import { CommandOutput } from "./CommandOutput";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useSlashCommands, SlashCommand, SlashCommandResult } from "@/hooks/useSlashCommands";
import { useRecentAskQueries } from "@/hooks/useRecentAskQueries";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Quais deals estão parados há mais de 7 dias?",
  "Resumo de revenue desta semana...",
  "Leads sem resposta nos últimos 3 dias",
  "Qual é o meu pipeline total?",
];

export function AIQuestionBox() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [slashResult, setSlashResult] = useState<SlashCommandResult | null>(null);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { ask, result, isLoading, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const { executeCommand } = useSlashCommands();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback((query: string) => {
    setSlashResult(null);
    ask(query);
  }, [ask]);

  const handleSlashCommand = useCallback((cmd: SlashCommand, args: string) => {
    executeCommand(cmd, args);
    setSlashResult({ command: cmd.command, title: cmd.label, content: "A processar...", loading: true });
  }, [executeCommand]);

  const handleClose = useCallback(() => {
    clear();
    setSlashResult(null);
  }, [clear]);

  // Keyboard: Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (result || slashResult)) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [result, slashResult, handleClose]);

  const showOutput = !!(result || slashResult || isLoading);

  return (
    <motion.div
      ref={containerRef}
      className="w-full space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        className={cn(
          "rounded-2xl p-[1px] transition-all duration-300",
          focused
            ? "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
            : "bg-gradient-to-r from-indigo-500/40 to-purple-500/40"
        )}
      >
        <div className="bg-background rounded-2xl">
          <CommandInput
            onSubmit={handleSubmit}
            onSlashCommand={handleSlashCommand}
            isLoading={isLoading}
          />
        </div>
      </div>

      <AnimatePresence>
        {showOutput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CommandOutput
              slashResult={slashResult}
              askResult={result}
              onAction={executeAction}
              onItemClick={(item) => navigate(item.link)}
              pendingAction={pendingAction}
              onConfirmAction={confirmPendingAction}
              onCancelAction={cancelPendingAction}
              onConfirmAutomation={confirmAutomation}
              onCancelAutomation={cancelAutomation}
              isConfirmingAutomation={isConfirmingAutomation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
