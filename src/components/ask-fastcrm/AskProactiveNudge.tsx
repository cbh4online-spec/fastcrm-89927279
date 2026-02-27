import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { useProactiveAskSuggestions, ProactiveSuggestion } from "@/hooks/useProactiveAskSuggestions";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle,
  Clock,
};

interface Props {
  onAskQuery: (query: string) => void;
}

export function AskProactiveNudge({ onAskQuery }: Props) {
  const { t } = useTranslation("ask");
  const { data: suggestions } = useProactiveAskSuggestions();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("ask-proactive-dismissed");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("ask-proactive-dismissed", JSON.stringify([...next]));
  };

  const visible = suggestions?.filter((s) => !dismissed.has(s.id)) || [];
  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      {visible.map((suggestion) => {
        const Icon = ICON_MAP[suggestion.icon] || AlertTriangle;
        return (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{suggestion.message}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-primary hover:text-primary"
                    onClick={() => onAskQuery(suggestion.askQuery)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("nudgeAskButton")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => dismiss(suggestion.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
