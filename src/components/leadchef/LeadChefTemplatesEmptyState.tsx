import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onInstallDefaults: () => void;
  isInstalling?: boolean;
}

export function LeadChefTemplatesEmptyState({ onInstallDefaults, isInstalling }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">Sem templates ainda</h3>
      <p className="text-xs text-slate-500 mt-1">
        Cria os teus templates de mensagens para poupar tempo nas comunicações.
      </p>
      <Button
        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onInstallDefaults}
        disabled={isInstalling}
      >
        Criar templates padrão
      </Button>
    </div>
  );
}
