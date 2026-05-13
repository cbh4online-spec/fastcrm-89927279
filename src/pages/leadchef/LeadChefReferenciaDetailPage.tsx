import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefReferralDetailHeader } from "@/components/leadchef/LeadChefReferralDetailHeader";
import { LeadChefConvertReferralSheet } from "@/components/leadchef/LeadChefConvertReferralSheet";
import { LeadChefSocialLinksCard } from "@/components/leadchef/LeadChefSocialLinksCard";
import { Button } from "@/components/ui/button";
import { useLeadChefReferral } from "@/hooks/leadchef/useLeadChefReferral";
import { useUpdateLeadChefReferral } from "@/hooks/leadchef/useUpdateLeadChefReferral";
import {
  LEADCHEF_REFERRAL_STATUSES,
  LEADCHEF_REFERRAL_STATUS_LABELS,
} from "@/components/leadchef/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadChefReferralStatus } from "@/types/leadchef";

export default function LeadChefReferenciaDetailPage() {
  const { referralId } = useParams<{ referralId: string }>();
  const navigate = useNavigate();
  const { data: referral, isLoading } = useLeadChefReferral(referralId);
  const update = useUpdateLeadChefReferral();
  const [convertOpen, setConvertOpen] = useState(false);

  if (isLoading) {
    return (
      <LeadChefMobileShell title="Referência">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </LeadChefMobileShell>
    );
  }

  if (!referral) {
    return (
      <LeadChefMobileShell title="Referência">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Referência não encontrada.</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/dashboard/leadchef/clientes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </LeadChefMobileShell>
    );
  }

  return (
    <LeadChefMobileShell title="Referência" showFab={false}>
      <LeadChefReferralDetailHeader referral={referral} />

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Estado</h2>
        <Select
          value={referral.status}
          onValueChange={(v) =>
            update.mutate({ id: referral.id, status: v as LeadChefReferralStatus })
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEADCHEF_REFERRAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{LEADCHEF_REFERRAL_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <LeadChefSocialLinksCard
        values={{
          instagram_handle: (referral as any).instagram_handle ?? null,
          facebook_url: (referral as any).facebook_url ?? null,
          tiktok_handle: (referral as any).tiktok_handle ?? null,
          linkedin_url: (referral as any).linkedin_url ?? null,
        }}
        isSaving={update.isPending}
        onSave={(v) => update.mutate({ id: referral.id, ...v })}
      />

      {referral.notes && (
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Notas</h2>
          <p className="text-xs text-slate-600 whitespace-pre-line">{referral.notes}</p>
        </section>
      )}

      {referral.status !== "converted" && (
        <Button
          onClick={() => setConvertOpen(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Converter em referência
        </Button>
      )}

      {referral.converted_lead && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/dashboard/leadchef/leads/${referral.converted_lead!.id}`)}
        >
          Abrir lead criado · {referral.converted_lead.name}
        </Button>
      )}

      <LeadChefConvertReferralSheet
        open={convertOpen}
        onOpenChange={setConvertOpen}
        referral={referral}
        onConverted={(leadId) => {
          setConvertOpen(false);
          navigate(`/dashboard/leadchef/leads/${leadId}`);
        }}
      />
    </LeadChefMobileShell>
  );
}
