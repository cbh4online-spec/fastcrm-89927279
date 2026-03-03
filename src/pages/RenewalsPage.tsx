import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRenewalContracts } from "@/hooks/useRenewals";
import { RENEWAL_STATUS_CONFIG, RENEWAL_INTERVAL_LABELS, getHealthScoreColor, getHealthScoreBg } from "@/types/renewal";
import type { RenewalContract } from "@/types/renewal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, RefreshCw, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateRenewalDialog } from "@/components/renewals/CreateRenewalDialog";
import { Progress } from "@/components/ui/progress";

export default function RenewalsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: contracts = [], isLoading } = useRenewalContracts(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const companyName = c.company?.name || "";
    const contactName = c.contact?.name || "";
    return (
      companyName.toLowerCase().includes(search.toLowerCase()) ||
      contactName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    overdue: contracts.filter((c) => {
      if (!c.next_renewal_date) return false;
      return differenceInDays(new Date(c.next_renewal_date), new Date()) < 0;
    }).length,
    upcoming30: contracts.filter((c) => {
      if (!c.next_renewal_date) return false;
      const days = differenceInDays(new Date(c.next_renewal_date), new Date());
      return days >= 0 && days <= 30;
    }).length,
    totalMRR: contracts.reduce((sum, c) => sum + Number(c.total_mrr || 0), 0),
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renovações</h1>
          <p className="text-muted-foreground text-sm">Gestão de contratos, licenças, domínios e packs de horas</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Próx. 30 dias</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.upcoming30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Em Atraso</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">MRR Total</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalMRR)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por empresa ou contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum contrato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Próxima Renovação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => {
                  const daysUntil = contract.next_renewal_date
                    ? differenceInDays(new Date(contract.next_renewal_date), new Date())
                    : null;
                  const statusConfig = RENEWAL_STATUS_CONFIG[contract.status];

                  return (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/renewals/${contract.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{contract.company?.name || "—"}</p>
                          {contract.contact?.name && (
                            <p className="text-xs text-muted-foreground">{contract.contact.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contract.next_renewal_date ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={daysUntil !== null && daysUntil < 0 ? "text-red-600 font-medium" : daysUntil !== null && daysUntil <= 7 ? "text-yellow-600" : ""}>
                              {format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })}
                            </span>
                            {daysUntil !== null && (
                              <span className="text-xs text-muted-foreground">
                                ({daysUntil < 0 ? `${Math.abs(daysUntil)}d atraso` : `${daysUntil}d`})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(contract.total_mrr || 0))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={contract.health_score}
                            className="w-12 h-2"
                          />
                          <span className={`text-xs font-medium ${getHealthScoreColor(contract.health_score)}`}>
                            {contract.health_score}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateRenewalDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
