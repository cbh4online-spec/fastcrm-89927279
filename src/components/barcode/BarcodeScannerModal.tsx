import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Keyboard, Loader2, Zap, Flashlight, FlashlightOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (barcode: string) => void;
}

const isInIframe = (() => {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
})();

export const BarcodeScannerModal = React.forwardRef<HTMLDivElement, Props>(function BarcodeScannerModal(
  { open, onOpenChange, onScan },
  _ref,
) {
  const [mode, setMode] = useState<"camera" | "input">(isInIframe ? "input" : "camera");
  const [inputValue, setInputValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeStop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      // html5-qrcode exposes getState(): 1=NOT_STARTED, 2=SCANNING, 3=PAUSED
      const state = typeof scanner.getState === "function" ? scanner.getState() : 2;
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
      try {
        scanner.clear();
      } catch {
        /* noop */
      }
    } catch {
      /* swallow stop errors silently */
    }
    // Manually clean container to avoid React removeChild conflicts
    const el = document.getElementById("barcode-scanner-view");
    if (el) {
      try {
        el.innerHTML = "";
      } catch {
        /* noop */
      }
    }
  }, []);

  const handleScanResult = useCallback(
    (barcode: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1000) return;
      lastScanRef.current = now;
      if (navigator.vibrate) navigator.vibrate(100);
      onScan(barcode.trim());
      onOpenChange(false);
    },
    [onScan, onOpenChange]
  );

  // Camera scanning with html5-qrcode
  useEffect(() => {
    if (!open || mode !== "camera") {
      void safeStop();
      setScanning(false);
      setTorchSupported(false);
      setTorchOn(false);
      return;
    }

    if (isInIframe) {
      setCameraError(
        "O preview do Lovable bloqueia a câmara por segurança. Publica a app ou abre o URL publicado para usar a câmara."
      );
      setMode("input");
      return;
    }

    let cancelled = false;
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;

        const el = document.getElementById("barcode-scanner-view");
        if (!el) {
          setCameraError("Container do scanner não encontrado");
          return;
        }

        const scanner = new Html5Qrcode("barcode-scanner-view", { verbose: false } as any);
        scannerRef.current = scanner;
        setScanning(true);
        setCameraError(null);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          (decodedText: string) => {
            handleScanResult(decodedText);
            void safeStop();
          },
          () => {}
        );

        // Detect torch support
        try {
          const track = (scanner as any)?.getRunningTrackCameraCapabilities?.()?.torchFeature?.();
          if (track && typeof track.isSupported === "function" && track.isSupported()) {
            setTorchSupported(true);
          } else {
            // Fallback via MediaStreamTrack capabilities
            const videoEl = el.querySelector("video") as HTMLVideoElement | null;
            const stream = videoEl?.srcObject as MediaStream | null;
            const t = stream?.getVideoTracks?.()[0];
            const caps = t && (t.getCapabilities?.() as any);
            if (caps && "torch" in caps) setTorchSupported(true);
          }
        } catch {
          /* noop */
        }
      } catch (err: any) {
        if (cancelled) return;
        const name = err?.name || "";
        if (name === "NotAllowedError") {
          setCameraError("Permissão de câmara negada. Ativa nas definições do browser.");
        } else if (name === "NotFoundError") {
          setCameraError("Nenhuma câmara encontrada no dispositivo.");
        } else if (name === "NotReadableError") {
          setCameraError("Câmara em uso por outra aplicação.");
        } else {
          setCameraError(err?.message || "Câmara não disponível");
        }
        setScanning(false);
        setMode("input");
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      void safeStop();
    };
  }, [open, mode, handleScanResult, safeStop]);

  // Torch toggle
  const toggleTorch = useCallback(async () => {
    const el = document.getElementById("barcode-scanner-view");
    const videoEl = el?.querySelector("video") as HTMLVideoElement | null;
    const stream = videoEl?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn((v) => !v);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  useEffect(() => {
    if (open && mode === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleScanResult(inputValue);
      setInputValue("");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) void safeStop();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" /> Scanner de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "camera" | "input")}>
          <TabsList className="w-full">
            <TabsTrigger value="camera" className="flex-1 gap-1" disabled={isInIframe}>
              <Camera className="h-4 w-4" /> Câmara
            </TabsTrigger>
            <TabsTrigger value="input" className="flex-1 gap-1">
              <Keyboard className="h-4 w-4" /> Manual / Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-4">
            <div
              id="barcode-scanner-view"
              ref={containerRef}
              className="w-full min-h-[260px] rounded-lg overflow-hidden bg-muted flex items-center justify-center"
            >
              {!scanning && !cameraError && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">A iniciar câmara...</span>
                </div>
              )}
              {cameraError && (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  <p>{cameraError}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setMode("input")}>
                    Usar modo manual
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Aponte a câmara para o código</p>
              {torchSupported && (
                <Button type="button" variant="ghost" size="sm" onClick={toggleTorch} className="h-7 gap-1 text-xs">
                  {torchOn ? <FlashlightOff className="h-3.5 w-3.5" /> : <Flashlight className="h-3.5 w-3.5" />}
                  {torchOn ? "Desligar luz" : "Ligar luz"}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="input" className="mt-4 space-y-4">
            {isInIframe && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                A câmara está bloqueada no preview do Lovable. Para usar a câmara, abre a app publicada ou o domínio próprio.
              </div>
            )}
            <div>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Leia com scanner ou digite o código..."
                autoFocus
                className="text-lg font-mono text-center tracking-wider"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use um scanner físico ou digite manualmente e pressione Enter
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!inputValue.trim()}
              onClick={() => {
                if (inputValue.trim()) {
                  handleScanResult(inputValue);
                  setInputValue("");
                }
              }}
            >
              Procurar Produto
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
