import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useJobPostings, useCreateJobPosting, useDeleteJobPosting } from "@/hooks/hr/useJobPostings";
import type { JobPosting } from "@/hooks/hr/useJobPostings";
import { useCandidates } from "@/hooks/hr/useCandidates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { jobOpeningSchema, type JobOpeningFormValues } from "@/schemas/hr/jobOpeningSchema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MapPin, MoreHorizontal, Trash2, Eye, Pencil, ExternalLink, Copy } from "lucide-react";
import { JobPostingAIAssist, AIFieldButton, AIGenerateAllButton } from "@/components/hr/recruitment/JobPostingAIAssist";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { JobKPIs } from "@/components/hr/recruitment/JobKPIs";
import { JobFilters } from "@/components/hr/recruitment/JobFilters";
import { JobEditDrawer } from "@/components/hr/recruitment/JobEditDrawer";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildPublicCareersPath } from "@/lib/publicCareers";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  closed: { label: "Fechada", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", intern: "Estágio",
};

const REMOTE_OPTIONS: Record<string, string> = {
  office: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

export default function JobPostingsPage() {
  const { data: jobs, isLoading } = useJobPostings();
  const { data: allCandidates } = useCandidates();
  const createJob = useCreateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobPosting | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const form = useForm<JobOpeningFormValues>({
    resolver: zodResolver(jobOpeningSchema),
    defaultValues: {
      title: "", description: "", employment_type: "full_time", remote_option: "office",
      location: "", currency: "EUR", salary_min: null, salary_max: null,
      requirements_text: "", nice_to_have_text: "",
    },
  });

  const { loading: aiLoading, run: aiRun } = JobPostingAIAssist({ form });

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (remoteFilter !== "all" && j.remote_option !== remoteFilter) return false;
      return true;
    });
  }, [jobs, search, statusFilter, typeFilter, remoteFilter]);

  const candidateCount = allCandidates?.length || 0;
  const careersPath = buildPublicCareersPath(currentWorkspace?.slug);
  const careersUrl = careersPath ? `${window.location.origin}${careersPath}` : null;

  const copyPublicUrl = (jobSlug: string | null) => {
    const publicJobPath = buildPublicCareersPath(currentWorkspace?.slug, jobSlug);
    if (!publicJobPath) return;

    navigator.clipboard.writeText(`${window.location.origin}${publicJobPath}`);
    toast.success("URL copiado!");
  };

  const onSubmit = async (values: JobOpeningFormValues) => {
    await createJob.mutateAsync({
      title: values.title,
      description: values.description,
      employment_type: values.employment_type,
      remote_option: values.remote_option,
      location: values.location,
      currency: values.currency,
      salary_min: values.salary_min,
      salary_max: values.salary_max,
      requirements: values.requirements_text.split("\n").map(s => s.trim()).filter(Boolean),
      nice_to_have: values.nice_to_have_text.split("\n").map(s => s.trim()).filter(Boolean),
      status: "draft",
    });
    setDialogOpen(false);
    form.reset();
  };

  const renderActions = (job: JobPosting) => {
    const publicJobPath = buildPublicCareersPath(currentWorkspace?.slug, job.slug);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/dashboard/hr/recruitment/jobs/${job.id}`); }}>
            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditJob(job); }}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </DropdownMenuItem>
          {job.slug && job.status === "active" && publicJobPath && (
            <>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); copyPublicUrl(job.slug); }}>
                <Copy className="h-4 w-4 mr-2" /> Copiar URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); window.open(publicJobPath, "_blank"); }}>
                <ExternalLink className="h-4 w-4 mr-2" /> Ver landing
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteJob.mutate(job.id); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vagas</h1>
          <p className="text-muted-foreground">Gestão de vagas abertas e processos de recrutamento</p>
        </div>
        <div className="flex items-center gap-2">
          {careersPath && (
            <Button variant="outline" size="sm" onClick={() => window.open(careersPath, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" /> Página de Carreiras
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) form.reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Vaga</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Criar Vaga</DialogTitle>
                  <AIGenerateAllButton loading={aiLoading} onRun={aiRun} />
                </div>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <RHFormField name="title" label="Título" required placeholder="Ex: Frontend Developer" />
                    <RHFormField name="location" label="Localização" placeholder="Ex: Lisboa" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <RHSelectField name="employment_type" label="Tipo de contrato" options={Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => ({ value: k, label: v }))} />
                    <RHSelectField name="remote_option" label="Modalidade" options={Object.entries(REMOTE_OPTIONS).map(([k, v]) => ({ value: k, label: v }))} />
                    <RHFormField name="currency" label="Moeda" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Salário</span>
                      <AIFieldButton action="suggest_salary" loading={aiLoading} onRun={aiRun} label="Sugerir" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <RHFormField name="salary_min" label="Mínimo" type="number" />
                      <RHFormField name="salary_max" label="Máximo" type="number" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Descrição</span>
                      <AIFieldButton action="generate_description" loading={aiLoading} onRun={aiRun} label="Gerar com IA" />
                    </div>
                    <RHTextareaField name="description" label="" rows={5} placeholder="Descrição da vaga..." />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Requisitos</span>
                      <AIFieldButton action="generate_requirements" loading={aiLoading} onRun={aiRun} label="Gerar com IA" />
                    </div>
                    <RHTextareaField name="requirements_text" label="" rows={4} placeholder="Ex: 3+ anos de experiência em React..." />
                    <RHTextareaField name="nice_to_have_text" label="Nice to have (um por linha)" rows={3} placeholder="Ex: Experiência com TypeScript..." className="mt-3" />
                  </div>
                  <DialogFooter>
                    <RHFormActions onCancel={() => setDialogOpen(false)} isSubmitting={createJob.isPending} submitLabel="Criar Vaga" />
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <JobKPIs jobs={jobs || []} candidateCount={candidateCount} />

      {/* Filters */}
      <JobFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        typeFilter={typeFilter} onTypeChange={setTypeFilter}
        remoteFilter={remoteFilter} onRemoteChange={setRemoteFilter}
        viewMode={viewMode} onViewModeChange={setViewMode}
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : !filtered.length ? (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold">Sem resultados</h3>
          <p className="text-muted-foreground mt-1">Ajuste os filtros ou crie uma nova vaga.</p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => {
            const st = STATUS_MAP[job.status] || STATUS_MAP.draft;
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/hr/recruitment/jobs/${job.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">{job.title}</CardTitle>
                    {renderActions(job)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {job.employment_type && <Badge variant="outline">{EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}</Badge>}
                    {job.remote_option && <Badge variant="outline">{REMOTE_OPTIONS[job.remote_option] || job.remote_option}</Badge>}
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />{job.location}
                    </div>
                  )}
                  {(job.salary_min || job.salary_max) && (
                    <p className="text-sm font-medium">
                      {job.salary_min && job.salary_max
                        ? `${job.currency || "€"}${job.salary_min.toLocaleString()} - ${job.currency || "€"}${job.salary_max.toLocaleString()}`
                        : job.salary_min
                        ? `A partir de ${job.currency || "€"}${job.salary_min.toLocaleString()}`
                        : `Até ${job.currency || "€"}${job.salary_max!.toLocaleString()}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(job => {
                const st = STATUS_MAP[job.status] || STATUS_MAP.draft;
                return (
                  <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/hr/recruitment/jobs/${job.id}`)}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-sm">{EMPLOYMENT_TYPES[job.employment_type] || "—"}</TableCell>
                    <TableCell className="text-sm">{REMOTE_OPTIONS[job.remote_option] || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{job.location || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(job.created_at), "d MMM", { locale: pt })}</TableCell>
                    <TableCell>{renderActions(job)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Drawer */}
      <JobEditDrawer job={editJob} open={!!editJob} onOpenChange={open => { if (!open) setEditJob(null); }} />
    </div>
  );
}
