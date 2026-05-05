import { useEffect } from "react";
import { Mic, Square, Send, Trash2, Loader2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVoiceRecorder, formatDuration } from "@/hooks/useVoiceRecorder";
import { useSendVoiceNote } from "@/hooks/useSendVoiceNote";
import { useRef, useState } from "react";

interface VoiceNoteRecorderProps {
  conversationId: string;
  channel: string;
  disabled?: boolean;
}

/**
 * Botão de microfone + UI de gravação inline.
 * - Click → começa a gravar
 * - Stop → mostra preview com play/enviar/eliminar
 * - Enviar → upload para storage e envio via canal (PTT no WhatsApp)
 */
export function VoiceNoteRecorder({
  conversationId,
  channel,
  disabled,
}: VoiceNoteRecorderProps) {
  const { state, durationMs, recording, start, stop, cancel, reset } = useVoiceRecorder();
  const sendVoiceNote = useSendVoiceNote();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const supportedChannel = channel === "whatsapp";

  useEffect(() => {
    if (audioRef.current && recording?.url) {
      audioRef.current.src = recording.url;
    }
  }, [recording?.url]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!recording) return;
    try {
      await sendVoiceNote.mutateAsync({ conversationId, channel, recording });
      reset();
      setIsPlaying(false);
    } catch {
      // toast já tratado
    }
  };

  // Estado idle → só botão de microfone
  if (state === "idle" || state === "error") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={start}
              disabled={disabled || !supportedChannel}
              aria-label="Gravar nota de voz"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {supportedChannel
              ? "Gravar nota de voz"
              : "Notas de voz disponíveis no WhatsApp"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Em gravação
  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400 min-w-[3ch]">
          {formatDuration(durationMs)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-red-500/20"
          onClick={cancel}
          aria-label="Cancelar gravação"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white"
          onClick={stop}
          aria-label="Parar gravação"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </Button>
      </div>
    );
  }

  // Preview (state === "stopped")
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted border px-2 py-1.5">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pausar pré-escuta" : "Pré-escutar"}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <span className="text-xs font-mono tabular-nums text-muted-foreground min-w-[3ch]">
        {formatDuration(durationMs)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          reset();
          setIsPlaying(false);
        }}
        disabled={sendVoiceNote.isPending}
        aria-label="Eliminar gravação"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full bg-green-500 hover:bg-green-600 text-white"
        )}
        onClick={handleSend}
        disabled={sendVoiceNote.isPending}
        aria-label="Enviar nota de voz"
      >
        {sendVoiceNote.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
