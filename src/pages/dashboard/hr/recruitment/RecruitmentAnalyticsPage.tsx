import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Building2, TrendingUp, Globe, UserCheck, FileText, Activity } from "lucide-react";
import Skeleton from "react-loading-skeleton";

function useRecruitmentKPIs() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["recruitment-kpis", wsId],
    queryFn: async () => {
      const [jobsRes, candidatesRes, talentRes, portalCompaniesRes, portalJobsRes] = await Promise.all([
        supabase.from("hr_job_postings").select("id, status, published_at", { count: "exact" }).eq("workspace_id", wsId!),
        supabase.from("hr_candidates").select("id, stage, source, created_at", { count: "exact" }).eq("workspace_id", wsId!),
        supabase.from("hr_talent_results").select("id, search_type, status", { count: "exact" }).eq("workspace_id", wsId!),
        supabase.from("portal_companies").select("id, status", { count: "exact" }).eq("workspace_id", wsId!),
        supabase.from("portal_job_postings").select("id, status", { count: "exact" }).eq("workspace_id", wsId!),
      ]);

      const jobs = jobsRes.data || [];
      const candidates = candidatesRes.data || [];
      const talent = talentRes.data || [];
      const portalCompanies = portalCompaniesRes.data || [];
      const portalJobs = portalJobsRes.data || [];

      const activeJobs = jobs.filter((j: any) => j.status === "active").length;
      const draftJobs = jobs.filter((j: any) => j.status === "draft").length;
      const totalCandidates = candidates.length;
      const newCandidates = candidates.filter((c: any) => c.stage === "new").length;
      const careersCandidates = candidates.filter((c: any) => c.source === "careers_page").length;
      const talentImported = talent.filter((t: any) => t.status === "imported").length;
      const talentTotal = talent.length;
      const talentCandidates = talent.filter((t: any) => t.search_type === "candidate").length;
      const talentOffers = talent.filter((t: any) => t.search_type === "job_offer").length;
      const companiesTotal = portalCompanies.length;
      const companiesActive = portalCompanies.filter((c: any) => c.status === "active").length;
      const companiesPending = portalCompanies.filter((c: any) => c.status === "pending").length;
      const portalJobsTotal = portalJobs.length;
      const portalJobsActive = portalJobs.filter((j: any) => j.status === "active").length;

      return {
        jobs: { total: jobs.length, active: activeJobs, draft: draftJobs },
        candidates: { total: totalCandidates, new: newCandidates, fromCareers: careersCandidates },
        talent: { total: talentTotal, imported: talentImported, candidates: talentCandidates, offers: talentOffers },
        portal: { companies: companiesTotal, companiesActive, companiesPending, jobs: portalJobsTotal, jobsActive: portalJobsActive },
      };
    },
    enabled: !!wsId,
  });
}

export default function RecruitmentAnalyticsPage() {
  const { data: kpis, isLoading } = useRecruitmentKPIs();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HRBreadcrumb />
        <Skeleton height={40} width={300} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} height={120} borderRadius={12} />)}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Vagas Activas", value: kpis?.jobs.active ?? 0, icon: Briefcase, color: "text-primary", sub: `${kpis?.jobs.draft ?? 0} rascunho` },
    { label: "Total Candidatos", value: kpis?.candidates.total ?? 0, icon: Users, color: "text-blue-600", sub: `${kpis?.candidates.new ?? 0} novos` },
    { label: "Via Portal Carreiras", value: kpis?.candidates.fromCareers ?? 0, icon: TrendingUp, color: "text-green-600", sub: "candidaturas orgânicas" },
    { label: "Resultados Web", value: kpis?.talent.total ?? 0, icon: Globe, color: "text-orange-600", sub: `${kpis?.talent.imported ?? 0} importados` },
    { label: "Empresas Registadas", value: kpis?.portal.companies ?? 0, icon: Building2, color: "text-purple-600", sub: `${kpis?.portal.companiesActive ?? 0} activas / ${kpis?.portal.companiesPending ?? 0} pendentes` },
    { label: "Vagas de Empresas", value: kpis?.portal.jobs ?? 0, icon: FileText, color: "text-indigo-600", sub: `${kpis?.portal.jobsActive ?? 0} activas` },
    { label: "Candidatos (Web)", value: kpis?.talent.candidates ?? 0, icon: UserCheck, color: "text-teal-600", sub: "encontrados via pesquisa" },
    { label: "Ofertas (Web)", value: kpis?.talent.offers ?? 0, icon: Activity, color: "text-rose-600", sub: "agregadas de portais" },
  ];

  return (
    <div className="space-y-6">
      <HRBreadcrumb />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics de Recrutamento</h1>
        <p className="text-muted-foreground">Visão geral do portal de emprego e recrutamento</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted ${m.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline de Recrutamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Vagas publicadas</span>
              <span className="font-medium">{kpis?.jobs.active ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Candidatos novos</span>
              <span className="font-medium">{kpis?.candidates.new ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxa conversão (orgânico)</span>
              <span className="font-medium">
                {kpis && kpis.candidates.total > 0
                  ? `${Math.round((kpis.candidates.fromCareers / kpis.candidates.total) * 100)}%`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portal de Empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Empresas registadas</span>
              <span className="font-medium">{kpis?.portal.companies ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pendentes de aprovação</span>
              <span className="font-medium">{kpis?.portal.companiesPending ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Vagas submetidas</span>
              <span className="font-medium">{kpis?.portal.jobs ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inteligência Web</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total pesquisado</span>
              <span className="font-medium">{kpis?.talent.total ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Importados para CRM</span>
              <span className="font-medium">{kpis?.talent.imported ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxa importação</span>
              <span className="font-medium">
                {kpis && kpis.talent.total > 0
                  ? `${Math.round((kpis.talent.imported / kpis.talent.total) * 100)}%`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
