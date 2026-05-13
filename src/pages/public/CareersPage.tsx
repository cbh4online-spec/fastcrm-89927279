import { useParams, Link } from "react-router-dom";
import { usePublicWorkspace, usePublicJobs, usePublicExternalJobs } from "@/hooks/hr/usePublicJobs";
import { usePublicPortalJobs } from "@/hooks/hr/usePortalCompany";
import { usePublicWorkerListings, type PortalWorkerListing } from "@/hooks/hr/usePortalWorker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, MapPin, Search, Building2, ArrowRight, Clock, Users, ExternalLink, Globe, UserPlus, User, Star } from "lucide-react";
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

const PLATFORM_LABELS: Record<string, string> = {
  "JobLeads": "JobLeads",
  "DataAnnotation": "DataAnnotation",
  "Sapo Emprego": "Sapo Emprego",
  "Alerta Emprego": "Alerta Emprego",
  "Portal Emprego": "Portal Emprego",
  "Indeed PT": "Indeed PT",
  "Expresso Emprego": "Expresso Emprego",
  "IEFP": "IEFP",
  "Emprego Público": "Emprego Público",
  "LinkedIn": "LinkedIn",
  "Net-Empregos": "Net-Empregos",
};

function getFaviconUrl(url: string | null | undefined, platform?: string | null): string | null {
  // Try platform-specific domain for better favicons
  const platformDomains: Record<string, string> = {
    "JobLeads": "jobleads.com",
    "DataAnnotation": "dataannotation.tech",
    "Sapo Emprego": "emprego.sapo.pt",
    "Alerta Emprego": "alertaemprego.pt",
    "Portal Emprego": "portalemprego.pt",
    "Indeed PT": "pt.indeed.com",
    "Expresso Emprego": "expressoemprego.pt",
    "IEFP": "iefp.pt",
    "Emprego Público": "empregopublico.gov.pt",
    "LinkedIn": "linkedin.com",
    "Net-Empregos": "net-empregos.com",
  };

  const domain = platform && platformDomains[platform]
    ? platformDomains[platform]
    : url ? (() => { try { return new URL(url).hostname; } catch { return null; } })() : null;

  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

type UnifiedJob = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  remote_option: string | null;
  slug: string | null;
  source: "internal" | "external" | "portal";
  source_platform?: string | null;
  source_url?: string | null;
  logo_url?: string | null;
  company_name?: string | null;
  published_at: string | null;
  skills?: string[];
};

