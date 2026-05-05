import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { UsersRound } from "lucide-react";

export default function LeadChefClientesPage() {
  return (
    <LeadChefMobileShell title="Clientes" subtitle="Pós-venda, aulas, referências e crescimento.">
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <UsersRound className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600">A área de clientes será implementada depois da gestão de leads.</p>
      </div>
    </LeadChefMobileShell>
  );
}
