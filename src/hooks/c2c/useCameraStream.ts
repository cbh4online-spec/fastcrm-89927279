import { useState, useEffect, useCallback, useRef } from "react";

interface UseCameraStreamOptions {
  enabled?: boolean;
  audio?: boolean;
}

interface UseCameraStreamReturn {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  cameraError: string | null;
  isInIframe: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  toggleMic: () => void;
}

export function useCameraStream({ enabled = false, audio = true }: UseCameraStreamOptions = {}): UseCameraStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(audio);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (isInIframe) {
        setCameraError("O preview do Lovable bloqueia a câmara por segurança. Publica a app para testar com câmara real.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("O teu browser não suporta acesso à câmara.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: micOn,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraOn(true);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setCameraError("Permissão da câmara negada. Verifica as definições do browser e tenta novamente.");
      } else if (name === "NotFoundError") {
        setCameraError("Nenhuma câmara encontrada no dispositivo.");
      } else if (name === "NotReadableError") {
        setCameraError("Câmara em uso por outra aplicação. Fecha-a e tenta novamente.");
      } else {
        setCameraError("Não foi possível aceder à câmara. Verifica as permissões.");
      }
      setCameraOn(false);
    }
  }, [micOn, isInIframe]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setCameraOn(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicOn((prev) => !prev);
    }
  }, []);

  // Auto-start when enabled
  useEffect(() => {
    if (enabled && !streamRef.current) {
      startCamera();
    }
  }, [enabled, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { stream, cameraOn, micOn, cameraError, isInIframe, startCamera, stopCamera, toggleMic };
}
