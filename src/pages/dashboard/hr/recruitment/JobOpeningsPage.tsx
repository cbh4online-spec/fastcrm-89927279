import { useState } from "react";
import { useJobOpenings, useCreateJobOpening, useUpdateJobOpening, useDeleteJobOpening } from "@/hooks/hr/useJobOpenings";
import type { JobOpening } from "@/hooks/hr/useJobOpenings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Briefcase, MapPin, Users, Sparkles, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRecruitmentAI } from "@/hooks/hr/useRecruitmentAI";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicada", variant: "default" },
  reviewing: { label: "Em análise", variant: "outline" },
  closed: { label: "Fechada", variant: "destructive" },
  archived: { label: "Arquivada", variant: "secondary" },
};

const JOB_TYPES: Record<string, string> = {
  full_time: "Tempo inteiro",
  part_time: "Part-time",
  contractor: "Prestador",
  intern: "Estágio",
};

export default function JobOpeningsPage() {
  const { data: jobs, isLoading } = useJobOpenings();
  const createJob = useCreateJobOpening();
  const updateJob = useUpdateJobOpening();
  const deleteJob = useDeleteJobOpening();
  const { generateDescription, loading: aiLoading } = useRecruitmentAI();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<JobOpening>>({ title: "", department: "", job_type: "full_time", location: "", status: "draft" });

  const handleCreate = async () => {
    if (!form.title?.trim()) { toast.error("Título é obrigatório"); return; }
    await createJob.mutateAsync(form);
    setDialogOpen(false);
    setForm({ title: "", department: "", job_type: "full_time", location: "", status: "draft" });
  };

  const handleAIGenerate = async () => {
    if (!form.title?.trim()) { toast.error("Insira o título primeiro"); return; }
    const res = await generateDescription(form.title!, form.department || undefined);
    if (res.result) {
      const r = res.result;
      setForm(prev => ({
        ...prev,
        description: r.summary + "\n\n" + (r.responsibilities || []).map((s: string) => `• ${s}`).join("\n"),
        requirements: (r.requirements || []).map((s: string) => `• ${s}`).join("\n"),
        benefits: (r.benefits || []).map((s: string) => `• ${s}`).join("\n"),
      }));
      toast.success("Descrição gerada por IA");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vagas</h1>
          <p className="text-muted-foreground">Gestão de vagas abertas e processos de recrutamento</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Vaga</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Vaga</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Frontend Developer" />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input value={form.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Ex: Engenharia" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.job_type || "full_time"} onValueChange={v => setForm(p => ({ ...p, job_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(JOB_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Lisboa / Remoto" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salário mínimo (€)</Label>
                  <Input type="number" value={form.salary_min || ""} onChange={e => setForm(p => ({ ...p, salary_min: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label>Salário máximo (€)</Label>
                  <Input type="number" value={form.salary_max || ""} onChange={e => setForm(p => ({ ...p, salary_max: Number(e.target.value) || null }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleAIGenerate} disabled={aiLoading}>
                  <Sparkles className="h-4 w-4 mr-1" /> {aiLoading ? "A gerar..." : "Gerar com IA"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={6} placeholder="Descrição da vaga..." />
              </div>
              <div className="space-y-2">
                <Label>Requisitos</Label>
                <Textarea value={form.requirements || ""} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} rows={4} placeholder="Requisitos da vaga..." />
              </div>
              <div className="space-y-2">
                <Label>Benefícios</Label>
                <Textarea value={form.benefits || ""} onChange={e => setForm(p => ({ ...p, benefits: e.target.value }))} rows={3} placeholder="Benefícios oferecidos..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createJob.isPending}>Criar Vaga</Button>
              </div>
            </div>
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
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); updateJob.mutate({ id: job.id, status: "published", published_at: new Date().toISOString() }); }}>
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
                    {job.job_type && <Badge variant="outline">{JOB_TYPES[job.job_type] || job.job_type}</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {job.department && <div className="flex items-center gap-1"><Users className="h-3 w-3" />{job.department}</div>}
                    {job.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</div>}
                  </div>
                  {(job.salary_min || job.salary_max) && (
                    <p className="text-sm font-medium text-foreground">
                      {job.salary_min && job.salary_max ? `€${job.salary_min.toLocaleString()} - €${job.salary_max.toLocaleString()}` : job.salary_min ? `A partir de €${job.salary_min.toLocaleString()}` : `Até €${job.salary_max!.toLocaleString()}`}
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
