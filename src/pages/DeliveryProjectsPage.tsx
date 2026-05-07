import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useImplementationProjects, useImplementationTemplates, useCreateImplementationProject } from "@/hooks/useImplementationProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, AlertTriangle, Clock, Briefcase } from "lucide-react";

const statusColors: Record<string,string> = {
  planning: "bg-muted text-muted-foreground",
  waiting_customer: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  blocked: "bg-red-500/10 text-red-600 dark:text-red-400",
  ready_for_go_live: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  live: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};
const healthColors: Record<string,string> = {
  on_track: "bg-emerald-500/10 text-emerald-600",
  at_risk: "bg-yellow-500/10 text-yellow-600",
  delayed: "bg-orange-500/10 text-orange-600",
  blocked: "bg-red-500/10 text-red-600",
  critical: "bg-red-600/20 text-red-700",
};

export default function DeliveryProjectsPage() {
  const { data: projects = [], isLoading } = useImplementationProjects();
  const { data: templates = [] } = useImplementationTemplates();
  const create = useCreateImplementationProject();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [tplSlug, setTplSlug] = useState("");
  const [title, setTitle] = useState("");

  const filtered = useMemo(() => projects.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, statusFilter, search]);

  const stats = useMemo(() => ({
    total: projects.length,
    inProgress: projects.filter((p: any) => p.status === "in_progress").length,
    blocked: projects.filter((p: any) => p.status === "blocked").length,
    atRisk: projects.filter((p: any) => p.health_status && ["at_risk","delayed","critical"].includes(p.health_status)).length,
  }), [projects]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase className="h-8 w-8" /> Gestor de Implementação</h1>
          <p className="text-muted-foreground mt-1">Controle a implementação desde a aceitação até ao go-live.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Projeto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar projeto de implementação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Implementação WhatsApp Pro" />
              </div>
              <div>
                <Label>Template</Label>
                <Select value={tplSlug} onValueChange={setTplSlug}>
                  <SelectTrigger><SelectValue placeholder="Selecionar template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={async () => { await create.mutateAsync({ template_slug: tplSlug || undefined, title: title || undefined }); setOpen(false); setTitle(""); setTplSlug(""); }} disabled={create.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Em progresso</div><div className="text-2xl font-bold">{stats.inProgress}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Bloqueados</div><div className="text-2xl font-bold text-red-600">{stats.blocked}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Em risco</div><div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">Em progresso</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="ready_for_go_live">Pronto Go-Live</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div>A carregar...</div>}
      {!isLoading && filtered.length === 0 && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          Ainda não existem projetos de implementação. Crie um projeto a partir de um onboarding aprovado ou proposta aceite.
        </CardContent></Card>
      )}

      <div className="grid gap-4">
        {filtered.map((p: any) => (
          <Card key={p.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link to={`/dashboard/delivery/projects/${p.id}`} className="hover:underline">{p.title}</Link>
                    <Badge variant="outline" className="text-xs">{p.project_number}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{p.scope_summary}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[p.status] ?? ""}>{p.status}</Badge>
                  {p.health_status && <Badge className={healthColors[p.health_status] ?? ""}>{p.health_status}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {p.used_hours ?? 0}h / {p.estimated_hours ?? "—"}h</div>
                {p.target_go_live_date && <div>Go-Live: {new Date(p.target_go_live_date).toLocaleDateString("pt-PT")}</div>}
                <div>Progresso: {p.progress_percentage ?? 0}%</div>
                {p.priority === "critical" && <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /> Crítico</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
