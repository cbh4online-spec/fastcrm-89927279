import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePublicWorkspace } from "@/hooks/hr/usePublicJobs";
import { useMyPortalCompany, useMyPortalJobs, useCreatePortalJob, type PortalJobPosting } from "@/hooks/hr/usePortalCompany";
import { useMyPortalWorker } from "@/hooks/hr/usePortalWorker";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Briefcase, Loader2, LogOut, Clock, CheckCircle, XCircle, AlertCircle, Building2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", icon: Clock, variant: "secondary" },
  active: { label: "Activa", icon: CheckCircle, variant: "default" },
  expired: { label: "Expirada", icon: AlertCircle, variant: "outline" },
  rejected: { label: "Rejeitada", icon: XCircle, variant: "destructive" },
};

export default function PortalDashboardPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { data: workspace } = usePublicWorkspace(workspaceSlug);
  const { data: company, isLoading: compLoading } = useMyPortalCompany(workspace?.id);
  const { data: worker, isLoading: workerLoading } = useMyPortalWorker(workspace?.id);
  const { data: jobs = [], isLoading: jobsLoading } = useMyPortalJobs(company?.id);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate(`/careers/${workspaceSlug}/login`);
      else setAuthChecked(true);
    });
  }, [navigate, workspaceSlug]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/careers/${workspaceSlug}/login`);
  };

  if (!authChecked || compLoading || workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user is a worker, redirect to worker dashboard
  if (!company && worker) {
    navigate(`/careers/${workspaceSlug}/worker-dashboard`, { replace: true });
    return null;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Empresa não encontrada</h3>
            <p className="text-sm text-muted-foreground">A sua conta não está associada a nenhuma empresa neste portal.</p>
            <Link to={`/careers/${workspaceSlug}/register`}>
              <Button>Registar Empresa</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Painel — {company.name}</title>
      </Helmet>

      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground">{company.name}</h1>
              <p className="text-xs text-muted-foreground">
                Estado: <Badge variant={company.status === "active" ? "default" : "secondary"} className="text-xs ml-1">
                  {company.status === "active" ? "Activa" : company.status === "pending" ? "Pendente" : company.status}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/careers/${workspaceSlug}`}>
              <Button variant="outline" size="sm">Ver Portal</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {company.status === "pending" && (
          <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                A sua empresa está pendente de aprovação. Pode criar vagas, mas só serão publicadas após aprovação.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Vagas", value: jobs.length },
            { label: "Activas", value: jobs.filter(j => j.status === "active").length },
            { label: "Pendentes", value: jobs.filter(j => j.status === "pending").length },
            { label: "Expiradas", value: jobs.filter(j => j.status === "expired").length },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jobs */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">As Minhas Vagas</h2>
          <CreateJobDialog companyId={company.id} workspaceId={workspace!.id} />
        </div>

        {jobsLoading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        ) : jobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium">Sem vagas publicadas</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie a sua primeira vaga para atrair candidatos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <Card key={job.id}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{job.description}</p>
                      <div className="flex gap-2 mt-2">
                        {job.location && <Badge variant="outline" className="text-xs">{job.location}</Badge>}
                        {job.employment_type && <Badge variant="outline" className="text-xs">{job.employment_type}</Badge>}
                      </div>
                    </div>
                    <Badge variant={cfg.variant} className="shrink-0">
                      <Icon className="h-3 w-3 mr-1" />{cfg.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateJobDialog({ companyId, workspaceId }: { companyId: string; workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const createJob = useCreatePortalJob();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [remoteOption, setRemoteOption] = useState("office");
  const [contactEmail, setContactEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    await createJob.mutateAsync({
      portal_company_id: companyId,
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      employment_type: employmentType,
      remote_option: remoteOption,
      contact_email: contactEmail.trim() || undefined,
    });
    setOpen(false);
    setTitle(""); setDescription(""); setLocation(""); setContactEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Vaga</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar Nova Vaga</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Título da Vaga *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Desenvolvedor Full-Stack" />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Descreva a vaga, responsabilidades e requisitos..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Localização</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Lisboa" />
            </div>
            <div className="space-y-1">
              <Label>Email de contacto</Label>
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="rh@empresa.pt" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de contrato</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Tempo inteiro</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Prestador</SelectItem>
                  <SelectItem value="intern">Estágio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Select value={remoteOption} onValueChange={setRemoteOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Presencial</SelectItem>
                  <SelectItem value="remote">Remoto</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createJob.isPending}>
            {createJob.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A submeter...</> : "Submeter Vaga"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
