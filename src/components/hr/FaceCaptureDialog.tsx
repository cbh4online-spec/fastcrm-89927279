import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, XCircle, Loader2, RefreshCw, ScanFace } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Employee = { id: string; full_name: string; avatar_url?: string | null };

type FaceVerifyResult = {
  success: boolean;
  verified: boolean;
  employee_name?: string;
  action?: string;
  recorded_at?: string;
  error?: string;
  overtime_alert?: { exceeded: boolean; overtime_minutes: number };
};

type VerifyState = "idle" | "camera" | "captured" | "verifying" | "success" | "error";

interface FaceCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  /** If provided, skips employee selection */
  preselectedEmployeeId?: string;
  /** Inline mode for Kiosk (no dialog wrapper) */
  inline?: boolean;
}

function FaceCaptureCore({ employees, preselectedEmployeeId, onResult }: {
  employees: Employee[];
  preselectedEmployeeId?: string;
  onResult?: (result: FaceVerifyResult | null) => void;
}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployeeId || "");
  const [state, setState] = useState<VerifyState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<FaceVerifyResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setState("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Não foi possível aceder à câmara. Verifique as permissões do browser.");
      setState("idle");
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64 = dataUrl.split(",")[1];
    setCapturedImage(base64);
    setState("captured");
    stopCamera();
  }, [stopCamera]);

  const verify = useCallback(async () => {
    if (!capturedImage || !selectedEmployeeId || !currentWorkspace?.id) return;
    setState("verifying");
    try {
      const res = await supabase.functions.invoke("hr-face-verify", {
        body: {
          employee_id: selectedEmployeeId,
          workspace_id: currentWorkspace.id,
          photo_base64: capturedImage,
        },
      });

      const data: FaceVerifyResult = res.data || { success: false, verified: false, error: res.error?.message || "Erro desconhecido" };
      setResult(data);
      onResult?.(data);

      if (data.success && data.verified) {
        setState("success");
        toast.success(`${data.employee_name} — ${data.action === "clock_in" ? "Entrada" : "Saída"} registada`);
        queryClient.invalidateQueries({ queryKey: ["hr-work-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["hr-time-entries"] });

        if (data.overtime_alert?.exceeded) {
          const mins = data.overtime_alert.overtime_minutes;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          toast.warning(`⚠️ ${data.employee_name} excedeu o limite diário em ${h > 0 ? `${h}h ` : ""}${m}m`);
        }
      } else {
        setState("error");
        toast.error(data.error || "Verificação falhou");
      }
    } catch (err: any) {
      setState("error");
      setResult({ success: false, verified: false, error: err?.message || "Erro de rede" });
      toast.error("Erro ao verificar");
    }
  }, [capturedImage, selectedEmployeeId, currentWorkspace?.id, queryClient, onResult]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setState("idle");
    onResult?.(null);
  }, [onResult]);

  return (
    <div className="space-y-4">
      {/* Employee selection */}
      {!preselectedEmployeeId && (
        <div>
          <label className="text-sm font-medium">Colaborador</label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Selecione o colaborador..." /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name} {!e.avatar_url && "(sem foto)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && !selectedEmployee.avatar_url && (
            <p className="text-xs text-destructive mt-1">Este colaborador não tem foto de perfil. A verificação facial não é possível.</p>
          )}
        </div>
      )}

      {/* Camera / Capture area */}
      <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        {state === "idle" && (
          <div className="text-center space-y-3">
            <ScanFace className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {!selectedEmployeeId ? "Selecione um colaborador para começar" : "Clique para iniciar a câmara"}
            </p>
            {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
            {selectedEmployeeId && selectedEmployee?.avatar_url && (
              <Button onClick={startCamera} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" /> Iniciar Câmara
              </Button>
            )}
          </div>
        )}

        {state === "camera" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute bottom-3 inset-x-0 flex justify-center">
              <Button onClick={capturePhoto} size="lg" className="rounded-full h-14 w-14 p-0">
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          </>
        )}

        {state === "captured" && capturedImage && (
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Foto capturada"
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        )}

        {state === "verifying" && (
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">A verificar identidade...</p>
          </div>
        )}

        {state === "success" && result && (
          <div className="text-center space-y-3 p-4">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
            <p className="text-lg font-bold">{result.employee_name}</p>
            <Badge variant={result.action === "clock_in" ? "default" : "destructive"} className="text-base px-4 py-1">
              {result.action === "clock_in" ? "Entrada" : "Saída"}
            </Badge>
            {result.recorded_at && (
              <p className="text-sm text-muted-foreground">
                {new Date(result.recorded_at).toLocaleTimeString("pt-PT")}
              </p>
            )}
          </div>
        )}

        {state === "error" && result && (
          <div className="text-center space-y-3 p-4">
            <XCircle className="h-14 w-14 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">{result.error}</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {state === "captured" && (
          <>
            <Button variant="outline" onClick={() => { setCapturedImage(null); startCamera(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Nova Foto
            </Button>
            <Button onClick={verify}>
              <ScanFace className="h-4 w-4 mr-2" /> Verificar e Registar
            </Button>
          </>
        )}
        {(state === "success" || state === "error") && (
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" /> Novo Registo
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FaceCaptureDialog({ open, onOpenChange, employees, preselectedEmployeeId, inline }: FaceCaptureDialogProps) {
  if (inline) {
    return <FaceCaptureCore employees={employees} preselectedEmployeeId={preselectedEmployeeId} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5" />
            Verificação Facial
          </DialogTitle>
        </DialogHeader>
        <FaceCaptureCore employees={employees} preselectedEmployeeId={preselectedEmployeeId} />
      </DialogContent>
    </Dialog>
  );
}

export { FaceCaptureCore };
