import { useState } from "react";
import { useJobPostings, useCreateJobPosting, useUpdateJobPosting, useDeleteJobPosting } from "@/hooks/hr/useJobPostings";
import type { JobPosting } from "@/hooks/hr/useJobPostings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Briefcase, MapPin, Users, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const [form, setForm] = useState<Partial<JobPosting>>({
    title: "", description: "", employment_type: "full_time", remote_option: "office", location: "", status: "draft",
    requirements: [], nice_to_have: [],
  });
  const [requirementsText, setRequirementsText] = useState("");
  const [niceToHaveText, setNiceToHaveText] = useState("");

  const handleCreate = async () => {
    if (!form.title?.trim()) { toast.error("Título é obrigatório"); return; }
    await createJob.mutateAsync({
      ...form,
      requirements: requirementsText.split("\n").map(s => s.trim()).filter(Boolean),
      nice_to_have: niceToHaveText.split("\n").map(s => s.trim()).filter(Boolean),
    });
    setDialogOpen(false);
    setForm({ title: "", description: "", employment_type: "full_time", remote_option: "office", location: "", status: "draft" });
    setRequirementsText("");
    setNiceToHaveText("");
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
            <DialogHeader><DialogTitle>Criar Vaga</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Frontend Developer" />
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input value={form.location || ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Lisboa" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de contrato</Label>
                  <Select value={form.employment_type || "full_time"} onValueChange={v => setForm(p => ({ ...p, employment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Select value={form.remote_option || "office"} onValueChange={v => setForm(p => ({ ...p, remote_option: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(REMOTE_OPTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Input value={form.currency || "EUR"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salário mínimo</Label>
                  <Input type="number" value={form.salary_min || ""} onChange={e => setForm(p => ({ ...p, salary_min: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label>Salário máximo</Label>
                  <Input type="number" value={form.salary_max || ""} onChange={e => setForm(p => ({ ...p, salary_max: Number(e.target.value) || null }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={5} placeholder="Descrição da vaga..." />
              </div>
              <div className="space-y-2">
                <Label>Requisitos (um por linha)</Label>
                <Textarea value={requirementsText} onChange={e => setRequirementsText(e.target.value)} rows={4} placeholder="Ex: 3+ anos de experiência em React..." />
              </div>
              <div className="space-y-2">
                <Label>Nice to have (um por linha)</Label>
                <Textarea value={niceToHaveText} onChange={e => setNiceToHaveText(e.target.value)} rows={3} placeholder="Ex: Experiência com TypeScript..." />
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
