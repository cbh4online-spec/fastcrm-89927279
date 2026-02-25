import { cn } from "@/lib/utils";
import { CheckCircle2, ListTodo, HelpCircle, AlertTriangle, Lightbulb, Handshake } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import type { TranscriptHighlight } from "@/hooks/useMeetingTranscript";

const highlightConfig: Record<string, { icon: typeof CheckCircle2; bg: string; text: string }> = {
  decision: { icon: CheckCircle2, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  action_item: { icon: ListTodo, bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  question: { icon: HelpCircle, bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  objection: { icon: AlertTriangle, bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  insight: { icon: Lightbulb, bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  commitment: { icon: Handshake, bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
};

function formatTimestamp(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface Props {
  highlights: TranscriptHighlight[];
  onClickMoment: (highlight: TranscriptHighlight) => void;
}

export function TranscriptKeyMoments({ highlights, onClickMoment }: Props) {
  const { t } = useTranslation("meetings");

  if (highlights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {t("transcript_keyMoments")}
      </h3>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {highlights.map((h) => {
            const config = highlightConfig[h.highlight_type] || highlightConfig.insight;
            const Icon = config.icon;
            return (
              <button
                key={h.id}
                onClick={() => onClickMoment(h)}
                className={cn(
                  "flex-shrink-0 flex items-start gap-2 p-3 rounded-lg border transition-all hover:scale-[1.02] hover:shadow-sm cursor-pointer text-left min-w-[180px] max-w-[240px]",
                  config.bg
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.text)} />
                <div className="min-w-0">
                  <div className={cn("text-[10px] font-medium uppercase tracking-wider", config.text)}>
                    {formatTimestamp(h.start_time_ms)} • {t(`transcript_${h.highlight_type}`, h.highlight_type)}
                  </div>
                  <div className="text-xs font-medium text-foreground mt-0.5 line-clamp-2">
                    {h.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
