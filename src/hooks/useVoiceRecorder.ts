import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type VoiceRecorderState = "idle" | "recording" | "paused" | "stopped" | "error";

export interface VoiceRecording {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
}

const PREFERRED_MIME_TYPES = [
  "audio/ogg;codecs=opus",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

const MAX_DURATION_MS = 5 * 60 * 1000; // 5 min hard cap

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const mimeRef = useRef<string>("");

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanupStream();
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setDurationMs(0);
    setState("idle");
    chunksRef.current = [];
    recorderRef.current = null;
  }, [cleanupStream, recording?.url]);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (recording?.url) URL.revokeObjectURL(recording.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (state === "recording") return;
    const mimeType = pickMimeType();
    if (mimeType === null) {
      toast.error("O navegador não suporta gravação de áudio");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      mimeRef.current = recorder.mimeType || mimeType || "audio/webm";
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        const url = URL.createObjectURL(blob);
        const dur = Date.now() - startTsRef.current;
        setRecording({ blob, url, durationMs: dur, mimeType: mimeRef.current });
        setDurationMs(dur);
        setState("stopped");
        cleanupStream();
      };

      recorder.start(250);
      startTsRef.current = Date.now();
      setDurationMs(0);
      setState("recording");

      tickRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTsRef.current;
        setDurationMs(elapsed);
        if (elapsed >= MAX_DURATION_MS) {
          recorder.stop();
        }
      }, 100);
    } catch (err: any) {
      console.error("[useVoiceRecorder] getUserMedia failed", err);
      const msg =
        err?.name === "NotAllowedError"
          ? "Permissão de microfone negada"
          : err?.name === "NotFoundError"
            ? "Nenhum microfone encontrado"
            : "Não foi possível aceder ao microfone";
      toast.error(msg);
      setState("error");
      cleanupStream();
    }
  }, [cleanupStream, state]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const cancel = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      r.onstop = null as any;
      r.stop();
    }
    reset();
  }, [reset]);

  return {
    state,
    durationMs,
    recording,
    start,
    stop,
    cancel,
    reset,
  };
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
