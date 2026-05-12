import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ListTree, Home, Pencil, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "builder.cloned-site.tutorial.dismissed.v1";

interface Step {
  icon: typeof ListTree;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: ListTree,
    title: "Onde está o site",
    body:
      "Na barra à esquerda vês todas as páginas clonadas. O estado (OK, a clonar, falhou) e o caminho aparecem em cada linha. Clica para abrir.",
  },
  {
    icon: Home,
    title: "Como identificar a Home",
    body:
      "A página inicial tem um ícone de casa e a etiqueta «Home». Por defeito é a primeira a abrir.",
  },
  {
    icon: Pencil,
    title: "Como editar",
    body:
      "Usa o seletor «Preview / Split / Código» no topo. Em Split editas o HTML à esquerda e vês o resultado à direita em tempo real. «Ver site» abre numa nova aba.",
  },
  {
    icon: Save,
    title: "Como guardar e publicar",
    body:
      "Clica em «Guardar página» para gravar a página atual. Para tornar o site público, usa o botão «Publicar» no topo da página.",
  },
];

interface Props {
  /** Forçar visível independentemente do storage (para botão de ajuda). */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function BuilderClonedSiteTutorial({ forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(true);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      if (!dismissed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [forceOpen]);

  const close = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="absolute top-3 right-3 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border bg-card shadow-xl animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Mini tutorial · {step + 1}/{STEPS.length}
            </p>
            <p className="text-sm font-semibold leading-tight">Site clonado</p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 -mt-1 -mr-1"
          onClick={close}
          aria-label="Fechar tutorial"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="px-4 pb-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <h4 className="text-sm font-medium">{s.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
        </div>

        {/* dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`Passo ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 bg-muted/20 rounded-b-lg">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={dontShow}
            onCheckedChange={(c) => setDontShow(!!c)}
            className="h-3.5 w-3.5"
          />
          Não mostrar mais
        </label>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {isLast ? (
            <Button size="sm" className="h-7 text-xs" onClick={close}>
              Vamos lá
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Seguinte <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
