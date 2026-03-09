import { useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search, Sparkles, Loader2, Clock, Users, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMeetingTranscript, TranscriptHighlight } from "@/hooks/useMeetingTranscript";
import { TranscriptSummaryPanel } from "./TranscriptSummaryPanel";
import { TranscriptKeyMoments } from "./TranscriptKeyMoments";
import { TranscriptSegmentRow } from "./TranscriptSegmentRow";
import { RecordingUploadCard } from "./RecordingUploadCard";
import { RecordingCrmLinks } from "./RecordingCrmLinks";
import { MeetingIntelligencePanel } from "./MeetingIntelligencePanel";
import { MeetingLiveRecorder } from "./MeetingLiveRecorder";

interface Props {
  meetingId: string;
  meetingTitle?: string;
  workspaceId?: string;
  onBack?: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const sentimentConfig: Record<string, { label: string; color: string }> = {
  positive: { label: "Positive", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  neutral: { label: "Neutral", color: "bg-muted text-muted-foreground" },
  negative: { label: "Negative", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  mixed: { label: "Mixed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

export function TranscriptViewer({ meetingId, meetingTitle, workspaceId, onBack }: Props) {
  const { t } = useTranslation("meetings");
  const { recording, segments, highlights, crmLinks, isLoading, analyzeTranscript, isAnalyzing } = useMeetingTranscript(meetingId);

  const [search, setSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState("all");
  const [keyMomentsOnly, setKeyMomentsOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Unique speakers
  const speakers = useMemo(() => {
    const set = new Set(segments.map((s) => s.speaker_label));
    return Array.from(set);
  }, [segments]);

  // Speaker index map for colors
  const speakerIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    speakers.forEach((s, i) => { map[s] = i; });
    return map;
  }, [speakers]);

  // Highlight lookup by segment_id
  const highlightBySegment = useMemo(() => {
    const map: Record<string, TranscriptHighlight> = {};
    highlights.forEach((h) => {
      if (h.segment_id) map[h.segment_id] = h;
    });
    return map;
  }, [highlights]);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    return segments.filter((seg) => {
      if (speakerFilter !== "all" && seg.speaker_label !== speakerFilter) return false;
      if (keyMomentsOnly && !seg.is_key_moment) return false;
      if (search && !seg.content.toLowerCase().includes(search.toLowerCase()) && !seg.speaker_label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [segments, speakerFilter, keyMomentsOnly, search]);

  const scrollToSegment = useCallback((highlight: TranscriptHighlight) => {
    if (!highlight.segment_id) return;
    const el = document.getElementById(`seg-${highlight.segment_id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const sentiment = recording?.ai_sentiment ? sentimentConfig[recording.ai_sentiment] : null;
  const canAnalyze = recording && segments.length > 0 && !recording.ai_summary;
  const canReanalyze = recording && segments.length > 0 && !!recording.ai_summary;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showUploadCard = !recording || !recording.file_url;

  if (!recording) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("transcript_backToMeeting")}
          </Button>
        )}
        <RecordingUploadCard meetingId={meetingId} workspaceId={workspaceId} />
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {t("transcript_noTranscript")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 mb-1">
              <ArrowLeft className="h-4 w-4" />
              {t("transcript_backToMeeting")}
            </Button>
          )}
          <h2 className="text-xl font-bold text-foreground">
            {meetingTitle || t("transcript_title")}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("transcript_duration")}: {formatDuration(recording.duration_seconds)}
            </span>
            {recording.speaker_count && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recording.speaker_count} {t("transcript_speakers")}
              </span>
            )}
            {sentiment && (
              <Badge className={cn("text-xs", sentiment.color)} variant="outline">
                <ThumbsUp className="h-3 w-3 mr-1" />
                {t(`transcript_sentiment${recording.ai_sentiment!.charAt(0).toUpperCase() + recording.ai_sentiment!.slice(1)}`)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {t(`transcript_${recording.transcription_status}`)}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          {canAnalyze && (
            <Button onClick={analyzeTranscript} disabled={isAnalyzing} className="gap-2">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("transcript_analyze")}
            </Button>
          )}
          {canReanalyze && (
            <Button variant="outline" onClick={analyzeTranscript} disabled={isAnalyzing} className="gap-2">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("transcript_reanalyze")}
            </Button>
          )}
        </div>
      </div>

      {/* Upload card when no file */}
      {showUploadCard && (
        <RecordingUploadCard meetingId={meetingId} workspaceId={workspaceId} />
      )}

      {/* CRM Links */}
      {crmLinks.length > 0 && <RecordingCrmLinks links={crmLinks} />}

      {/* AI Summary Panel */}
      <TranscriptSummaryPanel recording={recording} />

      {/* Meeting Intelligence */}
      <MeetingIntelligencePanel recordingId={recording.id} />

      {/* Live Recorder */}
      {!recording.file_url && (
        <MeetingLiveRecorder meetingId={meetingId} workspaceId={workspaceId} />
      )}

      {/* Key Moments Timeline */}
      <TranscriptKeyMoments highlights={highlights} onClickMoment={scrollToSegment} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-muted/30 border border-border/30">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("transcript_search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Select value={speakerFilter} onValueChange={setSpeakerFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("transcript_filterSpeaker")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("transcript_filterAll")}</SelectItem>
            {speakers.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="key-only" checked={keyMomentsOnly} onCheckedChange={setKeyMomentsOnly} />
          <Label htmlFor="key-only" className="text-xs cursor-pointer">
            {t("transcript_showKeyOnly")}
          </Label>
        </div>
      </div>

      {/* Segments */}
      {filteredSegments.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {t("transcript_noSegments")}
        </div>
      ) : (
        <ScrollArea className="h-[500px]" ref={scrollRef}>
          <div className="space-y-1 pr-4">
            {filteredSegments.map((seg) => (
              <TranscriptSegmentRow
                key={seg.id}
                id={`seg-${seg.id}`}
                segment={seg}
                highlight={highlightBySegment[seg.id]}
                speakerIndex={speakerIndexMap[seg.speaker_label] || 0}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
