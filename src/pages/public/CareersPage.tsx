import { useParams, Link } from "react-router-dom";
import { usePublicWorkspace, usePublicJobs, usePublicExternalJobs, type ExternalJobOffer } from "@/hooks/hr/usePublicJobs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Search, Building2, ArrowRight, Clock, Users, ExternalLink, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", intern: "Estágio",
};

const REMOTE_LABELS: Record<string, string> = {
  office: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

const EMPLOYMENT_ICONS: Record<string, typeof Clock> = {
  full_time: Clock, part_time: Clock, contract: Briefcase, intern: Users,
};

export default function CareersPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const { data: jobs, isLoading: jobsLoading } = usePublicJobs(workspace?.id);
  const { data: externalJobs = [], isLoading: extLoading } = usePublicExternalJobs(workspace?.id);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Merge internal and external into unified list
  type UnifiedJob = {
    id: string;
    title: string;
    location: string | null;
    employment_type: string | null;
    remote_option: string | null;
    slug: string | null;
    source: "internal" | "external";
    source_platform?: string | null;
    source_url?: string | null;
    published_at: string | null;
  };

  const allJobs = useMemo<UnifiedJob[]>(() => {
    const internal: UnifiedJob[] = (jobs || []).map(j => ({
      id: j.id, title: j.title, location: j.location,
      employment_type: j.employment_type, remote_option: j.remote_option,
      slug: j.slug, source: "internal" as const, published_at: j.published_at,
    }));
    const external: UnifiedJob[] = externalJobs.map(j => ({
      id: j.id, title: j.title || "Sem título", location: j.location,
      employment_type: j.extracted_data?.employment_type || null,
      remote_option: null, slug: null, source: "external" as const,
      source_platform: j.source_platform, source_url: j.source_url,
      published_at: j.created_at,
    }));
    return [...internal, ...external];
  }, [jobs, externalJobs]);

  const filtered = useMemo(() => {
    return allJobs.filter(j => {
      if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (remoteFilter !== "all" && j.remote_option !== remoteFilter) return false;
      if (sourceFilter === "internal" && j.source !== "internal") return false;
      if (sourceFilter === "external" && j.source !== "external") return false;
      return true;
    });
  }, [allJobs, search, typeFilter, remoteFilter, sourceFilter]);

  const companyName = workspace?.company_name || workspace?.name || "";

  if (wsLoading) return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton height={200} borderRadius={16} />
      <Skeleton count={3} height={100} borderRadius={12} />
    </div>
  );

  if (!workspace) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-lg">Página não encontrada</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Carreiras — {companyName}</title>
        <meta name="description" content={`Vagas abertas em ${companyName}. Junte-se à nossa equipa!`} />
      </Helmet>

      {/* Hero */}
      <div className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto px-6 py-16 text-center space-y-5"
        >
          {workspace.logo_url && (
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              src={workspace.logo_url}
              alt={companyName}
              className="h-20 mx-auto object-contain drop-shadow-lg"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{companyName}</h1>
          <p className="text-xl text-muted-foreground font-light">Junte-se à nossa equipa</p>
          {workspace.website && (
            <a
              href={workspace.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-full"
            >
              <Building2 className="h-4 w-4" />
              {workspace.website.replace(/https?:\/\//, "")}
            </a>
          )}
        </motion.div>
      </div>

      {/* Filters + Jobs */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar vagas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl border-border/60 focus:border-primary/50"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-11 rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={remoteFilter} onValueChange={setRemoteFilter}>
            <SelectTrigger className="w-[150px] h-11 rounded-xl"><SelectValue placeholder="Modalidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(REMOTE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "vaga aberta" : "vagas abertas"}
          </p>
        </div>

        {jobsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} height={100} borderRadius={12} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-16 text-center border-dashed">
              <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-5" />
              <h3 className="text-xl font-semibold text-foreground">Sem vagas disponíveis</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                De momento não temos vagas abertas. Volte mais tarde ou ajuste os filtros de pesquisa.
              </p>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Link to={`/careers/${workspaceSlug}/${job.slug}`} className="block group">
                    <Card className="border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden">
                      <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{job.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            {job.employment_type && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}
                              </Badge>
                            )}
                            {job.remote_option && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {REMOTE_LABELS[job.remote_option] || job.remote_option}
                              </Badge>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />{job.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Powered by FastCRM
        </div>
      </div>
    </div>
  );
}
