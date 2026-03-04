import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Keyboard, Loader2, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ open, onOpenChange, onScan }: Props) {
  const [mode, setMode] = useState<"camera" | "input">("camera");
  const [inputValue, setInputValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScanResult = useCallback(
    (barcode: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1000) return; // cooldown
      lastScanRef.current = now;

      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate(100);

      onScan(barcode.trim());
      onOpenChange(false);
    },
    [onScan, onOpenChange]
  );

  // Camera scanning with html5-qrcode
  useEffect(() => {
    if (!open || mode !== "camera") {
      // Cleanup
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .then(() => {
            scannerRef.current = null;
          });
      }
      setScanning(false);
      setCameraError(null);
      return;
    }

    let cancelled = false;
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        // Wait for DOM element
        await new Promise((r) => setTimeout(r, 300));
        if (cancelled) return;

        const el = document.getElementById("barcode-scanner-view");
        if (!el) {
          setCameraError("Scanner container not found");
          return;
        }

        const scanner = new Html5Qrcode("barcode-scanner-view");
        scannerRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText: string) => {
            handleScanResult(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {} // ignore errors during scanning
        );
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(err?.message || "Câmara não disponível");
          setScanning(false);
          setMode("input");
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, mode, handleScanResult]);

  // Focus input in input mode
  useEffect(() => {
    if (open && mode === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  // Handle physical scanner input (rapid chars + Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleScanResult(inputValue);
      setInputValue("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" /> Scanner de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "camera" | "input")}>
          <TabsList className="w-full">
            <TabsTrigger value="camera" className="flex-1 gap-1">
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
              className="w-full min-h-[250px] rounded-lg overflow-hidden bg-muted flex items-center justify-center"
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setMode("input")}
                  >
                    Usar modo manual
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Aponte a câmara para o código de barras
            </p>
          </TabsContent>

          <TabsContent value="input" className="mt-4 space-y-4">
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