export default function CareersPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const { data: jobs, isLoading: jobsLoading } = usePublicJobs(workspace?.id);
  const { data: externalJobs = [], isLoading: extLoading } = usePublicExternalJobs(workspace?.id);
  const { data: portalJobs = [], isLoading: portalLoading } = usePublicPortalJobs(workspace?.id);
  const { data: workerListings = [], isLoading: workersLoading } = usePublicWorkerListings(workspace?.id);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const allJobs = useMemo<UnifiedJob[]>(() => {
    const internal: UnifiedJob[] = (jobs || []).map(j => ({
      id: j.id, title: j.title, description: j.description || null, location: j.location,
      employment_type: j.employment_type, remote_option: j.remote_option,
      slug: j.slug, source: "internal" as const, published_at: j.published_at,
      logo_url: workspace?.logo_url || null, company_name: workspace?.company_name || workspace?.name || null,
    }));
    const external: UnifiedJob[] = externalJobs.map(j => ({
      id: j.id, title: j.title || "Sem título", description: j.description, location: j.location,
      employment_type: j.extracted_data?.employment_type || null, remote_option: null,
      slug: null, source: "external" as const, source_platform: j.source_platform,
      source_url: j.source_url, published_at: j.created_at,
      logo_url: getFaviconUrl(j.source_url, j.source_platform), company_name: j.extracted_data?.company || j.source_platform,
      skills: j.skills,
    }));
    const portal: UnifiedJob[] = portalJobs.map(j => ({
      id: j.id, title: j.title, description: j.description, location: j.location,
      employment_type: j.employment_type, remote_option: j.remote_option,
      slug: null, source: "portal" as const, published_at: j.published_at,
      logo_url: (j.portal_companies as any)?.logo_url || null,
      company_name: (j.portal_companies as any)?.name || null,
    }));
    return [...internal, ...portal, ...external];
  }, [jobs, externalJobs, portalJobs, workspace]);

  const filtered = useMemo(() => {
    return allJobs.filter(j => {
      if (search && !j.title.toLowerCase().includes(search.toLowerCase()) &&
          !(j.company_name?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (remoteFilter !== "all" && j.remote_option !== remoteFilter) return false;
      if (sourceFilter === "internal" && j.source !== "internal") return false;
      if (sourceFilter === "external" && j.source !== "external" && j.source !== "portal") return false;
      return true;
    });
  }, [allJobs, search, typeFilter, remoteFilter, sourceFilter]);

  const companyName = workspace?.company_name || workspace?.name || "";
  const isLoading = jobsLoading || extLoading || portalLoading || workersLoading;

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
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Carreiras — ${companyName}`,
          description: `Vagas abertas em ${companyName}.`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: (filtered || []).slice(0, 50).map((j, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              item: {
                "@type": "JobPosting",
                title: j.title,
                description: j.description || j.title,
                datePosted: new Date().toISOString(),
                hiringOrganization: { "@type": "Organization", name: companyName },
                jobLocation: j.location ? {
                  "@type": "Place",
                  address: { "@type": "PostalAddress", addressLocality: j.location },
                } : undefined,
              },
            })),
          },
        })}</script>
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
          <p className="text-xl text-muted-foreground font-light">Portal de Emprego &amp; Carreiras</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {workspace.website && (
              <a href={workspace.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-full">
                <Building2 className="h-4 w-4" />
                {workspace.website.replace(/https?:\/\//, "")}
              </a>
            )}
            <Link to={`/careers/${workspaceSlug}/register`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors bg-muted px-4 py-2 rounded-full">
              <Building2 className="h-4 w-4" />
              Publicar Vagas
            </Link>
            <Link to={`/careers/${workspaceSlug}/register-worker`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors bg-muted px-4 py-2 rounded-full">
              <User className="h-4 w-4" />
              Publicar Disponibilidade
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto">
            <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" />Vagas ({filtered.length})</TabsTrigger>
            <TabsTrigger value="workers" className="gap-2"><Users className="h-4 w-4" />Profissionais ({workerListings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar vagas ou empresas..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-11 rounded-xl border-border/60 focus:border-primary/50" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] h-11 rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={remoteFilter} onValueChange={setRemoteFilter}>
                <SelectTrigger className="w-[150px] h-11 rounded-xl"><SelectValue placeholder="Modalidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(REMOTE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px] h-11 rounded-xl"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  <SelectItem value="internal">Nossas vagas</SelectItem>
                  <SelectItem value="external">Mercado</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} height={120} borderRadius={12} />)}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
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
                    <motion.div key={job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}>
                      {job.source === "internal" && job.slug ? (
                        <Link to={`/careers/${workspaceSlug}/${job.slug}`} className="block group">
                          <JobCard job={job} />
                        </Link>
                      ) : job.source === "external" && job.source_url ? (
                        <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="block group">
                          <JobCard job={job} />
                        </a>
                      ) : (
                        <div className="group">
                          <JobCard job={job} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            {workersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} height={120} borderRadius={12} />)}
              </div>
            ) : workerListings.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-16 text-center border-dashed">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-5" />
                  <h3 className="text-xl font-semibold text-foreground">Sem profissionais disponíveis</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    De momento nenhum profissional publicou a sua disponibilidade.
                  </p>
                  <Link to={`/careers/${workspaceSlug}/register-worker`}>
                    <Button variant="outline" className="mt-4">Publicar a minha disponibilidade</Button>
                  </Link>
                </Card>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {workerListings.map((listing, index) => (
                    <motion.div key={listing.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}>
                      <WorkerCard listing={listing} />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-muted-foreground pt-8 border-t">
          Powered by FastCRM
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: UnifiedJob }) {
  const isExternal = job.source === "external";
  const isPortal = job.source === "portal";

  return (
    <Card className="border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden">
      <CardContent className="p-5 flex gap-4">
        {/* Logo */}
        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-muted flex items-center justify-center">
          {job.logo_url ? (
            <img src={job.logo_url} alt="" className="h-full w-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : isExternal ? (
            <Globe className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Briefcase className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors leading-tight">{job.title}</h3>
            {isExternal && (
              <Badge variant="outline" className="text-xs shrink-0">
                {job.source_platform || "Externo"}
              </Badge>
            )}
            {isPortal && (
              <Badge variant="secondary" className="text-xs shrink-0">Empresa parceira</Badge>
            )}
          </div>

          {job.company_name && (
            <p className="text-sm font-medium text-muted-foreground">{job.company_name}</p>
          )}

          {job.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
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
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />{job.location}
              </span>
            )}
            {job.skills && job.skills.length > 0 && job.skills.slice(0, 4).map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="shrink-0 hidden sm:flex items-center">
          {isExternal ? (
            <ExternalLink className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-all" />
          ) : (
            <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const WORKER_EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", freelance: "Freelance", internship: "Estágio",
};

const WORKER_REMOTE_LABELS: Record<string, string> = {
  onsite: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

function WorkerCard({ listing }: { listing: PortalWorkerListing }) {
  const worker = listing.portal_workers;
  const fullName = worker ? `${worker.first_name} ${worker.last_name}` : "Profissional";

  return (
    <Card className="border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
      <CardContent className="p-5 flex gap-4">
        <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center">
          {worker?.photo_url ? (
            <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-base leading-tight">{listing.title}</h3>
            {listing.is_immediate && (
              <Badge variant="default" className="text-xs shrink-0">Disponível já</Badge>
            )}
          </div>

          <p className="text-sm font-medium text-muted-foreground">{fullName}{worker?.sector ? ` • ${worker.sector}` : ""}</p>

          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {listing.employment_type && (
              <Badge variant="secondary" className="text-xs font-normal">
                {WORKER_EMPLOYMENT_LABELS[listing.employment_type] || listing.employment_type}
              </Badge>
            )}
            {listing.remote_option && (
              <Badge variant="secondary" className="text-xs font-normal">
                {WORKER_REMOTE_LABELS[listing.remote_option] || listing.remote_option}
              </Badge>
            )}
            {(listing.desired_location || worker?.location) && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />{listing.desired_location || worker?.location}
              </span>
            )}
            {worker?.experience_years != null && worker.experience_years > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />{worker.experience_years} anos exp.
              </span>
            )}
            {worker?.skills?.slice(0, 4).map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
            ))}
            {listing.desired_salary_range && (
              <Badge variant="outline" className="text-xs">{listing.desired_salary_range}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
