import { Sparkles, UserPlus, Power, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarkLeadChefClientPotential } from "@/hooks/leadchef/useMarkLeadChefClientPotential";
import { useUpdateLeadChefClientStatus } from "@/hooks/leadchef/useUpdateLeadChefClientStatus";
import type { LeadChefClientDetail } from "@/hooks/leadchef/useLeadChefClient";

export function LeadChefClientQuickActions({ client, onRequestReferral }: { client: LeadChefClientDetail; onRequestReferral: () => void }) {
  const markPotential = useMarkLeadChefClientPotential();
  const updateStatus = useUpdateLeadChefClientStatus();

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Potencial</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={client.potentialReferral ? "default" : "outline"}
          className={client.potentialReferral ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}
          onClick={() => markPotential.mutate({ leadId: client.leadId, profileId: client.profileId, potentialReferral: !client.potentialReferral })}
        >
          <Sparkles className="h-4 w-4 mr-1.5" /> Referência
        </Button>
        <Button
          variant={client.potentialRecruitment ? "default" : "outline"}
          className={client.potentialRecruitment ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white" : ""}
          onClick={() => markPotential.mutate({ leadId: client.leadId, profileId: client.profileId, potentialRecruitment: !client.potentialRecruitment })}
        >
          <UserPlus className="h-4 w-4 mr-1.5" /> Recrutamento
        </Button>
        <Button variant="outline" onClick={() => updateStatus.mutate({ leadId: client.leadId, status: "active" })}>
          <Sun className="h-4 w-4 mr-1.5" /> Marcar ativo
        </Button>
        <Button variant="outline" onClick={() => updateStatus.mutate({ leadId: client.leadId, status: "inactive" })}>
          <Power className="h-4 w-4 mr-1.5" /> Marcar inativo
        </Button>
      </div>
      <Button onClick={onRequestReferral} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
        Pedir referência
      </Button>
    </section>
  );
}
