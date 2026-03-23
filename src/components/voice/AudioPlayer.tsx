import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { AudioPlayerState } from "@/types/voice";

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  duration?: number;
  compact?: boolean;
  autoPlay?: boolean;
  onPlay?: () => void;
  onEnd?: () => void;
}

export function AudioPlayer({
  audioUrl,
  title,
  duration,
  compact = false,
  autoPlay = false,
  onPlay,
  onEnd,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioPlayerState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setState("loading");
    const handleCanPlay = () => {
      if (state === "loading") setState("idle");
    };
    const handlePlay = () => {
      setState("playing");
      onPlay?.();
    };
    const handlePause = () => setState("paused");
    const handleEnded = () => {
      setState("idle");
      setCurrentTime(0);
      onEnd?.();
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration))
        setTotalDuration(audio.duration);
    };
    const handleError = () => setState("error");

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("error", handleError);

    if (autoPlay) audio.play().catch(() => setState("error"));

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state === "playing") {
      audio.pause();
    } else {
      audio.play().catch(() => setState("error"));
    }
  };

  const handleSeek = (values: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = values[0];
    setCurrentTime(values[0]);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (values: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = values[0];
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => setState("error"));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
        <span>Erro ao carregar áudio.</span>
        <button
          onClick={() => {
            setState("idle");
            audioRef.current?.load();
          }}
          className="underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={togglePlay}
        >
          {state === "loading" ? (
            <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : state === "playing" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        <Slider
          value={[currentTime]}
          max={totalDuration || 1}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
          aria-label="Progresso do áudio"
        />
        <span className="text-xs tabular-nums text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-card border rounded-xl">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {title && (
        <p className="text-sm font-medium text-foreground">{title}</p>
      )}

      <Slider
        value={[currentTime]}
        max={totalDuration || 1}
        step={0.1}
        onValueChange={handleSeek}
        className="w-full"
        aria-label="Progresso do áudio"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={restart}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={togglePlay}
          disabled={state === "loading"}
        >
          {state === "loading" ? (
            <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : state === "playing" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        <span className="text-sm tabular-nums text-muted-foreground min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
