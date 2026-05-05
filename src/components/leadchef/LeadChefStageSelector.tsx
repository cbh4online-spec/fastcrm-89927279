import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LEADCHEF_STAGES,
  LEADCHEF_STAGE_LABELS,
  LEADCHEF_STAGE_COLORS,
} from "./constants";
import type { LeadChefStage } from "@/types/leadchef";

interface Props {
  stage: LeadChefStage;
  isLoading?: boolean;
  onChange: (stage: LeadChefStage) => void;
}

const NEEDS_CONFIRM: LeadChefStage[] = ["won", "lost"];

export function LeadChefStageSelector({ stage, isLoading, onChange }: Props) {
  const [pending, setPending] = useState<LeadChefStage | null>(null);

  const handleClick = (s: LeadChefStage) => {
    if (s === stage || isLoading) return;
    if (NEEDS_CONFIRM.includes(s)) {
      setPending(s);
      return;
    }
    onChange(s);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Etapa do funil</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LEADCHEF_STAGES.map((s) => {
          const active = s === stage;
          return (
            <button
              key={s}
              onClick={() => handleClick(s)}
              disabled={isLoading}
              className={cn(
                "text-left text-xs font-medium rounded-xl px-3 py-2 border transition",
                active
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : cn(LEADCHEF_STAGE_COLORS[s], "hover:opacity-90"),
                isLoading && "opacity-60 cursor-not-allowed"
              )}
            >
              {LEADCHEF_STAGE_LABELS[s]}
            </button>
          );
        })}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de etapa</AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "won"
                ? "Marcar este lead como Venda ganha? O lead será fechado no CRM global."
                : "Marcar este lead como Perdido? O lead será fechado no CRM global."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) onChange(pending);
                setPending(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
