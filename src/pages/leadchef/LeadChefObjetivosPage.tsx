import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Target } from "lucide-react";

export default function LeadChefObjetivosPage() {
  return (
    <LeadChefMobileShell title="Objetivos" subtitle="Acompanha demonstrações, vendas, referências e recrutamento.">
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <Target className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600">Os objetivos mensais serão implementados na próxima fase.</p>
      </div>
    </LeadChefMobileShell>
  );
}
