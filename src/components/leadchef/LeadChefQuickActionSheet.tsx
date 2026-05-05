import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CalendarPlus,
  ClipboardCheck,
  FileText,
  Users,
  Trophy,
  XCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onRegisterResult: () => void;
  onScheduleDemo: () => void;
  onSendProposal: () => void;
  onAskReferral: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
}

export function LeadChefQuickActionSheet({
  open,
  onOpenChange,
  onRegisterResult,
  onScheduleDemo,
  onSendProposal,
  onAskReferral,
  onMarkWon,
  onMarkLost,
}: Props) {
  const actions = [
    {
      label: "Registar contacto",
      icon: ClipboardCheck,
      action: onRegisterResult,
      tone: "emerald",
    },
    {
      label: "Marcar demonstração",
      icon: CalendarPlus,
      action: onScheduleDemo,
      tone: "indigo",
    },
    {
      label: "Enviar proposta",
      icon: FileText,
      action: onSendProposal,
      tone: "orange",
    },
    {
      label: "Pedir referência",
      icon: Users,
      action: onAskReferral,
      tone: "violet",
    },
    {
      label: "Marcar venda ganha",
      icon: Trophy,
      action: onMarkWon,
      tone: "emerald",
    },
    {
      label: "Marcar perdido",
      icon: XCircle,
      action: onMarkLost,
      tone: "rose",
    },
  ] as const;

  const toneClass: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Ações rápidas</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {actions.map(({ label, icon: Icon, action, tone }) => (
            <button
              key={label}
              onClick={() => {
                action();
                onOpenChange(false);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 ${toneClass[tone]} hover:opacity-90 transition`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium text-center">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
