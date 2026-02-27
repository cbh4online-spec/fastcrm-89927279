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
import { useTranslation } from "react-i18next";

// AUTOCOMPLETE_MAP moved inside component as useMemo to support i18n

interface AskFastCRMInlineProps {
  initialQuery?: string;
  fullPage?: boolean;
}

export function AskFastCRMInline({ initialQuery, fullPage }: AskFastCRMInlineProps) {
  const { t } = useTranslation('ask');
  const [input, setInput] = useState("");
  const { isLoading, result, ask, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const { data: recentQueries } = useRecentAskQueries();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQueryHandled = useRef(false);

  const debouncedInput = useDebounce(input, 150);

  const suggestedChips = useMemo(() => [
    t('chipsDealsAtRisk'),
    t('chipsNoActivity'),
    t('chipsNoNextStep'),
    t('chipsClosingThisMonth'),
    t('chipsStuckInStage'),
    t('chipsHighValue'),
  ], [t]);

  const autocompleteMap = useMemo<Record<string, string>>(() => ({
    "risk": t('autoRisk'), "risco": t('autoRisk'), "riesgo": t('autoRisk'), "risque": t('autoRisk'),
    "at risk": t('autoRisk'), "em risco": t('autoRisk'), "en riesgo": t('autoRisk'), "à risque": t('autoRisk'),
    "close": t('autoClose'), "closing": t('autoClose'), "fechar": t('autoClose'), "cerrar": t('autoClose'), "clôture": t('autoClose'),
    "stuck": t('autoStuck'), "parado": t('autoStuck'), "estancado": t('autoStuck'), "bloqué": t('autoStuck'),
    "no act": t('autoNoActivity'), "inactive": t('autoNoActivity'), "sem act": t('autoNoActivity'), "sin act": t('autoNoActivity'), "aucune act": t('autoNoActivity'),
    "next step": t('autoNextStep'), "próximo passo": t('autoNextStep'), "próximo paso": t('autoNextStep'), "prochaine étape": t('autoNextStep'),
    "high": t('autoHighValue'), "value": t('autoHighValue'), "valor": t('autoHighValue'), "valeur": t('autoHighValue'),
    "pipeline": t('autoPipeline'),
    "forecast": t('autoForecast'), "previsão": t('autoForecast'), "previsión": t('autoForecast'), "prévision": t('autoForecast'),
    "remind": t('autoRemind'), "lembrar": t('autoRemind'), "recordar": t('autoRemind'), "rappeler": t('autoRemind'),
    "alert": t('autoAlert'), "alertar": t('autoAlert'), "alerter": t('autoAlert'),
    "follow-up": t('autoFollowUp'), "seguimento": t('autoFollowUp'), "seguimiento": t('autoFollowUp'), "suivi": t('autoFollowUp'),
    "notify": t('autoNotify'), "notificar": t('autoNotify'), "notifier": t('autoNotify'),
    "invoice": t('autoInvoice'), "fatura": t('autoInvoice'), "factura": t('autoInvoice'), "facture": t('autoInvoice'),
    "overdue": t('autoInvoice'), "vencida": t('autoInvoice'), "vencido": t('autoInvoice'), "retard": t('autoInvoice'),
  }), [t]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (debouncedInput.length < 2 || result || isLoading) return [];
    const q = debouncedInput.toLowerCase();
    const matches: string[] = [];
    for (const [key, suggestion] of Object.entries(autocompleteMap)) {
      if (key.includes(q) || q.includes(key)) {
        if (!matches.includes(suggestion)) matches.push(suggestion);
      }
      if (matches.length >= 3) break;
    }
    return matches;
  }, [debouncedInput, result, isLoading, autocompleteMap]);

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
          <h3 className="font-semibold text-sm">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('subtitle')}
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
                {t('emptyTitle')}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {t('emptyDescription')}
              </p>
            </div>

            {/* Recent queries */}
            {recentQueries && recentQueries.length > 0 && (
              <div className="space-y-2 w-full max-w-md">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('recent')}
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
                {t('suggested')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedChips.map((chip) => (
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
            placeholder={t('placeholder')}
            disabled={isLoading}
            aria-label={t('title')}
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
