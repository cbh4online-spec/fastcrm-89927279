import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TranscriptSegment, TranscriptHighlight } from "@/hooks/useMeetingTranscript";
import { CheckCircle2, ListTodo, HelpCircle, AlertTriangle, Lightbulb, Handshake } from "lucide-react";
import { useTranslation } from "react-i18next";

const speakerColorSets = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
];

const highlightConfig: Record<string, { icon: typeof CheckCircle2; colorClass: string }> = {
  decision: { icon: CheckCircle2, colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  action_item: { icon: ListTodo, colorClass: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  question: { icon: HelpCircle, colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  objection: { icon: AlertTriangle, colorClass: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  insight: { icon: Lightbulb, colorClass: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  commitment: { icon: Handshake, colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
};

function formatTimestamp(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface Props {
  segment: TranscriptSegment;
  highlight?: TranscriptHighlight;
  speakerIndex: number;
  id?: string;
}

export function TranscriptSegmentRow({ segment, highlight, speakerIndex, id }: Props) {
  const { t } = useTranslation("meetings");
  const colorSet = speakerColorSets[speakerIndex % speakerColorSets.length];
  const hConfig = highlight ? highlightConfig[highlight.highlight_type] : null;
  const HIcon = hConfig?.icon;

  const roleLabel = segment.speaker_role
    ? t(`transcript_${segment.speaker_role}`, segment.speaker_role)
    : null;

  return (
    <div
      id={id}
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        segment.is_key_moment && "bg-accent/30 border border-accent",
        !segment.is_key_moment && "hover:bg-muted/30"
      )}
    >
      {/* Timestamp */}
      <div className="w-14 flex-shrink-0 text-xs font-mono text-muted-foreground pt-1">
        {formatTimestamp(segment.start_time_ms)}
      </div>

      {/* Speaker avatar */}
      <Avatar className="h-7 w-7 flex-shrink-0">
        <AvatarFallback className={cn("text-xs font-medium", colorSet)}>
          {segment.speaker_label.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{segment.speaker_label}</span>
          {roleLabel && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {roleLabel}
            </Badge>
          )}
          {segment.is_key_moment && !highlight && (
            <Badge variant="secondary" className="text-[10px]">
              {t("transcript_keyMoment")}
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{segment.content}</p>

        {/* Inline highlight card */}
        {highlight && HIcon && hConfig && (
          <div className={cn("flex items-start gap-2 p-2 rounded-md mt-1 border", hConfig.colorClass)}>
            <HIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold">
                {t(`transcript_${highlight.highlight_type}`, highlight.highlight_type)}: {highlight.title}
              </div>
              {highlight.description && (
                <div className="text-xs opacity-80 mt-0.5">{highlight.description}</div>
              )}
              {highlight.assignee && (
                <div className="text-xs opacity-70 mt-0.5">→ {highlight.assignee}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
