import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface FastClubApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string;
  job_title: string | null;
  sector: string;
  employees_count: number | null;
  estimated_annual_revenue: string | null;
  candidate_tier: string | null;
  profile_score: number | null;
  status: string;
  created_at: string;
  website_linkedin: string | null;
  strategic_objective: string | null;
  contribution: string | null;
}

const TIER_COLORS: Record<string, string> = {
  "Executive Candidate": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Strategic Candidate": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Basic Candidate": "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  em_analise: { label: "Em Analise", icon: Search, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  entrevista: { label: "Entrevista", icon: Users, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  aprovado: { label: "Aprovado", icon: CheckCircle2, color: "bg-green-500/10 text-green-400 border-green-500/30" },
  rejeitado: { label: "Rejeitado", icon: XCircle, color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export default function FastClubApplicationsPage() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["fastclub-applications", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FastClubApplication[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("fastclub_applications" as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastclub-applications"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        !searchQuery ||
        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier = tierFilter === "all" || app.candidate_tier === tierFilter;
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [applications, searchQuery, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending" || a.status === "em_analise").length;
    const approved = applications.filter((a) => a.status === "aprovado").length;
    const executive = applications.filter((a) => a.candidate_tier === "Executive Candidate").length;
    return { total, pending, approved, executive };
  }, [applications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Candidaturas FastClub</h1>
            <p className="text-sm text-muted-foreground">
              Gestao de candidaturas ao Private Capital Circle
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Em Analise", value: stats.pending, color: "text-yellow-400" },
          { label: "Aprovadas", value: stats.approved, color: "text-green-400" },
          { label: "Executive", value: stats.executive, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, empresa ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tiers</SelectItem>
                <SelectItem value="Executive Candidate">Executive</SelectItem>
                <SelectItem value="Strategic Candidate">Strategic</SelectItem>
                <SelectItem value="Basic Candidate">Basic</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Analise</SelectItem>
                <SelectItem value="entrevista">Entrevista</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              A carregar candidaturas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma candidatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app) => {
                    const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConf.icon;

                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{app.full_name}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{app.company}</p>
                          {app.job_title && (
                            <p className="text-xs text-muted-foreground">{app.job_title}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {app.candidate_tier && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${TIER_COLORS[app.candidate_tier] || ""}`}
                            >
                              {app.candidate_tier}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{app.sector}</TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-bold">
                            {app.profile_score ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 ${statusConf.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(app.created_at), "dd MMM yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: app.id,
                                    status: "em_analise",
                                  })
                                }
                              >
                                <Search className="h-3.5 w-3.5 mr-2" /> Em Analise
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: app.id,
                                    status: "entrevista",
                                  })
                                }
                              >
                                <Users className="h-3.5 w-3.5 mr-2" /> Entrevista
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: app.id,
                                    status: "aprovado",
                                  })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: app.id,
                                    status: "rejeitado",
                                  })
                                }
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Rejeitar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
