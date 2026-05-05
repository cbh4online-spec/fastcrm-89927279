import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { UserRoundSearch } from "lucide-react";

export default function LeadChefLeadsPage() {
  return (
    <LeadChefMobileShell title="Leads" subtitle="Funil simples dos leads LeadChef.">
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <UserRoundSearch className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm text-slate-600">A lista mobile de leads será implementada na próxima fase.</p>
      </div>
    </LeadChefMobileShell>
  );
}
