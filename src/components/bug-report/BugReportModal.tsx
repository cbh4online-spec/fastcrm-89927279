import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBugReport, BugReportCategory, BugReportPriority } from "@/hooks/useBugReport";
import { useLocation } from "react-router-dom";
import { collectBugReportContext } from "@/utils/bug-report-context";
import { Camera, Paperclip, X, ChevronDown, ChevronUp, Loader2, CheckCircle } from "lucide-react";

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: BugReportCategory; label: string; icon: string; desc: string }[] = [
  { value: "bug", label: "Bug / Erro", icon: "🐛", desc: "Algo não funciona como esperado" },
  { value: "question", label: "Dúvida", icon: "❓", desc: "Preciso de ajuda com uma funcionalidade" },
  { value: "suggestion", label: "Sugestão", icon: "💡", desc: "Ideia para melhorar o FastCRM" },
  { value: "performance", label: "Lentidão", icon: "🐢", desc: "A plataforma está lenta ou a bloquear" },
  { value: "other", label: "Outro", icon: "📌", desc: "Qualquer outra situação" },
];

const PRIORITIES: { value: BugReportPriority; label: string; className: string }[] = [
  { value: "low", label: "Baixa", className: "text-emerald-500 border-emerald-500/40 bg-emerald-500/5" },
  { value: "normal", label: "Normal", className: "text-muted-foreground border-border bg-secondary/30" },
  { value: "high", label: "Alta", className: "text-amber-500 border-amber-500/40 bg-amber-500/5" },
  { value: "critical", label: "Crítica", className: "text-destructive border-destructive/40 bg-destructive/5" },
];

export function BugReportModal({ open, onClose }: BugReportModalProps) {
  const location = useLocation();
  const ctx = collectBugReportContext(location.pathname);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<BugReportCategory>("bug");
  const [priority, setPriority] = useState<BugReportPriority>("normal");
  const [showContext, setShowContext] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    screenshotDataUrl,
    isCapturing,
    captureError,
    captureScreen,
    clearScreenshot,
    attachmentFile,
    setAttachment,
    clearAttachment,
    submit,
    isSubmitting,
    ticketNumber,
    reset,
  } = useBugReport();

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setTitle("");
    setDescription("");
    setCategory("bug");
    setPriority("normal");
    setAttachmentError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    await submit.mutateAsync({ title, description, category, priority });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const err = setAttachment(file);
    setAttachmentError(err);
    e.target.value = "";
  };

  const isFormValid = title.trim().length >= 5 && description.trim().length >= 10;

  // ── SUCCESS STATE ────────────────────────────────────────
  if (ticketNumber) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="flex flex-col items-center py-12 px-8 text-center" data-bug-report-modal>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Problema reportado com sucesso
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              A equipa FastCRM foi notificada e irá analisar o teu reporte.
            </p>
            <div className="bg-secondary rounded-lg px-6 py-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Número de ticket</p>
              <p className="text-2xl font-mono font-bold text-foreground">{ticketNumber}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Guarda este número para referência futura.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── FORM STATE ───────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        <div className="flex flex-col h-full relative" data-bug-report-modal>
          {/* Loading overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A enviar o teu reporte...</p>
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🐛</span>
              <h2 className="text-base font-semibold text-foreground">Reportar Problema</h2>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* CATEGORY */}
            <div className="mb-5">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Tipo de problema</label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    title={c.desc}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-md border text-center transition-colors ${
                      category === c.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TITLE */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Título *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resume o problema em poucas palavras"
                maxLength={120}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-muted-foreground">{title.length}/120</span>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Descrição *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreve o que aconteceu, o que estavas a fazer e o que esperavas que acontecesse..."
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[96px]"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-muted-foreground">{description.length}/2000</span>
              </div>
            </div>

            {/* PRIORITY */}
            <div className="mb-5">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Prioridade percebida</label>
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`px-3.5 py-1 rounded-full border text-xs transition-colors ${
                      priority === p.value
                        ? p.className + " font-medium"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SCREENSHOT */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground block mb-2">Captura de ecrã</label>
              {screenshotDataUrl ? (
                <div className="border border-border rounded-lg overflow-hidden relative">
                  <img
                    src={screenshotDataUrl}
                    alt="Captura de ecrã"
                    className="w-full max-h-40 object-cover"
                  />
                  <button
                    onClick={clearScreenshot}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={captureScreen}
                  disabled={isCapturing}
                  className="w-full py-3 border border-dashed border-border rounded-lg bg-secondary/30 text-muted-foreground text-xs flex items-center justify-center gap-2 hover:bg-secondary/60 disabled:opacity-50 transition-colors"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      A capturar...
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      Capturar ecrã actual
                    </>
                  )}
                </button>
              )}
              {captureError && (
                <p className="text-[11px] text-destructive mt-1">{captureError}</p>
              )}
            </div>

            {/* ATTACHMENT */}
            <div className="mb-5">
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Ficheiro adicional
                <span className="font-normal ml-1.5 text-muted-foreground/60">(opcional, máx 5MB)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.pdf,.txt,.csv,.xlsx,.zip"
                className="hidden"
              />
              {attachmentFile ? (
                <div className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-secondary/30">
                  <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{attachmentFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(attachmentFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={clearAttachment} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 border border-dashed border-border rounded-md text-muted-foreground/60 text-xs flex items-center justify-center gap-2 hover:bg-secondary/30 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Adicionar ficheiro (imagem, PDF, CSV...)
                </button>
              )}
              {attachmentError && (
                <p className="text-[11px] text-destructive mt-1">{attachmentError}</p>
              )}
            </div>

            {/* AUTO CONTEXT */}
            <div className="border border-border rounded-md overflow-hidden mb-2">
              <button
                onClick={() => setShowContext(!showContext)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔍</span>
                  <span className="text-xs font-medium text-muted-foreground">Contexto automático incluído</span>
                </div>
                {showContext ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {showContext && (
                <div className="px-3.5 py-3 space-y-1">
                  {[
                    ["Página", ctx.route],
                    ["Browser", `${ctx.browserName} ${ctx.browserVersion}`],
                    ["Sistema", `${ctx.osName} ${ctx.osVersion}`],
                    ["Resolução", `${ctx.viewportWidth}×${ctx.viewportHeight}px`],
                    ["Versão", ctx.appVersion],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">{k}</span>
                      <span className="text-[11px] text-foreground/80 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex gap-2.5 px-5 py-3.5 border-t border-border flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={`flex-[2] py-2 rounded-md text-sm font-medium transition-colors ${
                isFormValid
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              Enviar reporte
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
