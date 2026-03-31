import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Camera, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type QRResult = {
  success: boolean;
  employee_name?: string;
  action?: string;
  recorded_at?: string;
  error?: string;
};

export default function HRKioskPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [lastResults, setLastResults] = useState<QRResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<QRResult | null>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // QR Scanner
  useEffect(() => {
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (scanning) return;
            setScanning(true);

            try {
              const res = await supabase.functions.invoke("hr-clock-qr", {
                body: { qr_token: decodedText }
              });

              const result: QRResult = res.data || { success: false, error: res.error?.message || "Erro desconhecido" };
              setCurrentResult(result);
              setLastResults(prev => [result, ...prev].slice(0, 5));

              setTimeout(() => {
                setCurrentResult(null);
                setScanning(false);
              }, 3000);
            } catch {
              setScanning(false);
            }
          },
          () => {} // ignore scan errors
        );
      } catch (err) {
        console.error("Scanner error:", err);
      }
    };

    startScanner();

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 relative">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 text-gray-400 hover:text-white hover:bg-gray-800"
        onClick={() => navigate("/dashboard/hr")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao RH
      </Button>
      {/* Clock */}
      <div className="text-center mb-8">
        <p className="text-7xl font-bold tabular-nums tracking-tight">
          {format(time, "HH:mm:ss")}
        </p>
        <p className="text-xl text-gray-400 mt-2">
          {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>

      {/* Scanner area */}
      <div className="relative w-full max-w-md">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Terminal de Ponto — QR Code</span>
            </div>
            <div id="qr-reader" ref={containerRef} className="w-full rounded-lg overflow-hidden" />
          </CardContent>
        </Card>

        {/* Result overlay */}
        <AnimatePresence>
          {currentResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-gray-900/90 rounded-xl"
            >
              <div className="text-center p-8">
                {currentResult.success ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <p className="text-2xl font-bold">{currentResult.employee_name}</p>
                    <Badge className="mt-2 text-lg px-4 py-1" variant={currentResult.action === "clock_in" ? "default" : "destructive"}>
                      {currentResult.action === "clock_in" ? "Entrada" : "Saída"}
                    </Badge>
                    <p className="text-sm text-gray-400 mt-2">
                      {currentResult.recorded_at && format(new Date(currentResult.recorded_at), "HH:mm:ss")}
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-red-400">{currentResult.error || "Erro"}</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent entries */}
      {lastResults.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <p className="text-sm text-gray-500 mb-2">Últimos registos</p>
          <div className="space-y-2">
            {lastResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
                {r.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.employee_name || r.error}</p>
                  <p className="text-xs text-gray-500">
                    {r.action === "clock_in" ? "Entrada" : r.action === "clock_out" ? "Saída" : ""}
                    {r.recorded_at && ` · ${format(new Date(r.recorded_at), "HH:mm")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
