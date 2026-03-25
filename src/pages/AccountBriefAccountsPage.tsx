import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { Plus, Search, Star, StarOff, Loader2, Briefcase, RefreshCw, Trash2, Globe } from "lucide-react";
import { useAccountBriefAnalysisRuns } from "@/hooks/useAccountBriefAnalysisRuns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  new: "Nova",
  researching: "Em pesquisa",
  outreach_ready: "Pronta p/ outreach",
  contacted: "Contactada",
  follow_up: "Follow-up",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  researching: "bg-blue-500/20 text-blue-500",
  outreach_ready: "bg-emerald-500/20 text-emerald-500",
  contacted: "bg-amber-500/20 text-amber-500",
  follow_up: "bg-purple-500/20 text-purple-500",
};

export default function AccountBriefAccountsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [favFilter, setFavFilter] = useState(false);
  const { accounts, isLoading, createAccount, toggleFavorite, deleteAccount } = useAccountBriefAccounts({
    search, status: statusFilter || undefined, favorite: favFilter || undefined,
  });
  const { triggerAnalysis } = useAccountBriefAnalysisRuns();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName && !newDomain) return;
    await createAccount.mutateAsync({ name: newName || newDomain, domain: newDomain });
    setNewDomain("");
    setNewName("");
    setDialogOpen(false);
  };

  const handleAnalyze = async (id: string) => {
    toast.info("A iniciar análise...");
    await triggerAnalysis.mutateAsync(id);
    toast.success("Análise lançada!");
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Contas-Alvo"
            description="Gerir empresas para análise e briefing comercial"
            count={accounts.length}
            actions={[
              {
                label: "Adicionar Conta",
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setDialogOpen(true),
              },
            ]}
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por nome ou domínio..." className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={favFilter ? "default" : "outline"} size="sm" onClick={() => setFavFilter(!favFilter)} className="gap-1">
              <Star className="w-4 h-4" /> Favoritas
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : accounts.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">Sem contas registadas</h3>
                <p className="text-sm text-muted-foreground mb-4">Adicione a primeira empresa-alvo para começar.</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar conta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Domínio</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/account-brief/accounts/${acc.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs shrink-0">
                            {acc.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{acc.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{acc.domain}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{acc.domain}</td>
                      <td className="px-4 py-3 text-center">
                        {acc.total_score > 0 ? (
                          <Badge variant="secondary" className="text-xs">{acc.total_score}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <Badge className={cn("text-xs", STATUS_COLORS[acc.commercial_status] || "")}>
                          {STATUS_LABELS[acc.commercial_status] || acc.commercial_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite.mutate({ id: acc.id, favorite: !acc.favorite })}>
                            {acc.favorite ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAnalyze(acc.id)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAccount.mutate(acc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" /> Adicionar Conta
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome da empresa *</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Zoltrix – Soluções Integradas, Lda" />
                </div>
                <div className="space-y-2">
                  <Label>Domínio (opcional)</Label>
                  <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="exemplo.com" />
                </div>
                <Button onClick={handleCreate} disabled={(!newName && !newDomain) || createAccount.isPending} className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500">
                  {createAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
