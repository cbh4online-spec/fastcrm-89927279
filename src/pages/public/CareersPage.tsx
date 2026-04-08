import { useParams, Link } from "react-router-dom";
import { usePublicWorkspace, usePublicJobs } from "@/hooks/hr/usePublicJobs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Search, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Helmet } from "react-helmet-async";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", intern: "Estágio",
};

const REMOTE_LABELS: Record<string, string> = {
  office: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

export default function CareersPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const { data: jobs, isLoading: jobsLoading } = usePublicJobs(workspace?.id);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (remoteFilter !== "all" && j.remote_option !== remoteFilter) return false;
      return true;
    });
  }, [jobs, search, typeFilter, remoteFilter]);

  const companyName = workspace?.company_name || workspace?.name || "";

  if (wsLoading) return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton height={120} />
      <Skeleton count={3} height={100} />
    </div>
  );

  if (!workspace) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Página não encontrada</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Carreiras — {companyName}</title>
        <meta name="description" content={`Vagas abertas em ${companyName}. Junte-se à nossa equipa!`} />
      </Helmet>

      {/* Hero */}
      <div className="border-b bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center space-y-4">
          {workspace.logo_url && (
            <img src={workspace.logo_url} alt={companyName} className="h-16 mx-auto object-contain" />
          )}
          <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
          <p className="text-lg text-muted-foreground">Junte-se à nossa equipa</p>
          {workspace.website && (
            <a href={workspace.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Building2 className="h-3 w-3" /> {workspace.website.replace(/https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* Filters + Jobs */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar vagas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={remoteFilter} onValueChange={setRemoteFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(REMOTE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "vaga aberta" : "vagas abertas"}
        </p>

        {jobsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} height={100} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Sem vagas disponíveis</h3>
            <p className="text-muted-foreground mt-1">Volte mais tarde ou ajuste os filtros.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <Link key={job.id} to={`/careers/${workspaceSlug}/${job.slug}`} className="block">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.employment_type && (
                          <Badge variant="outline">{EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}</Badge>
                        )}
                        {job.remote_option && (
                          <Badge variant="outline">{REMOTE_LABELS[job.remote_option] || job.remote_option}</Badge>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />{job.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Powered by FastCRM
        </div>
      </div>
    </div>
  );
}
