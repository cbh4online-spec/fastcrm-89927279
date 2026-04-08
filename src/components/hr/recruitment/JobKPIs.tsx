import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Users, TrendingUp, Clock } from "lucide-react";
import type { JobPosting } from "@/hooks/hr/useJobPostings";

interface JobKPIsProps {
  jobs: JobPosting[];
  candidateCount: number;
}

export function JobKPIs({ jobs, candidateCount }: JobKPIsProps) {
  const activeJobs = jobs.filter(j => j.status === "active").length;
  const draftJobs = jobs.filter(j => j.status === "draft").length;
  const closedJobs = jobs.filter(j => j.status === "closed").length;

  const kpis = [
    { label: "Vagas Activas", value: activeJobs, icon: Briefcase, color: "text-green-600" },
    { label: "Rascunhos", value: draftJobs, icon: Clock, color: "text-amber-600" },
    { label: "Total Candidatos", value: candidateCount, icon: Users, color: "text-blue-600" },
    { label: "Fechadas", value: closedJobs, icon: TrendingUp, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <Card key={kpi.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
