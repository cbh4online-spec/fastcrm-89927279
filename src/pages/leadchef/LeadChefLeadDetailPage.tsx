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
import { LeadChefPrintButton } from "@/components/leadchef/LeadChefPrintButton";
import { LeadChefAISuggestionPanel } from "@/components/leadchef/LeadChefAISuggestionPanel";
import { LeadChefEnrollSequencePanel } from "@/components/leadchef/LeadChefEnrollSequencePanel";
import { LeadChefScheduledMessagesCard } from "@/components/leadchef/LeadChefScheduledMessagesCard";
import { LeadChefSavingsCalculatorCard } from "@/components/leadchef/LeadChefSavingsCalculatorCard";
import { LeadChefSocialLinksCard } from "@/components/leadchef/LeadChefSocialLinksCard";
import { useUpdateLeadChefLeadSocials } from "@/hooks/leadchef/useUpdateLeadChefLeadSocials";
import { LeadChefLeadScoreBadge } from "@/components/leadchef/LeadChefLeadScoreBadge";
import { useLeadChefLeadScore } from "@/hooks/leadchef/useLeadChefLeadScore";
import { getLeadChefNextActionSuggestions } from "@/hooks/leadchef/useLeadChefNextActionSuggestions";
import { useLeadChefLead } from "@/hooks/leadchef/useLeadChefLead";
import { useUpdateLeadChefLeadStage } from "@/hooks/leadchef/useUpdateLeadChefLeadStage";
import { useUpdateLeadChefNextAction } from "@/hooks/leadchef/useUpdateLeadChefNextAction";
import type { LeadChefStage, LeadChefActivityType } from "@/types/leadchef";

export default function LeadChefLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { data, isLoading } = useLeadChefLead(leadId);
  const updateStage = useUpdateLeadChefLeadStage();
  const updateNext = useUpdateLeadChefNextAction();
  const updateSocials = useUpdateLeadChefLeadSocials();
  const { data: scoreData } = useLeadChefLeadScore(leadId);

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
      <LeadChefMobileShell title="Referência">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </LeadChefMobileShell>
    );
  }

  if (!data) {
    return (
      <LeadChefMobileShell title="Referência">
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
    <LeadChefMobileShell title="Referência">
      <LeadChefLeadDetailHeader data={data} />

      {scoreData && (
        <div className="flex items-center gap-2 px-4 -mt-1">
          <span className="text-xs text-slate-500">Score IA:</span>
          <LeadChefLeadScoreBadge score={scoreData.score} isCold={scoreData.is_cold} size="md" />
        </div>
      )}

      <div className="px-4">
        <LeadChefAISuggestionPanel
          leadId={lead.id}
          leadPhone={lead.phone}
        />
      </div>

      <div className="px-4">
        <LeadChefEnrollSequencePanel leadId={lead.id} />
      </div>

      <div className="flex justify-end">
        <LeadChefPrintButton
          title={data.lead?.name ?? "Referência LeadChef"}
          subtitle={`Etapa: ${profile.stage} · Temperatura: ${profile.temperature ?? "—"}`}
          sections={[
            {
              title: "Contacto",
              rows: [
                { label: "Nome", value: data.lead?.name ?? "" },
                { label: "Telefone", value: data.lead?.phone ?? "" },
                { label: "Email", value: data.lead?.email ?? "" },
                { label: "Origem", value: profile.origin ?? "" },
                { label: "Interesse", value: profile.interest ?? "" },
              ],
            },
            {
              title: "Próxima ação",
              rows: [
                { label: "Tipo", value: profile.next_action_type ?? "" },
                { label: "Quando", value: profile.next_action_at ?? "" },
                { label: "Nota", value: profile.next_action_note ?? "" },
              ],
            },
          ]}
        />
      </div>

      <LeadChefNextActionCard
        profile={profile}
        onMarkDone={markNextDone}
        onReschedule={() =>
          openCreateSheet(profile.next_action_type ?? "follow_up", undefined, "Reagendar ação")
        }
        onCreate={() => openCreateSheet("follow_up", undefined, "Nova ação")}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setOpenQuick(true)} variant="outline" className="w-full">
          Ações rápidas
        </Button>
        <Button
          onClick={() => setOpenWa(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!lead.phone}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
        </Button>
      </div>

      {(() => {
        const suggestions = getLeadChefNextActionSuggestions({
          stage: profile.stage,
          hasNextAction: Boolean(profile.next_action_at),
        });
        if (suggestions.length === 0) return null;
        return (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <LeadChefNextActionSuggestionCard
                key={s.id}
                suggestion={s}
                onCreate={() => openCreateSheet((s.type as any) ?? "follow_up", undefined, s.title)}
              />
            ))}
          </div>
        );
      })()}

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

      <LeadChefSocialLinksCard
        values={{
          instagram_handle: (profile as any).instagram_handle ?? null,
          facebook_url: (profile as any).facebook_url ?? null,
          tiktok_handle: (profile as any).tiktok_handle ?? null,
          linkedin_url: (profile as any).linkedin_url ?? null,
        }}
        isSaving={updateSocials.isPending}
        onSave={(v) => updateSocials.mutate({ profileId: profile.id, values: v })}
      />

      <LeadChefLeadAppointmentsSection leadId={lead.id} profileId={profile.id} />

      <LeadChefSavingsCalculatorCard leadId={lead.id} phone={lead.phone} />

      <LeadChefScheduledMessagesCard leadId={lead.id} />

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

      <LeadChefWhatsAppActionSheet
        open={openWa}
        onOpenChange={setOpenWa}
        phone={lead.phone}
        recipientName={lead.name}
        entityKind="lead"
        leadId={lead.id}
        preferredCategory={
          profile.stage === "demo_scheduled" ? "demo_confirmation" :
          profile.stage === "demo_done" ? "post_demo_follow_up" :
          profile.stage === "proposal_decision" ? "proposal_follow_up" :
          profile.stage === "reactivate_later" ? "reactivation" :
          "first_contact"
        }
        context={{ interest: profile.interest, origin: profile.origin }}
      />
    </LeadChefMobileShell>
  );
}
