import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useJobPostings, useCreateJobPosting, useUpdateJobPosting, useDeleteJobPosting } from "@/hooks/hr/useJobPostings";
import type { JobPosting } from "@/hooks/hr/useJobPostings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { jobOpeningSchema, type JobOpeningFormValues } from "@/schemas/hr/jobOpeningSchema";
import { Plus, Briefcase, MapPin, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { JobPostingAIAssist, AIFieldButton, AIGenerateAllButton } from "@/components/hr/recruitment/JobPostingAIAssist";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  closed: { label: "Fechada", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Tempo inteiro",
  part_time: "Part-time",
  contract: "Prestador",
  intern: "Estágio",
};

const REMOTE_OPTIONS: Record<string, string> = {
  office: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};

export default function JobPostingsPage() {
  const { data: jobs, isLoading } = useJobPostings();
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { loading: aiLoading, run: aiRun } = JobPostingAIAssist({ form });

  const form = useForm<JobOpeningFormValues>({
    resolver: zodResolver(jobOpeningSchema),
    defaultValues: {
      title: "", description: "", employment_type: "full_time", remote_option: "office",
      location: "", currency: "EUR", salary_min: null, salary_max: null,
      requirements_text: "", nice_to_have_text: "",
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vagas</h1>
          <p className="text-muted-foreground">Gestão de vagas abertas e processos de recrutamento</p>
        </div>
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
                  <RHSelectField
                    name="employment_type"
                    label="Tipo de contrato"
                    options={Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => ({ value: k, label: v }))}
                  />
                  <RHSelectField
                    name="remote_option"
                    label="Modalidade"
                    options={Object.entries(REMOTE_OPTIONS).map(([k, v]) => ({ value: k, label: v }))}
                  />
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : !jobs?.length ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Sem vagas</h3>
          <p className="text-muted-foreground mt-1">Crie a primeira vaga para iniciar o recrutamento.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => {
            const st = STATUS_MAP[job.status] || STATUS_MAP.draft;
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/hr/recruitment/jobs/${job.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">{job.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/dashboard/hr/recruitment/jobs/${job.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                        </DropdownMenuItem>
                        {job.status === "draft" && (
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); updateJob.mutate({ id: job.id, status: "active", published_at: new Date().toISOString() }); }}>
                            Publicar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteJob.mutate(job.id); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {job.employment_type && <Badge variant="outline">{EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}</Badge>}
                    {job.remote_option && <Badge variant="outline">{REMOTE_OPTIONS[job.remote_option] || job.remote_option}</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {job.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</div>}
                  </div>
                  {(job.salary_min || job.salary_max) && (
                    <p className="text-sm font-medium text-foreground">
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
      )}
    </div>
  );
}
