import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ChartItem { name: string; value: number }
interface MaintenanceItem { month: string; scheduled: number; completed: number }
interface PipelineItem { stage: string; count: number; label: string }
interface AlertItem { id: string; type: string; title: string; subtitle: string; severity: string; date: string; href: string }

export function useSecurityDashboardCharts() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: charts, isLoading } = useQuery({
    queryKey: ["security-dashboard-charts", wsId],
    queryFn: async () => {
      if (!wsId) return defaultCharts();

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [occRes, sysRes, contRes, docsRes, visitsRes, requestsRes, leadsRes, proposalsRes] = await Promise.all([
        supabase.from("security_occurrences").select("severity, status, title, id, occurred_at, security_systems(security_installation_sites(site_name))").eq("workspace_id", wsId),
        supabase.from("security_systems").select("system_type, status").eq("workspace_id", wsId),
        supabase.from("security_contracts").select("contract_status").eq("workspace_id", wsId),
        supabase.from("security_documents").select("status").eq("workspace_id", wsId),
        supabase.from("security_maintenance_visits")
          .select("visit_status, scheduled_at, id, security_systems(security_installation_sites(site_name))")
          .eq("workspace_id", wsId)
          .gte("scheduled_at", sixMonthsAgo.toISOString()),
        supabase.from("security_partner_requests").select("extraction_status").eq("workspace_id", wsId),
        supabase.from("security_leads").select("status").eq("workspace_id", wsId),
        supabase.from("security_proposals").select("status").eq("workspace_id", wsId),
      ]);

      // Pipeline funnel
      const requests = requestsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const contracts = contRes.data ?? [];
      const systems = sysRes.data ?? [];

      const pipeline: PipelineItem[] = [
        { stage: "requests", count: requests.length, label: "Pedidos" },
        { stage: "leads", count: leads.length, label: "Leads" },
        { stage: "proposals", count: proposals.length, label: "Propostas" },
        { stage: "contracts", count: contracts.length, label: "Contratos" },
        { stage: "systems", count: systems.filter((s: any) => s.status === "active").length, label: "Sistemas Ativos" },
      ];

      // Critical alerts
      const alerts: AlertItem[] = [];
      
      // Overdue maintenance visits
      const now = new Date();
      (visitsRes.data ?? []).forEach((v: any) => {
        if (v.visit_status === "scheduled" && v.scheduled_at && new Date(v.scheduled_at) < now) {
          const site = (v.security_systems as any)?.security_installation_sites as any;
          alerts.push({
            id: v.id,
            type: "maintenance",
            title: "Manutenção em atraso",
            subtitle: site?.site_name || "—",
            severity: "high",
            date: v.scheduled_at,
            href: `/dashboard/security/maintenance/${v.id}`,
          });
        }
      });

      // Open critical/high occurrences
      (occRes.data ?? []).forEach((o: any) => {
        if ((o.status === "open" || o.status === "in_progress") && (o.severity === "critical" || o.severity === "high")) {
          const site = (o.security_systems as any)?.security_installation_sites as any;
          alerts.push({
            id: o.id,
            type: "occurrence",
            title: o.title || "Ocorrência",
            subtitle: site?.site_name || "—",
            severity: o.severity,
            date: o.occurred_at || "",
            href: `/dashboard/security/occurrences/${o.id}`,
          });
        }
      });

      // Pending requests needing review
      requests.filter((r: any) => r.extraction_status === "needs_review").forEach((_r: any, i: number) => {
        if (i < 3) {
          alerts.push({
            id: `req-${i}`,
            type: "request",
            title: "Pedido necessita revisão",
            subtitle: "",
            severity: "medium",
            date: "",
            href: "/dashboard/security/partner-requests",
          });
        }
      });

      alerts.sort((a, b) => {
        const sev = { critical: 0, high: 1, medium: 2, low: 3 };
        return (sev[a.severity as keyof typeof sev] ?? 3) - (sev[b.severity as keyof typeof sev] ?? 3);
      });

      // Conversion rates
      const wonLeads = leads.filter((l: any) => l.status === "won").length;
      const acceptedProposals = proposals.filter((p: any) => p.status === "accepted").length;
      const conversionRates = {
        requestToLead: requests.length > 0 ? Math.round((leads.length / requests.length) * 100) : 0,
        leadToProposal: leads.length > 0 ? Math.round((proposals.length / leads.length) * 100) : 0,
        proposalToContract: proposals.length > 0 ? Math.round((acceptedProposals / proposals.length) * 100) : 0,
        leadWinRate: leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0,
      };

      return {
        occurrencesBySeverity: groupBy(occRes.data ?? [], "severity"),
        systemsByType: groupBy(systems, "system_type"),
        contractsByStatus: groupBy(contracts, "contract_status"),
        documentsByStatus: groupBy(docsRes.data ?? [], "status"),
        maintenanceCompliance: computeMaintenanceCompliance(visitsRes.data ?? []),
        pipeline,
        alerts: alerts.slice(0, 8),
        conversionRates,
      };
    },
    enabled: !!wsId,
  });

  return { charts: charts ?? defaultCharts(), isLoading };
}

function defaultCharts() {
  return {
    occurrencesBySeverity: [] as ChartItem[],
    systemsByType: [] as ChartItem[],
    contractsByStatus: [] as ChartItem[],
    documentsByStatus: [] as ChartItem[],
    maintenanceCompliance: [] as MaintenanceItem[],
    pipeline: [] as PipelineItem[],
    alerts: [] as AlertItem[],
    conversionRates: { requestToLead: 0, leadToProposal: 0, proposalToContract: 0, leadWinRate: 0 },
  };
}

function groupBy(items: any[], key: string): ChartItem[] {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const val = item[key] ?? "unknown";
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function computeMaintenanceCompliance(visits: any[]): MaintenanceItem[] {
  const months: Record<string, { scheduled: number; completed: number }> = {};
  visits.forEach((v) => {
    if (!v.scheduled_at) return;
    const d = new Date(v.scheduled_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { scheduled: 0, completed: 0 };
    months[key].scheduled++;
    if (v.visit_status === "completed") months[key].completed++;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
