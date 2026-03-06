import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { differenceInHours, differenceInDays, startOfDay, startOfWeek } from "date-fns";

export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadStatus = "new" | "in_progress" | "completed";
export type NextActionType = "reply_manual" | "send_template" | "create_opportunity" | "activate_automation" | "archive" | "follow_up";
export type LeadType = "lead" | "client" | "supplier" | "spam" | "unknown";
export type SmartFilterType = "hot" | "no_response" | "high_intent" | "automation_active" | "today" | "this_week";

export interface SmartLead {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  // AI fields
  ai_temperature: LeadTemperature;
  lead_score: number;
  ai_next_action: string | null;
  ai_next_action_type: NextActionType | null;
  ai_insight: string | null;
  ai_lead_type: LeadType | null;
  estimated_value: number;
  conversion_probability: number;
  ai_analyzed_at: string | null;
  assigned_to: string | null;
  automation_active: boolean;
  company_name: string | null;
  // Computed fields
  hoursSinceLastContact: number | null;
  slaBreach: boolean;
  // Relations
  conversations?: Array<{
    id: string;
    channel: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
  }>;
  opportunities?: Array<{
    id: string;
    value: number;
    status: string;
  }>;
}

export interface SmartLeadsFilters {
  search?: string;
  status?: LeadStatus | "all";
  temperature?: LeadTemperature | "all";
  source?: string | "all";
  smartFilter?: SmartFilterType;
  assignedTo?: string | "all";
}

export interface LeadsKPIs {
  receivedToday: number;
  hotLeads: number;
  noResponseOver24h: number;
  avgResponseTimeHours: number;
  conversionsThisWeek: number;
  totalPipelineValue: number;
}

export function useSmartLeads(filters?: SmartLeadsFilters) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["smart-leads", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("leads")
        .select(`
          *,
          conversations:conversations(id, channel, last_message_at, last_message_preview, unread_count),
          opportunities:opportunities(id, value, status)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("lead_score", { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.temperature && filters.temperature !== "all") {
        query = query.eq("ai_temperature", filters.temperature);
      }

      if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }

      if (filters?.assignedTo && filters.assignedTo !== "all") {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      // Process leads with computed fields
      let leads: SmartLead[] = (data || []).map((lead: any) => {
        const lastContact = lead.last_contact_at 
          ? new Date(lead.last_contact_at) 
          : lead.conversations?.length 
            ? new Date(Math.max(...lead.conversations.map((c: any) => 
                c.last_message_at ? new Date(c.last_message_at).getTime() : 0
              )))
            : null;

        const hoursSinceLastContact = lastContact 
          ? differenceInHours(now, lastContact) 
          : null;

        return {
          ...lead,
          ai_temperature: lead.ai_temperature || "cold",
          lead_score: lead.lead_score || 0,
          estimated_value: lead.estimated_value || 0,
          conversion_probability: lead.conversion_probability || 0,
          automation_active: lead.automation_active || false,
          hoursSinceLastContact,
          slaBreach: hoursSinceLastContact !== null && hoursSinceLastContact > 24,
        } as SmartLead;
      });

      // Apply smart filters
      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot":
            leads = leads.filter(l => l.ai_temperature === "hot");
            break;
          case "no_response":
            leads = leads.filter(l => l.hoursSinceLastContact && l.hoursSinceLastContact > 24);
            break;
          case "high_intent":
            leads = leads.filter(l => l.lead_score >= 70);
            break;
          case "automation_active":
            leads = leads.filter(l => l.automation_active);
            break;
          case "today":
            leads = leads.filter(l => new Date(l.created_at) >= today);
            break;
          case "this_week":
            leads = leads.filter(l => new Date(l.created_at) >= weekStart);
            break;
        }
      }

      return leads;
    },
    enabled: !!currentWorkspace,
  });
}

export function useLeadsKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["leads-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<LeadsKPIs> => {
      if (!currentWorkspace) {
        return {
          receivedToday: 0,
          hotLeads: 0,
          noResponseOver24h: 0,
          avgResponseTimeHours: 0,
          conversionsThisWeek: 0,
          totalPipelineValue: 0,
        };
      }

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch all leads with their conversations and opportunities
      const { data: leads, error } = await workspaceClient
        .from("leads")
        .select(`
          *,
          conversations:conversations(last_message_at),
          opportunities:opportunities(value, status)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      const receivedToday = leads?.filter(l => 
        new Date(l.created_at) >= today
      ).length || 0;

      const hotLeads = leads?.filter(l => 
        l.ai_temperature === "hot"
      ).length || 0;

      const noResponseOver24h = leads?.filter(l => {
        const lastConv = l.conversations?.sort((a: any, b: any) => 
          new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        )[0];
        return lastConv?.last_message_at && lastConv.last_message_at < threshold24h;
      }).length || 0;

      const conversionsThisWeek = leads?.filter(l => 
        l.status === "completed" && new Date(l.updated_at) >= weekStart
      ).length || 0;

      const totalPipelineValue = leads?.reduce((sum, l) => {
        const openOpps = l.opportunities?.filter((o: any) => o.status === "open") || [];
        return sum + openOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
      }, 0) || 0;

      // Calculate average response time (simplified)
      let totalResponseHours = 0;
      let responseCount = 0;
      leads?.forEach(l => {
        if (l.last_contact_at && l.created_at) {
          const hours = differenceInHours(new Date(l.last_contact_at), new Date(l.created_at));
          if (hours > 0 && hours < 168) { // Within a week
            totalResponseHours += hours;
            responseCount++;
          }
        }
      });

      return {
        receivedToday,
        hotLeads,
        noResponseOver24h,
        avgResponseTimeHours: responseCount > 0 ? Math.round(totalResponseHours / responseCount) : 0,
        conversionsThisWeek,
        totalPipelineValue,
      };
    },
    enabled: !!currentWorkspace,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useAnalyzeLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      messages, 
      conversationChannel,
      existingOpportunities 
    }: {
      leadId: string;
      messages?: Array<{ direction: string; content: string; sent_at: string }>;
      conversationChannel?: string;
      existingOpportunities?: Array<{ value: number; status: string }>;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("ai-analyze-lead", {
        body: {
          leadId,
          workspaceId: currentWorkspace.id,
          messages,
          conversationChannel,
          existingOpportunities,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
      console.log('[LEADS] AI analysis complete:', variables.leadId);

      if (currentWorkspace?.id && data) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LEAD.SCORED',
          entity_kind: 'lead',
          entity_id: variables.leadId,
          source_module: 'crm-leads',
          payload: {
            lead_score: data.lead_score,
            ai_temperature: data.ai_temperature,
            source: 'ai-analyze',
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[LEADS] AI_ANALYZE_FAILED', error.message);
    }
  });
}

export function useBulkAnalyzeLeads() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const results = await Promise.allSettled(
        leadIds.map(async (leadId) => {
          const { data, error } = await supabase.functions.invoke("ai-analyze-lead", {
            body: {
              leadId,
              workspaceId: currentWorkspace.id,
            }
          });
          if (error) throw error;
          return data;
        })
      );

      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;

      return { successful, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
    }
  });
}