import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Mail, Phone, User, Calendar } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefLeadDetailHeader } from "@/components/leadchef/LeadChefLeadDetailHeader";
import { LeadChefNextActionCard } from "@/components/leadchef/LeadChefNextActionCard";
import { LeadChefStageSelector } from "@/components/leadchef/LeadChefStageSelector";
import { LeadChefCycleChecklist } from "@/components/leadchef/LeadChefCycleChecklist";
import { LeadChefActivityTimeline } from "@/components/leadchef/LeadChefActivityTimeline";
import { LeadChefCreateActionSheet } from "@/components/leadchef/LeadChefCreateActionSheet";
import { LeadChefLeadAppointmentsSection } from "@/components/leadchef/LeadChefLeadAppointmentsSection";
import { LeadChefRegisterResultSheet } from "@/components/leadchef/LeadChefRegisterResultSheet";
import { LeadChefQuickActionSheet } from "@/components/leadchef/LeadChefQuickActionSheet";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { LeadChefWhatsAppActionSheet } from "@/components/leadchef/LeadChefWhatsAppActionSheet";
import { LeadChefNextActionSuggestionCard } from "@/components/leadchef/LeadChefNextActionSuggestionCard";
import { useLeadChefNextActionSuggestions } from "@/hooks/leadchef/useLeadChefNextActionSuggestions";
import { useLeadChefLead } from "@/hooks/leadchef/useLeadChefLead";
import { useUpdateLeadChefLeadStage } from "@/hooks/leadchef/useUpdateLeadChefLeadStage";
import { useUpdateLeadChefNextAction } from "@/hooks/leadchef/useUpdateLeadChefNextAction";
import type { LeadChefStage, LeadChefActivityType } from "@/types/leadchef";

export default function LeadChefLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { data, isLoading } = useLeadChefLead(leadId);
  const updateStage = useUpdateLeadChefLeadStage();
  const updateNext = useUpdateLeadChefNextAction();

  const [openCreate, setOpenCreate] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const [openQuick, setOpenQuick] = useState(false);
  const [openWa, setOpenWa] = useState(false);
  const [createDefaultType, setCreateDefaultType] =
    useState<LeadChefActivityType>("follow_up");
  const [createForceStage, setCreateForceStage] = useState<
    LeadChefStage | undefined
  >(undefined);
  const [createTitle, setCreateTitle] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <LeadChefMobileShell title="Lead">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </LeadChefMobileShell>
    );
  }

  if (!data) {
    return (
      <LeadChefMobileShell title="Lead">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Não encontrámos este lead.</p>
        </div>
      </LeadChefMobileShell>
    );
  }

  const { profile, lead } = data;

  const openCreateSheet = (
    type: LeadChefActivityType,
    forceStage?: LeadChefStage,
    title?: string
  ) => {
    setCreateDefaultType(type);
    setCreateForceStage(forceStage);
    setCreateTitle(title);
    setOpenCreate(true);
  };

  const handleStageChange = (s: LeadChefStage) =>
    updateStage.mutate({ profileId: profile.id, leadId: lead.id, stage: s });

  const markNextDone = async () => {
    await updateNext.mutateAsync({
      profileId: profile.id,
      next_action_type: null,
      next_action_at: null,
      next_action_note: null,
    });
  };

  return (
    <LeadChefMobileShell title="Lead">
      <LeadChefLeadDetailHeader data={data} />

      <LeadChefNextActionCard
        profile={profile}
        onMarkDone={markNextDone}
        onReschedule={() =>
          openCreateSheet(profile.next_action_type ?? "follow_up", undefined, "Reagendar ação")
        }
        onCreate={() => openCreateSheet("follow_up", undefined, "Nova ação")}
      />

      <Button
        onClick={() => setOpenQuick(true)}
        variant="outline"
        className="w-full"
      >
        Ações rápidas
      </Button>

      <LeadChefStageSelector
        stage={profile.stage}
        isLoading={updateStage.isPending}
        onChange={handleStageChange}
      />

      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Contacto</h2>
        <ul className="space-y-2 text-xs text-slate-700">
          {lead.phone && (
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{lead.phone}</span>
            </li>
          )}
          {lead.email && (
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{lead.email}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Origem: <span className="font-medium">{profile.origin || "—"}</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Interesse:{" "}
              <span className="font-medium">{profile.interest || "—"}</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Criado em{" "}
              {new Date(profile.created_at).toLocaleDateString("pt-PT")}
            </span>
          </li>
        </ul>
      </div>

      <LeadChefLeadAppointmentsSection leadId={lead.id} profileId={profile.id} />

      <LeadChefCycleChecklist
        profileId={profile.id}
        cycle={profile.cycle as Record<string, unknown>}
      />

      <LeadChefActivityTimeline leadId={lead.id} />

      <LeadChefCreateActionSheet
        open={openCreate}
        onOpenChange={setOpenCreate}
        leadId={lead.id}
        profileId={profile.id}
        defaultType={createDefaultType}
        forceStage={createForceStage}
        title={createTitle}
      />

      <LeadChefRegisterResultSheet
        open={openResult}
        onOpenChange={setOpenResult}
        leadId={lead.id}
        profileId={profile.id}
      />

      <LeadChefQuickActionSheet
        open={openQuick}
        onOpenChange={setOpenQuick}
        onRegisterResult={() => setOpenResult(true)}
        onScheduleDemo={() =>
          openCreateSheet("demo", "demo_scheduled", "Marcar demonstração")
        }
        onSendProposal={() =>
          openCreateSheet("proposal", "proposal_decision", "Enviar proposta")
        }
        onAskReferral={() =>
          openCreateSheet("referral", undefined, "Pedir referência")
        }
        onMarkWon={() =>
          updateStage.mutate({ profileId: profile.id, leadId: lead.id, stage: "won" })
        }
        onMarkLost={() =>
          updateStage.mutate({ profileId: profile.id, leadId: lead.id, stage: "lost" })
        }
      />
    </LeadChefMobileShell>
  );
}
