import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PartnerMetric {
  partnerId: string;
  partnerName: string;
  totalRequests: number;
  convertedLeads: number;
  wonDeals: number;
  totalRevenue: number;
  conversionRate: number;
}

interface MonthlyRevenue {
  month: string;
  value: number;
  contracts: number;
}

interface ManagementData {
  totalActiveContracts: number;
  totalContractValue: number;
  avgContractValue: number;
  totalProposalValue: number;
  winRate: number;
  avgDealCycle: number;
  renewalRate: number;
  slaCompliance: number;
  partnerMetrics: PartnerMetric[];
  monthlyRevenue: MonthlyRevenue[];
  contractsByType: { name: string; value: number; revenue: number }[];
  systemsByType: { name: string; value: number }[];
  occurrenceResolution: { avgHours: number; slaMetPct: number; totalClosed: number };
  maintenanceCompliance: number;
  pipelineSummary: { stage: string; count: number; value: number }[];
}

export function useSecurityManagement() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["security-management", wsId],
    queryFn: async (): Promise<ManagementData> => {
      if (!wsId) return defaultData();

      const [contractsRes, proposalsRes, leadsRes, requestsRes, systemsRes, occurrencesRes, renewalsRes, visitsRes] = await Promise.all([
        supabase.from("security_contracts").select("id, contract_type, contract_status, start_date, end_date, commercial_terms_json, lead_id").eq("workspace_id", wsId),
        supabase.from("security_proposals").select("id, status, total_value, created_at, lead_id").eq("workspace_id", wsId),
        supabase.from("security_leads").select("id, status, source_partner_id, created_at, security_partners(company_name)").eq("workspace_id", wsId),
        supabase.from("security_partner_requests").select("id, partner_id, extraction_status, created_at, security_partners(company_name)").eq("workspace_id", wsId),
        supabase.from("security_systems").select("system_type, status").eq("workspace_id", wsId),
        supabase.from("security_occurrences").select("status, severity, sla_resolution_met, created_at, resolved_at").eq("workspace_id", wsId),
        supabase.from("security_renewals").select("renewal_stage, renewal_value").eq("workspace_id", wsId),
        supabase.from("security_maintenance_visits").select("visit_status, scheduled_at").eq("workspace_id", wsId),
      ]);

      const contracts = contractsRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const requests = requestsRes.data ?? [];
      const systems = systemsRes.data ?? [];
      const occurrences = occurrencesRes.data ?? [];
      const renewals = renewalsRes.data ?? [];
      const visits = visitsRes.data ?? [];

      // Active contracts & value
      const activeContracts = contracts.filter((c: any) => c.contract_status === "active");
      const getContractValue = (c: any) => {
        try {
          const terms = typeof c.commercial_terms_json === "string" ? JSON.parse(c.commercial_terms_json) : c.commercial_terms_json;
          return Number(terms?.monthly_value || terms?.total_value || terms?.annual_value || 0);
        } catch { return 0; }
      };
      const totalContractValue = activeContracts.reduce((sum: number, c: any) => sum + getContractValue(c), 0);
      const avgContractValue = activeContracts.length > 0 ? totalContractValue / activeContracts.length : 0;

      // Proposals value
      const totalProposalValue = proposals.reduce((sum: number, p: any) => sum + (Number(p.total_value) || 0), 0);

      // Win rate
      const wonLeads = leads.filter((l: any) => l.status === "won").length;
      const closedLeads = leads.filter((l: any) => ["won", "lost"].includes(l.status)).length;
      const winRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;

      // Partner metrics
      const partnerMap = new Map<string, PartnerMetric>();
      requests.forEach((r: any) => {
        const pid = r.partner_id || "unknown";
        const pname = (r.security_partners as any)?.company_name || "Sem Parceiro";
        if (!partnerMap.has(pid)) {
          partnerMap.set(pid, { partnerId: pid, partnerName: pname, totalRequests: 0, convertedLeads: 0, wonDeals: 0, totalRevenue: 0, conversionRate: 0 });
        }
        partnerMap.get(pid)!.totalRequests++;
      });
      leads.forEach((l: any) => {
        const pid = l.source_partner_id || "unknown";
        const pname = (l.security_partners as any)?.company_name || "Sem Parceiro";
        if (!partnerMap.has(pid)) {
          partnerMap.set(pid, { partnerId: pid, partnerName: pname, totalRequests: 0, convertedLeads: 0, wonDeals: 0, totalRevenue: 0, conversionRate: 0 });
        }
        partnerMap.get(pid)!.convertedLeads++;
        if (l.status === "won") partnerMap.get(pid)!.wonDeals++;
      });
      const partnerMetrics = Array.from(partnerMap.values()).map((p) => ({
        ...p,
        conversionRate: p.totalRequests > 0 ? Math.round((p.wonDeals / p.totalRequests) * 100) : 0,
      })).sort((a, b) => b.wonDeals - a.wonDeals);

      // Monthly revenue (from contract start dates)
      const monthlyMap = new Map<string, { value: number; contracts: number }>();
      activeContracts.forEach((c: any) => {
        const d = c.start_date ? new Date(c.start_date) : new Date(c.created_at || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const prev = monthlyMap.get(key) || { value: 0, contracts: 0 };
        monthlyMap.set(key, { value: prev.value + getContractValue(c), contracts: prev.contracts + 1 });
      });
      const monthlyRevenue = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, data]) => ({ month, ...data }));

      // Contracts by type
      const typeMap = new Map<string, { count: number; revenue: number }>();
      contracts.forEach((c: any) => {
        const t = c.contract_type || "other";
        const prev = typeMap.get(t) || { count: 0, revenue: 0 };
        typeMap.set(t, { count: prev.count + 1, revenue: prev.revenue + getContractValue(c) });
      });
      const contractsByType = Array.from(typeMap.entries()).map(([name, data]) => ({ name, value: data.count, revenue: data.revenue }));

      // Systems by type
      const sysMap = new Map<string, number>();
      systems.forEach((s: any) => {
        const t = s.system_type || "other";
        sysMap.set(t, (sysMap.get(t) || 0) + 1);
      });
      const systemsByType = Array.from(sysMap.entries()).map(([name, value]) => ({ name, value }));

      // Occurrence resolution
      const closedOccs = occurrences.filter((o: any) => ["resolved", "closed"].includes(o.status));
      const slaMetCount = closedOccs.filter((o: any) => o.sla_resolution_met === true).length;
      const avgResolutionHours = closedOccs.length > 0
        ? closedOccs.reduce((sum: number, o: any) => {
            if (o.resolved_at && o.created_at) {
              return sum + (new Date(o.resolved_at).getTime() - new Date(o.created_at).getTime()) / 3600000;
            }
            return sum;
          }, 0) / closedOccs.length
        : 0;

      // Renewal rate
      const renewedCount = renewals.filter((r: any) => r.renewal_stage === "renewed").length;
      const completedRenewals = renewals.filter((r: any) => ["renewed", "lost", "expired"].includes(r.renewal_stage)).length;
      const renewalRate = completedRenewals > 0 ? Math.round((renewedCount / completedRenewals) * 100) : 0;

      // Maintenance compliance
      const completedVisits = visits.filter((v: any) => v.visit_status === "completed").length;
      const totalScheduled = visits.filter((v: any) => ["completed", "scheduled"].includes(v.visit_status)).length;
      const maintenanceCompliance = totalScheduled > 0 ? Math.round((completedVisits / totalScheduled) * 100) : 100;

      // SLA compliance
      const slaCompliance = closedOccs.length > 0 ? Math.round((slaMetCount / closedOccs.length) * 100) : 100;

      // Pipeline summary
      const acceptedProposals = proposals.filter((p: any) => p.status === "accepted");
      const pipelineSummary = [
        { stage: "Pedidos", count: requests.length, value: 0 },
        { stage: "Leads", count: leads.length, value: 0 },
        { stage: "Propostas", count: proposals.length, value: totalProposalValue },
        { stage: "Adjudicadas", count: acceptedProposals.length, value: acceptedProposals.reduce((s: number, p: any) => s + (Number(p.total_value) || 0), 0) },
        { stage: "Contratos Ativos", count: activeContracts.length, value: totalContractValue },
      ];

      return {
        totalActiveContracts: activeContracts.length,
        totalContractValue,
        avgContractValue,
        totalProposalValue,
        winRate,
        avgDealCycle: 0,
        renewalRate,
        slaCompliance,
        partnerMetrics,
        monthlyRevenue,
        contractsByType,
        systemsByType,
        occurrenceResolution: { avgHours: Math.round(avgResolutionHours), slaMetPct: slaCompliance, totalClosed: closedOccs.length },
        maintenanceCompliance,
        pipelineSummary,
      };
    },
    enabled: !!wsId,
  });

  return { data: data ?? defaultData(), isLoading };
}

function defaultData(): ManagementData {
  return {
    totalActiveContracts: 0,
    totalContractValue: 0,
    avgContractValue: 0,
    totalProposalValue: 0,
    winRate: 0,
    avgDealCycle: 0,
    renewalRate: 0,
    slaCompliance: 0,
    partnerMetrics: [],
    monthlyRevenue: [],
    contractsByType: [],
    systemsByType: [],
    occurrenceResolution: { avgHours: 0, slaMetPct: 0, totalClosed: 0 },
    maintenanceCompliance: 0,
    pipelineSummary: [],
  };
}
