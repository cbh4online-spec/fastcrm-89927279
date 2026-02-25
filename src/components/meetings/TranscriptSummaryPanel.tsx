import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Brain, Tag, ListTodo } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MeetingRecording } from "@/hooks/useMeetingTranscript";

interface Props {
  recording: MeetingRecording;
}

export function TranscriptSummaryPanel({ recording }: Props) {
  const { t } = useTranslation("meetings");
  const [open, setOpen] = useState(true);
  const actionItems = (recording.ai_action_items || []) as Array<{ title: string; assignee?: string }>;
  const topics = (recording.ai_topics || []) as string[];

  if (!recording.ai_summary && topics.length === 0 && actionItems.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                {t("transcript_aiSummary")}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary */}
            {recording.ai_summary && (
              <p className="text-sm text-foreground/90 leading-relaxed">{recording.ai_summary}</p>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Tag className="h-3 w-3" />
                  {t("transcript_topics")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {actionItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ListTodo className="h-3 w-3" />
                  {t("transcript_actionItems")}
                </div>
                <div className="space-y-1.5">
                  {actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Checkbox className="mt-0.5" />
                      <span className="flex-1">{item.title}</span>
                      {item.assignee && (
                        <span className="text-xs text-muted-foreground">→ {item.assignee}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
