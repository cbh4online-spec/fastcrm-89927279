import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "warning" | "info" | "danger";

interface ConfirmActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
  /** Bloqueia o botão de confirmar (ex.: validação de campo). */
  confirmDisabled?: boolean;
  /** Conteúdo extra (ex.: lista de impacto, campo motivo). */
  children?: React.ReactNode;
}

const toneStyles: Record<Tone, { icon: string; chip: string; btn: string }> = {
  warning: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    btn: "bg-amber-500 hover:bg-amber-600 text-white shadow-[0_8px_24px_-12px_rgba(245,158,11,0.6)]",
  },
  info: {
    icon: "bg-brand/10 text-brand ring-brand/20",
    chip: "bg-brand/10 text-brand ring-brand/20",
    btn: "bg-brand hover:bg-brand/90 text-white shadow-[0_8px_24px_-12px_rgba(37,99,235,0.6)]",
  },
  danger: {
    icon: "bg-rose-50 text-rose-600 ring-rose-100",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    btn: "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_8px_24px_-12px_rgba(225,29,72,0.6)]",
  },
};

export function ConfirmActionDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "warning",
  loading = false,
  confirmDisabled = false,
  children,
}: ConfirmActionDialogProps) {
  const styles = toneStyles[tone];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-navy/50 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-[0_30px_60px_-20px_rgba(11,29,61,0.35)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
            >
              <div className="flex items-start gap-4 p-6">
                <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1", styles.icon)}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="confirm-title" className="font-display text-base font-semibold text-navy">
                    {title}
                  </h2>
                  <div className="mt-1 text-sm leading-relaxed text-navy-500">{description}</div>
                </div>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-navy-300 transition-colors hover:bg-brand-ice hover:text-navy disabled:opacity-40"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children && (
                <div className="border-t border-navy-100 bg-brand-ice/40 px-6 py-4">{children}</div>
              )}
              <div className="flex items-center justify-end gap-2 border-t border-navy-100 bg-white px-6 py-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="h-10 rounded-xl border-navy-100 text-navy-500 hover:border-navy-200 hover:text-navy"
                >
                  {cancelLabel}
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={loading || confirmDisabled}
                  className={cn("h-10 gap-2 rounded-xl", styles.btn)}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
