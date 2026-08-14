/**
 * Diálogo de chamada via WhatsApp — abre a app/web e regista a chamada na ficha do cliente.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Smartphone, Monitor, Loader2, AlertTriangle, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  WHATSAPP_CALL_OUTCOMES,
  buildWhatsAppLinks,
  formatWhatsAppNumber,
  isMobileDevice,
  normalizeWhatsAppNumber,
  useCancelWhatsAppCall,
  useFinishWhatsAppCall,
  useMyWhatsAppCallSettings,
  useStartWhatsAppCall,
  type WhatsAppCallEntityType,
} from "@/hooks/useWhatsAppCall";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string | null;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string;
  /** Retomar um registo iniciado que ficou por fechar. */
  resumeCall?: { id: string; started_at: string | null; to_number: string | null; from_number: string | null } | null;
}

function secondsToMMSS(total: number) {
  const m = Math.floor(total / 60);
  const s = Math.max(0, Math.round(total % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mmssToSeconds(value: string) {
  const [m, s] = value.split(":");
  const mins = Number(m || 0);
  const secs = Number(s || 0);
  if (Number.isNaN(mins) || Number.isNaN(secs)) return 0;
  return mins * 60 + secs;
}

export function WhatsAppCallDialog({ open, onOpenChange, phone, entityType, entityId, entityName, resumeCall }: Props) {
  const { data: settings } = useMyWhatsAppCallSettings();
  const startCall = useStartWhatsAppCall();
  const finishCall = useFinishWhatsAppCall();
  const cancelCall = useCancelWhatsAppCall();

  const [step, setStep] = useState<"launch" | "log">("launch");
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState("00:00");
  const [outcome, setOutcome] = useState<string>("answered");
  const [notes, setNotes] = useState("");
  const timerRef = useRef<number | null>(null);

  const normalized = useMemo(() => normalizeWhatsAppNumber(phone ?? resumeCall?.to_number ?? null), [phone, resumeCall]);
  const links = useMemo(() => (normalized ? buildWhatsAppLinks(normalized) : null), [normalized]);
  const mobile = useMemo(() => isMobileDevice(), []);
  const fromNumber = settings?.from_number ?? resumeCall?.from_number ?? null;

  useEffect(() => {
    if (!open) return;
    if (resumeCall) {
      setStep("log");
      setCallId(resumeCall.id);
      const started = resumeCall.started_at ? new Date(resumeCall.started_at).getTime() : Date.now();
      const secs = Math.max(0, Math.round((Date.now() - started) / 1000));
      setElapsed(secs);
      setDuration(secondsToMMSS(secs));
    } else {
      setStep("launch");
      setCallId(null);
      setElapsed(0);
      setDuration("00:00");
    }
    setOutcome("answered");
    setNotes("");
  }, [open, resumeCall]);

  // Cronómetro enquanto a chamada está em curso
  useEffect(() => {
    if (step !== "log" || !callId || resumeCall) return;
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        setDuration(secondsToMMSS(next));
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [step, callId, resumeCall]);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const launch = async (target: "desktop" | "mobile") => {
    if (!normalized || !links) {
      toast.error("Número de telefone inválido para WhatsApp");
      return;
    }
    try {
      const created = await startCall.mutateAsync({
        toNumber: normalized,
        entityType,
        entityId,
        entityName,
        fromNumber,
      });
      setCallId(created.id);
      setStep("log");
      setElapsed(0);
      setDuration("00:00");

      const url = target === "mobile" ? links.universal : links.app;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (target === "desktop") {
        // Fallback para WhatsApp Web se a app não estiver instalada
        window.setTimeout(() => {
          if (!win || win.closed) window.open(links.web, "_blank", "noopener,noreferrer");
        }, 1500);
      }
    } catch {
      /* erro já reportado pelo hook */
    }
  };

  const save = async () => {
    if (!callId) return;
    stopTimer();
    await finishCall.mutateAsync({
      callId,
      durationSeconds: mmssToSeconds(duration),
      outcome,
      notes,
      entityType,
      entityId,
      entityName,
      toNumber: normalized ? `+${normalized}` : null,
      fromNumber,
    });
    onOpenChange(false);
  };

  const discard = async () => {
    if (callId) {
      stopTimer();
      await cancelCall.mutateAsync(callId);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopTimer(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Ligar por WhatsApp
          </DialogTitle>
          <DialogDescription>
            {entityName ? `${entityName} · ` : ""}
            {normalized ? formatWhatsAppNumber(`+${normalized}`) : "Sem número válido"}
          </DialogDescription>
        </DialogHeader>

        {!normalized && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este registo não tem um número de telefone válido. Atualize o contacto antes de ligar.
            </AlertDescription>
          </Alert>
        )}

        {normalized && step === "launch" && (
          <div className="space-y-4">
            {!fromNumber && (
              <Alert>
                <Settings2 className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ainda não configurou o seu número WhatsApp de saída.{" "}
                  <Link to="/settings/profile" className="underline font-medium" onClick={() => onOpenChange(false)}>
                    Configurar agora
                  </Link>
                  . Pode ligar à mesma.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              A chamada é feita na app WhatsApp — abrimos a conversa no número certo e depois basta clicar no ícone de
              telefone. O registo fica guardado automaticamente na atividade do cliente.
            </p>

            <div className="grid gap-2">
              <Button onClick={() => launch(mobile ? "mobile" : "desktop")} disabled={startCall.isPending} className="w-full gap-2">
                {startCall.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                {mobile ? "Abrir WhatsApp no telemóvel" : "Abrir WhatsApp no computador"}
              </Button>
              <Button
                variant="outline"
                onClick={() => launch(mobile ? "desktop" : "mobile")}
                disabled={startCall.isPending}
                className="w-full gap-2"
              >
                {mobile ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                {mobile ? "Abrir WhatsApp Web" : "Abrir no telemóvel (link)"}
              </Button>
            </div>

            {!mobile && links && (
              <div className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                <QRCodeSVG value={links.universal} size={92} />
                <div className="text-xs text-muted-foreground">
                  Leia o código com o telemóvel para abrir a conversa e ligar a partir da app móvel.
                </div>
              </div>
            )}
          </div>
        )}

        {normalized && step === "log" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Chamada em curso</span>
              <Badge variant="secondary" className="font-mono text-sm">{secondsToMMSS(elapsed)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wa-duration">Duração (mm:ss)</Label>
                <Input
                  id="wa-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onFocus={stopTimer}
                  placeholder="03:20"
                />
              </div>
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WHATSAPP_CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-notes">Notas</Label>
              <Textarea
                id="wa-notes"
                rows={3}
                value={notes}
                maxLength={2000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que ficou combinado nesta chamada?"
              />
            </div>

            {fromNumber && (
              <p className="text-xs text-muted-foreground">Número de saída: {fromNumber}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === "log" ? (
            <>
              <Button variant="ghost" onClick={discard} disabled={cancelCall.isPending || finishCall.isPending}>
                Descartar
              </Button>
              <Button onClick={save} disabled={finishCall.isPending}>
                {finishCall.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar chamada
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
