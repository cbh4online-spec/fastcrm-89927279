import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommandHistoryItem } from "@/hooks/useCommandOrchestrator";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface CommandHistoryTimelineProps {
  history: CommandHistoryItem[];
  onReplay: (command: string) => void;
}

const intentEmoji: Record<string, string> = {
  "prepare-meeting": "📅",
  "analyze-company": "🏢",
  "analyze-deal": "📊",
  "win-deal": "🏆",
  "send-followup": "✉️",
  "generate-proposal": "📝",
  "pipeline-status": "🔄",
  general: "💡",
};

export function CommandHistoryTimeline({ history, onReplay }: CommandHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (history.length <= 1) return null;

  const items = expanded ? history.slice(1, 11) : history.slice(1, 4);

  return (
    <div className="space-y-3 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Histórico de Sessão
          </p>
        </div>
        {history.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 text-[10px] gap-1 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Menos" : `+${history.length - 4} mais`}
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {items.map((item, i) => {
              const emoji = intentEmoji[item.response.intent] || intentEmoji.general;
              const confidence = item.response.result?.confidence;
              const summary = item.response.result?.summary;
              const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: pt });

              return (
                <motion.div
                  key={`${item.command}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative pl-6 group"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-2.5 w-[15px] h-[15px] rounded-full border-2 border-border bg-background flex items-center justify-center text-[8px]">
                    {emoji}
                  </div>

                  <Card className="border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">
                            {item.command}
                          </p>
                          {summary && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                            {confidence !== undefined && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] py-0",
                                  confidence >= 80 ? "text-emerald-600 border-emerald-500/30" :
                                  confidence >= 50 ? "text-amber-600 border-amber-500/30" :
                                  "text-muted-foreground"
                                )}
                              >
                                {confidence}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReplay(item.command)}
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Re-executar"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
