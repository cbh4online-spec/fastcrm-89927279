import { Bot } from "lucide-react";

export function LeadChefAutomationsEmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <Bot className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">Sem automações</h3>
      <p className="text-xs text-slate-500 mt-1">
        Ativa as regras predefinidas para receber alertas e sugestões.
      </p>
    </div>
  );
}
