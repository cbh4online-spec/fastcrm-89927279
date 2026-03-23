import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./AudioPlayer";
import { useTTS } from "@/hooks/useVoice";

interface TTSButtonProps {
  text: string;
  sourceType?: "summary" | "copilot" | "custom";
  sourceId?: string;
  label?: string;
  compact?: boolean;
}

export function TTSButton({
  text,
  sourceType = "custom",
  sourceId,
  label = "Ouvir",
  compact = false,
}: TTSButtonProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | undefined>();
  const tts = useTTS();

  const handleSpeak = async () => {
    if (audioUrl) return;
    const result = await tts.mutateAsync({ text, sourceType, sourceId });
    setAudioUrl(result.audio_url);
    setDuration(result.duration_seconds);
  };

  if (audioUrl) {
    return (
      <AudioPlayer
        audioUrl={audioUrl}
        duration={duration}
        compact={compact}
        autoPlay
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSpeak}
      disabled={tts.isPending}
      className="gap-2"
    >
      {tts.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {tts.isPending ? "A gerar áudio..." : label}
    </Button>
  );
}
