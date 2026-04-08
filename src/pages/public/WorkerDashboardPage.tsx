import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePublicWorkspace } from "@/hooks/hr/usePublicJobs";
import { useMyPortalWorker, useMyWorkerListings, useCreateWorkerListing, type PortalWorkerListing } from "@/hooks/hr/usePortalWorker";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Loader2, LogOut, Briefcase } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

export default function WorkerDashboardPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { data: workspace } = usePublicWorkspace(workspaceSlug);
  const { data: worker, isLoading: workerLoading } = useMyPortalWorker(workspace?.id);
  const { data: listings = [], isLoading: listingsLoading } = useMyWorkerListings(worker?.id);
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

  if (!authChecked || workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Perfil não encontrado</h3>
            <p className="text-sm text-muted-foreground">A sua conta não está associada a um perfil de trabalhador neste portal.</p>
            <Link to={`/careers/${workspaceSlug}/register-worker`}>
              <Button>Criar Perfil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Meu Perfil — {worker.first_name} {worker.last_name}</title></Helmet>

      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground">{worker.first_name} {worker.last_name}</h1>
              <p className="text-xs text-muted-foreground">{worker.sector || "Trabalhador"} • {worker.location || "—"}</p>
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
        {/* Profile summary */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">O Meu Perfil</h2>
            {worker.bio && <p className="text-sm text-foreground">{worker.bio}</p>}
            <div className="flex flex-wrap gap-2">
              {worker.skills?.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{worker.experience_years} anos de experiência</span>
              {worker.education && <span>• {worker.education}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Anúncios", value: listings.length },
            { label: "Activos", value: listings.filter(l => l.status === "active").length },
            { label: "Expirados", value: listings.filter(l => l.status === "expired").length },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Listings */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Os Meus Anúncios</h2>
          <CreateListingDialog workerId={worker.id} workspaceId={workspace!.id} />
        </div>

        {listingsLoading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        ) : listings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium">Sem anúncios publicados</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie o primeiro anúncio para mostrar a sua disponibilidade.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {listings.map(listing => (
              <Card key={listing.id}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{listing.description}</p>
                    <div className="flex gap-2 mt-2">
                      {listing.desired_location && <Badge variant="outline" className="text-xs">{listing.desired_location}</Badge>}
                      {listing.employment_type && <Badge variant="outline" className="text-xs">{listing.employment_type}</Badge>}
                      {listing.is_immediate && <Badge variant="default" className="text-xs">Disponível já</Badge>}
                    </div>
                  </div>
                  <Badge variant={listing.status === "active" ? "default" : "secondary"} className="shrink-0">
                    {listing.status === "active" ? "Activo" : listing.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateListingDialog({ workerId, workspaceId }: { workerId: string; workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const createListing = useCreateWorkerListing();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [desiredLocation, setDesiredLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [remoteOption, setRemoteOption] = useState("onsite");
  const [salaryRange, setSalaryRange] = useState("");
  const [isImmediate, setIsImmediate] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!description.trim()) { toast.error("Descrição é obrigatória"); return; }
    await createListing.mutateAsync({
      portal_worker_id: workerId,
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim(),
      employment_type: employmentType,
      remote_option: remoteOption,
      desired_location: desiredLocation.trim() || undefined,
      desired_salary_range: salaryRange.trim() || undefined,
      is_immediate: isImmediate,
    });
    setOpen(false);
    setTitle(""); setDescription(""); setDesiredLocation(""); setSalaryRange("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Anúncio</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar Disponibilidade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Desenvolvedor Full-Stack disponível" />
          </div>
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Descreva a sua experiência e o tipo de trabalho que procura..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Zona pretendida</Label>
              <Input value={desiredLocation} onChange={e => setDesiredLocation(e.target.value)} placeholder="Lisboa" />
            </div>
            <div className="space-y-1">
              <Label>Salário pretendido</Label>
              <Input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="1500-2000€" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo pretendido</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Tempo inteiro</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Prestador</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="internship">Estágio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Select value={remoteOption} onValueChange={setRemoteOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Presencial</SelectItem>
                  <SelectItem value="remote">Remoto</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="immediate" checked={isImmediate} onChange={e => setIsImmediate(e.target.checked)} className="rounded" />
            <Label htmlFor="immediate" className="cursor-pointer">Disponível imediatamente</Label>
          </div>
          <Button type="submit" className="w-full" disabled={createListing.isPending}>
            {createListing.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A publicar...</> : "Publicar Anúncio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
