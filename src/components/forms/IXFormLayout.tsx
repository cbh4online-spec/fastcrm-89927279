import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IXFormLayoutProps {
  title: string;
  backTo?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  children: ReactNode;
}

export function IXFormLayout({
  title,
  backTo,
  onCancel,
  onSubmit,
  submitLabel = "Guardar",
  isSubmitting,
  canSubmit = true,
  children,
}: IXFormLayoutProps) {
  const navigate = useNavigate();
  const handleCancel = onCancel ?? (() => (backTo ? navigate(backTo) : navigate(-1)));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/20 pb-32">
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <button
          type="button"
          onClick={handleCancel}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="mx-auto mt-8 max-w-5xl space-y-10 px-6"
      >
        {children}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full px-6"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn("rounded-full px-8 font-semibold")}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? "A guardar…" : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
