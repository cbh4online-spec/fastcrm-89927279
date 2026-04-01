import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WhatsAppQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = "idle" | "loading" | "qr_ready" | "waiting_for_scan" | "connected" | "error";

export function WhatsAppQRDialog({ open, onOpenChange }: WhatsAppQRDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("idle");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const fetchQR = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setStatus("loading");
    setErrorMsg(null);
    setCountdown(60);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("whatsapp-qr-connect", {
        body: { workspaceId: currentWorkspace.id, userId: user?.id },
      });
      if (error) throw error;

      if (data?.alreadyConnected) {
        setStatus("connected");
        setInstanceName(data.instanceName);
        queryClient.invalidateQueries({ queryKey: ["whatsapp-qr-connection", currentWorkspace.id] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", currentWorkspace.id] });
        toast.success("WhatsApp já está conectado!");
        setTimeout(() => onOpenChange(false), 1500);
        return;
      }

      if (data?.qrcode) {
        setQrBase64(data.qrcode);
        setInstanceName(data.instanceName);
        setStatus("qr_ready");
      } else {
        throw new Error(data?.error || "QR code não recebido");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }, [currentWorkspace?.id, queryClient, onOpenChange]);

  // Start QR fetch when dialog opens
  useEffect(() => {
    if (open && status === "idle") {
      fetchQR();
    }
    if (!open) {
      setStatus("idle");
      setQrBase64(null);
      setInstanceName(null);
      setErrorMsg(null);
      setPhoneNumber(null);
    }
  }, [open, status, fetchQR]);

  // Countdown timer
  useEffect(() => {
    if (status !== "qr_ready" && status !== "waiting_for_scan") return;
    if (countdown <= 0) {
      setStatus("idle"); // QR expired — show refresh
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown]);

  // Poll for connection status
  useEffect(() => {
    if ((status !== "qr_ready" && status !== "waiting_for_scan") || !instanceName || !currentWorkspace?.id) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-qr-status", {
          body: { workspaceId: currentWorkspace.id, instanceName },
        });
        if (error) return;

        if (data?.status === "connected") {
          setStatus("connected");
          setPhoneNumber(data.phoneNumber);
          queryClient.invalidateQueries({ queryKey: ["whatsapp-qr-connection", currentWorkspace.id] });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", currentWorkspace.id] });
          toast.success("WhatsApp conectado via QR Code!");
          setTimeout(() => onOpenChange(false), 1500);
        } else if (data?.status === "waiting_for_scan" && status !== "waiting_for_scan") {
          setStatus("waiting_for_scan");
        }
      } catch {
        // Silent retry
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [status, instanceName, currentWorkspace?.id, queryClient, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar via QR Code</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no telemóvel → Definições → Dispositivos vinculados → Vincular dispositivo
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">A gerar QR Code...</p>
            </div>
          )}

          {(status === "qr_ready" || status === "waiting_for_scan") && qrBase64 && (
            <>
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <img
                  src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              {status === "waiting_for_scan" && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Smartphone className="h-4 w-4 animate-pulse" />
                  <span>QR lido — a autenticar...</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Expira em {countdown}s</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchQR}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}

          {status === "connected" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600">Conectado com sucesso!</p>
              {phoneNumber && (
                <p className="text-xs text-muted-foreground">Número: +{phoneNumber}</p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive text-center max-w-xs">{errorMsg || "Erro ao gerar QR Code"}</p>
              <Button variant="outline" size="sm" onClick={fetchQR}>
                Tentar novamente
              </Button>
            </div>
          )}

          {status === "idle" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-muted-foreground">QR Code expirado</p>
              <Button variant="outline" size="sm" onClick={fetchQR}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Gerar novo QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
