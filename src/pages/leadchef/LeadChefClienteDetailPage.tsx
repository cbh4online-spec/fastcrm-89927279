import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefClientDetailHeader } from "@/components/leadchef/LeadChefClientDetailHeader";
import { LeadChefClientQuickActions } from "@/components/leadchef/LeadChefClientQuickActions";
import { LeadChefClientCycleCard } from "@/components/leadchef/LeadChefClientCycleCard";
import { LeadChefClientFollowUpCard } from "@/components/leadchef/LeadChefClientFollowUpCard";
import { LeadChefClientReferralRequestSheet } from "@/components/leadchef/LeadChefClientReferralRequestSheet";
import { LeadChefClientStatusBadge } from "@/components/leadchef/LeadChefClientStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadChefClient } from "@/hooks/leadchef/useLeadChefClient";
import { useUpdateLeadChefClientStatus } from "@/hooks/leadchef/useUpdateLeadChefClientStatus";
import {
  LEADCHEF_CLIENT_STATUSES,
  LEADCHEF_CLIENT_STATUS_LABELS,
} from "@/components/leadchef/constants";

export default function LeadChefClienteDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useLeadChefClient(leadId);
  const updateStatus = useUpdateLeadChefClientStatus();
  const [openReferral, setOpenReferral] = useState(false);

  if (isLoading) {
    return (
      <LeadChefMobileShell title="Cliente">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </LeadChefMobileShell>
    );
  }

  if (!client) {
    return (
      <LeadChefMobileShell title="Cliente">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Cliente não encontrado.</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/dashboard/leadchef/clientes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </LeadChefMobileShell>
    );
  }

  return (
    <LeadChefMobileShell title="Cliente" showFab={false}>
      <LeadChefClientDetailHeader client={client} />

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Estado</h2>
          <LeadChefClientStatusBadge status={client.status} />
        </div>
        <Select
          value={client.status}
          onValueChange={(v) =>
            updateStatus.mutate({ leadId: client.leadId, status: v as any })
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEADCHEF_CLIENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{LEADCHEF_CLIENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <LeadChefClientQuickActions client={client} onRequestReferral={() => setOpenReferral(true)} />
      <LeadChefClientCycleCard client={client} />
      <LeadChefClientFollowUpCard client={client} />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate(`/dashboard/leadchef/leads/${client.leadId}`)}
      >
        Ver lead original
      </Button>

      <LeadChefClientReferralRequestSheet
        open={openReferral}
        onOpenChange={setOpenReferral}
        client={client}
      />
    </LeadChefMobileShell>
  );
}
