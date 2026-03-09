import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Square, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRecordingUpload } from '@/hooks/useRecordingUpload';
import { useMeetingIntelligence } from '@/hooks/useMeetingIntelligence';
import { toast } from 'sonner';

interface Props {
  meetingId: string;
  workspaceId: string | undefined;
  onRecordingComplete?: (recordingId: string) => void;
}

export function MeetingLiveRecorder({ meetingId, workspaceId, onRecordingComplete }: Props) {
  const { t } = useTranslation('meetings');
  const { uploadRecording, isUploading, uploadProgress } = useRecordingUpload(workspaceId);
  const { transcribeRecording, isTranscribing } = useMeetingIntelligence(undefined);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });

      // Audio level monitoring
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, (avg / 128) * 100));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Upload
        const result = await uploadRecording(meetingId, file);
        if (result) {
          toast.success('Gravação carregada! A transcrever...');
          onRecordingComplete?.(result.recordingId);
          
          // Auto-transcribe
          try {
            await transcribeRecording(result.recordingId);
            toast.success('Transcrição concluída!');
          } catch {
            toast.error('Erro na transcrição automática');
          }
        }
      };

      mediaRecorder.start(1000); // 1s chunks
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Não foi possível aceder ao microfone');
    }
  }, [meetingId, uploadRecording, transcribeRecording, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isProcessing = isUploading || isTranscribing;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">🎙️ Gravação ao Vivo</p>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-foreground">{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-red-500" />
            <Progress value={audioLevel} className="flex-1 h-2" />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isUploading ? `A carregar... ${uploadProgress}%` : 'A transcrever...'}
        </div>
      )}

      <div className="flex gap-2">
        {!isRecording ? (
          <Button 
            onClick={startRecording} 
            disabled={isProcessing}
            className="gap-2"
            variant="default"
          >
            <Mic className="h-4 w-4" />
            Iniciar Gravação
          </Button>
        ) : (
          <Button 
            onClick={stopRecording}
            variant="destructive"
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Parar
          </Button>
        )}
      </div>
    </div>
  );
}
