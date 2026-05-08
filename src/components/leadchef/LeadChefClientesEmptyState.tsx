import { UsersRound } from "lucide-react";

export function LeadChefClientesEmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-emerald-200 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <UsersRound className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Ainda não existem clientes ganhos no LeadChef</h3>
      <p className="text-sm text-slate-500 mt-1">Quando marcares uma venda como ganha, o cliente aparece aqui.</p>
    </div>
  );
}
