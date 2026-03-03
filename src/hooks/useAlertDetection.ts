import { useEffect, useRef } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useProposals } from "@/hooks/useProposals";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useLeads } from "@/hooks/useLeads";
import { useRFQs } from "@/hooks/useRFQ";
import { useCreateAlert, detectAlerts, AlertType } from "@/hooks/useSmartAlerts";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

export function useAlertDetection() {
  const { currentWorkspace } = useWorkspace();
  const { data: conversations } = useConversations({ status: "open" });
  const { data: proposals } = useProposals();
  const { data: opportunities } = useOpportunities();
  const { data: leads } = useLeads();
  const { data: rfqs } = useRFQs(currentWorkspace?.id);
  const createAlert = useCreateAlert();
  
  const lastRunRef = useRef<number>(0);
  const MIN_INTERVAL = 5 * 60 * 1000; // Run at most every 5 minutes

  useEffect(() => {
    if (!currentWorkspace) return;
    
    const now = Date.now();
    if (now - lastRunRef.current < MIN_INTERVAL) return;
    
    // Only run if we have data
    if (!conversations?.length && !proposals?.length && !opportunities?.length && !leads?.length && !rfqs?.length) {
      return;
    }

    lastRunRef.current = now;

    // Prepare data for alert detection
    const conversationData = conversations?.map((c) => ({
      id: c.id,
      lead_id: c.lead_id,
      lead_name: c.lead?.name,
      last_message_at: c.last_message_at,
      status: c.status,
      temperature_score: undefined, // Would need to calculate
      ai_tags: (c as any).ai_tags as string[] | undefined,
    }));

    const proposalData = proposals?.map((p) => ({
      id: p.id,
      title: p.title,
      views_count: p.views_count || 0,
      opportunity_id: p.opportunity_id,
      expires_at: p.expires_at,
      status: p.status,
    }));

    const opportunityData = opportunities?.map((o) => ({
      id: o.id,
      title: o.title,
      lead_id: o.lead_id,
      updated_at: o.updated_at,
      status: o.status,
      value: o.value,
    }));

    const leadData = leads?.map((l) => ({
      id: l.id,
      name: l.name,
      last_contact_at: (l as any).last_contact_at as string | null,
      status: l.status,
    }));

    const rfqData = rfqs?.map((r: any) => ({
      id: r.id,
      title: r.title,
      rfq_number: r.rfq_number,
      due_date: r.due_date,
      status: r.status,
      project_id: r.project_id,
    }));

    // Detect alerts
    const detectedAlerts = detectAlerts({
      conversations: conversationData,
      proposals: proposalData,
      opportunities: opportunityData,
      leads: leadData,
      rfqs: rfqData,
    });

    // Create alerts (the hook handles deduplication)
    detectedAlerts.forEach((alert) => {
      createAlert.mutate({
        conversation_id: alert.conversation_id,
        lead_id: alert.lead_id,
        opportunity_id: alert.opportunity_id,
        proposal_id: alert.proposal_id,
        alert_type: alert.alert_type as AlertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        action_label: alert.action_label,
        action_url: alert.action_url,
        context_data: alert.context_data as Record<string, unknown>,
        expires_at: alert.expires_at,
      });

      // Also create admin notification for RFQ deadlines
      if (alert.alert_type === "rfq_deadline_approaching" && currentWorkspace) {
        supabase.from("admin_notifications").insert({
          workspace_id: currentWorkspace.id,
          type: "rfq_deadline",
          title: alert.title,
          message: alert.description,
          metadata: alert.context_data as Record<string, unknown>,
        } as any).then(() => {});
      }
    });
  }, [
    currentWorkspace?.id,
    conversations?.length,
    proposals?.length,
    opportunities?.length,
    leads?.length,
    rfqs?.length,
  ]);
}
