import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Briefcase, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useOnboardingProjects } from "@/hooks/useCustomerOnboarding";

const STATUS_LABELS: Record<string, { label: string; variant: any }> = {
  not_started: { label: "Não iniciado", variant: "outline" },
  waiting_customer: { label: "Aguarda cliente", variant: "secondary" },
  in_progress: { label: "Em curso", variant: "default" },
  blocked: { label: "Bloqueado", variant: "destructive" },
  ready_for_setup: { label: "Pronto p/ setup", variant: "default" },
  setup_in_progress: { label: "Setup em curso", variant: "default" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

export default function OnboardingProjectsPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useOnboardingProjects();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = projects.filter((p: any) => {
    const matchesSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.customer_company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    waiting: projects.filter((p: any) => p.status === "waiting_customer").length,
    inProgress: projects.filter((p: any) => p.status === "in_progress").length,
    completed: projects.filter((p: any) => p.status === "completed").length,
  };

  return (
    <div className="container py-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase className="h-7 w-7" /> Projetos de Onboarding</h1>
        <p className="text-muted-foreground">Transforme propostas aceites em processos de implementação organizados.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total</div><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Aguarda cliente</div><div className="text-3xl font-bold">{stats.waiting}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Em curso</div><div className="text-3xl font-bold">{stats.inProgress}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Concluídos</div><div className="text-3xl font-bold">{stats.completed}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar por projeto ou cliente…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-8 text-center">A carregar…</p> :
           filtered.length === 0 ? <p className="text-muted-foreground py-8 text-center">Sem projetos</p> :
            <Table>
              <TableHeader><TableRow>
                <TableHead>Projeto</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead>
                <TableHead>Progresso</TableHead><TableHead>Go-live</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.not_started;
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/onboarding/${p.id}`)}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.customer_company_name ?? "—"}</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={p.progress_pct ?? 0} className="w-20" /><span className="text-xs text-muted-foreground">{p.progress_pct ?? 0}%</span></div></TableCell>
                      <TableCell>{p.target_go_live_date ? new Date(p.target_go_live_date).toLocaleDateString("pt-PT") : "—"}</TableCell>
                      <TableCell><Button variant="ghost" size="sm">Abrir →</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}
