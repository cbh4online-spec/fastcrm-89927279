import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeadChefReferenciasEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-emerald-200 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Não existem referências registadas</h3>
      <p className="text-sm text-slate-500 mt-1">Cada referência é uma porta aberta para um novo cliente.</p>
      <Button onClick={onCreate} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
        Criar primeira referência
      </Button>
    </div>
  );
}
