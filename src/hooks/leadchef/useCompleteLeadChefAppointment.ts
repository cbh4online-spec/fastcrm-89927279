import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  LeadChefAppointment,
  LeadChefAppointmentOutcome,
  LeadChefAppointmentType,
  LeadChefStage,
} from "@/types/leadchef";
import { readAutoPostDemoConfig, renderTemplateBody } from "@/utils/leadchef/autoPostDemo";

async function enqueuePostDemoMessage(params: {
  workspaceId: string;
  appointment: LeadChefAppointment;
  enrolledStage: LeadChefStage | null;
  agentId: string | null;
}) {
  const { workspaceId, appointment, enrolledStage, agentId } = params;
  try {
    if (appointment.type !== "demo" || !appointment.lead_id) return;

    // 1) Config
    const { data: cfg } = await (supabase as any)
      .from("leadchef_app_config")
      .select("features")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const auto = readAutoPostDemoConfig(cfg?.features);
    if (!auto.enabled) return;

    // 2) Template — preferir o configurado; fallback: post_demo_follow_up "Poupança"
    let template:
      | { id: string; body: string; name: string }
      | null = null;
    if (auto.template_id) {
      const { data } = await (supabase as any)
        .from("leadchef_message_templates")
        .select("id, body, name")
        .eq("workspace_id", workspaceId)
        .eq("id", auto.template_id)
        .eq("is_active", true)
        .maybeSingle();
      template = data ?? null;
    }
    if (!template) {
      const { data } = await (supabase as any)
        .from("leadchef_message_templates")
        .select("id, body, name")
        .eq("workspace_id", workspaceId)
        .eq("category", "post_demo_follow_up")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      template = data ?? null;
    }
    if (!template) return;

    // 3) Lead + agente
    const { data: lead } = await (supabase as any)
      .from("leads")
      .select("name, phone")
      .eq("id", appointment.lead_id)
      .maybeSingle();
    if (!lead?.phone) return;

    let agentName: string | null = null;
    if (agentId) {
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("id", agentId)
        .maybeSingle();
      agentName = prof?.full_name ?? null;
    }

    const completedAt = new Date();
    const scheduledFor = new Date(
      completedAt.getTime() + auto.delay_hours * 60 * 60 * 1000,
    );

    const rendered = renderTemplateBody(template.body, {
      firstName: lead.name,
      agentName,
      appointmentDate: completedAt.toLocaleDateString("pt-PT"),
      appointmentTime: completedAt.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    await (supabase as any).from("leadchef_scheduled_messages").insert({
      workspace_id: workspaceId,
      lead_id: appointment.lead_id,
      profile_id: appointment.profile_id ?? null,
      agent_id: agentId,
      source_appointment_id: appointment.id,
      template_id: template.id,
      channel: "whatsapp",
      rendered_body: rendered,
      scheduled_for: scheduledFor.toISOString(),
      metadata: {
        source: "auto_post_demo",
        enrolled_stage: enrolledStage,
        delay_hours: auto.delay_hours,
        template_name: template.name,
      },
    });
  } catch (e) {
    console.warn("[LeadChef] auto post-demo enqueue failed", e);
  }
}

interface Input {
  appointment: LeadChefAppointment;
  outcome: LeadChefAppointmentOutcome;
  notes?: string;
  /** Próxima ação a criar opcionalmente */
  nextAction?: {
    type: LeadChefAppointmentType;
    scheduled_at: string;
    note?: string;
  } | null;
}

const OUTCOME_TO_STAGE: Partial<Record<LeadChefAppointmentOutcome, LeadChefStage>> = {
  proposal_sent: "proposal_decision",
  won: "won",
  no_interest: "lost",
};

export function useCompleteLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ appointment, outcome, notes, nextAction }: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      const newNotes = notes
        ? appointment.notes
          ? `${appointment.notes}\n\n${notes}`
          : notes
        : appointment.notes;

      const { error } = await (supabase as any)
        .from("leadchef_appointments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          outcome,
          notes: newNotes,
        })
        .eq("id", appointment.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      // Atualizações de stage automáticas
      let nextStage: LeadChefStage | null = OUTCOME_TO_STAGE[outcome] ?? null;
      if (appointment.type === "demo" && outcome === "done") nextStage = "demo_done";

      if (nextStage && appointment.profile_id) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ stage: nextStage })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId);

        if ((nextStage === "won" || nextStage === "lost") && appointment.lead_id) {
          await supabase
            .from("leads")
            .update({ status: "completed" } as any)
            .eq("id", appointment.lead_id)
            .eq("workspace_id", workspaceId);
        }
      }

      // Próxima ação
      if (nextAction && appointment.profile_id) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({
            next_action_type: nextAction.type,
            next_action_at: nextAction.scheduled_at,
            next_action_note: nextAction.note || null,
          })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId);
      } else if (appointment.profile_id) {
        // Limpar next action se ela apontava para este compromisso
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ next_action_at: null, next_action_type: null, next_action_note: null })
          .eq("id", appointment.profile_id)
          .eq("workspace_id", workspaceId)
          .eq("next_action_at", appointment.scheduled_at);
      }

      // Histórico
      if (appointment.lead_id) {
        try {
          await supabase.from("crm_activities").insert({
            workspace_id: workspaceId,
            entity_type: "lead",
            entity_id: appointment.lead_id,
            lead_id: appointment.lead_id,
            activity_type: "meeting_completed",
            title: `LeadChef: ${appointment.title} — concluído`,
            description: notes || null,
            metadata: {
              source: "leadchef",
              appointment_id: appointment.id,
              outcome,
              new_stage: nextStage,
            },
            performed_by: user?.id || null,
          } as any);
        } catch (e) {
          console.warn("[LeadChef] history insert failed", e);
        }
      }

      // Auto pós-demo: agendar mensagem de poupança 24h depois
      await enqueuePostDemoMessage({
        workspaceId,
        appointment,
        enrolledStage: nextStage,
        agentId: user?.id ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-activities"] });
      qc.invalidateQueries({ queryKey: ["leadchef-scheduled-messages"] });
      qc.invalidateQueries({ queryKey: ["leadchef-scheduled-messages-pending"] });
      toast.success("Compromisso concluído.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao concluir compromisso."),
  });
}
