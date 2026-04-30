import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Filter,
  Search,
  Download,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCreditWallet } from "@/hooks/useCreditWallet";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LedgerRow {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action_key: string;
  module: string | null;
  reference_type: string | null;
  reference_id: string | null;
  credits_amount: number;
  direction: string; // 'debit' | 'credit' | 'refund'
  status: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserMini {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const PAGE_SIZE = 50;

const directionMeta = (dir: string) => {
  switch (dir) {
    case "debit":
      return {
        label: "Débito",
        icon: ArrowDownCircle,
        className: "text-destructive",
        sign: "-",
        badgeVariant: "destructive" as const,
      };
    case "credit":
      return {
        label: "Crédito",
        icon: ArrowUpCircle,
        className: "text-emerald-600 dark:text-emerald-500",
        sign: "+",
        badgeVariant: "default" as const,
      };
    case "refund":
      return {
        label: "Estorno",
        icon: RotateCcw,
        className: "text-blue-600 dark:text-blue-500",
        sign: "+",
        badgeVariant: "secondary" as const,
      };
    default:
      return {
        label: dir,
        icon: Coins,
        className: "text-muted-foreground",
        sign: "",
        badgeVariant: "outline" as const,
      };
  }
};

export default function CreditHistoryPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { wallet, walletLoading, pricingRules } = useCreditWallet();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  // Map action_key → label legível
  const actionLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of pricingRules) map[r.action_key] = r.label;
    return map;
  }, [pricingRules]);

  // Conjunto de módulos disponíveis nas regras
  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    pricingRules.forEach((r) => r.module && set.add(r.module));
    return Array.from(set).sort();
  }, [pricingRules]);

  // Conjunto de actions disponíveis nas regras
  const actionOptions = useMemo(() => {
    return [...pricingRules].sort((a, b) => a.label.localeCompare(b.label));
  }, [pricingRules]);

  // Query do ledger paginado
  const { data: ledgerPage, isLoading } = useQuery({
    queryKey: [
      "credit-history",
      workspaceId,
      page,
      actionFilter,
      directionFilter,
      moduleFilter,
    ],
    queryFn: async () => {
      if (!workspaceId) return { rows: [] as LedgerRow[], count: 0 };
      let q = supabase
        .from("credit_ledger")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (actionFilter !== "all") q = q.eq("action_key", actionFilter);
      if (directionFilter !== "all") q = q.eq("direction", directionFilter);
      if (moduleFilter !== "all") q = q.eq("module", moduleFilter);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as LedgerRow[], count: count ?? 0 };
    },
    enabled: !!workspaceId,
    staleTime: 15_000,
  });

  const rows = ledgerPage?.rows ?? [];
  const totalCount = ledgerPage?.count ?? 0;

  // Carregar perfis dos utilizadores referenciados nesta página
  const userIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[],
    [rows]
  );

  const { data: users = {} } = useQuery({
    queryKey: ["credit-history-users", userIds],
    queryFn: async (): Promise<Record<string, UserMini>> => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      if (error) return {};
      const map: Record<string, UserMini> = {};
      (data as UserMini[]).forEach((u) => (map[u.id] = u));
      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });

  // Estatísticas (sobre página atual)
  const stats = useMemo(() => {
    let consumed = 0;
    let added = 0;
    let refunded = 0;
    rows.forEach((r) => {
      if (r.direction === "debit") consumed += r.credits_amount;
      else if (r.direction === "credit") added += r.credits_amount;
      else if (r.direction === "refund") refunded += r.credits_amount;
    });
    return { consumed, added, refunded };
  }, [rows]);

  // Filtro local por texto
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const label = (actionLabel[r.action_key] || r.action_key).toLowerCase();
      const u = r.user_id ? users[r.user_id] : null;
      return (
        label.includes(q) ||
        r.action_key.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.reference_id ?? "").toLowerCase().includes(q) ||
        (u?.full_name ?? "").toLowerCase().includes(q) ||
        (u?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, actionLabel, users]);

  const exportCsv = () => {
    const header = [
      "data",
      "direção",
      "ação",
      "módulo",
      "créditos",
      "utilizador",
      "referência_tipo",
      "referência_id",
      "descrição",
      "estado",
    ];
    const lines = filteredRows.map((r) => {
      const u = r.user_id ? users[r.user_id] : null;
      return [
        new Date(r.created_at).toISOString(),
        r.direction,
        actionLabel[r.action_key] || r.action_key,
        r.module ?? "",
        (r.direction === "debit" ? "-" : "+") + r.credits_amount,
        u?.full_name || u?.email || r.user_id || "",
        r.reference_type ?? "",
        r.reference_id ?? "",
        (r.description ?? "").replace(/[\r\n,]+/g, " "),
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-creditos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de créditos
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Todas as entradas e débitos da carteira de créditos do workspace, por
          tipo de ação, com data, utilizador e referência da execução.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Saldo atual
              </p>
              {walletLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{wallet?.balance ?? 0}</p>
              )}
            </div>
            <Wallet className="h-8 w-8 text-primary opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Consumidos (página)
              </p>
              <p className="text-2xl font-bold text-destructive">
                {stats.consumed}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-destructive opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Adicionados (página)
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                {stats.added}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-500 opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Estornados (página)
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                {stats.refunded}
              </p>
            </div>
            <RotateCcw className="h-8 w-8 text-blue-600 dark:text-blue-500 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
          <CardDescription>
            Pesquisa por ação, utilizador, referência ou descrição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={directionFilter}
              onValueChange={(v) => {
                setDirectionFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="md:col-span-2">
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as direções</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="refund">Estorno</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={moduleFilter}
              onValueChange={(v) => {
                setModuleFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="md:col-span-3">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={actionFilter}
              onValueChange={(v) => {
                setActionFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="md:col-span-3">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas as ações</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a.action_key} value={a.action_key}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {totalCount} registo{totalCount === 1 ? "" : "s"} no total
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[110px]">Módulo</TableHead>
                  <TableHead className="w-[110px] text-right">Créditos</TableHead>
                  <TableHead className="w-[180px]">Utilizador</TableHead>
                  <TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-12"
                    >
                      Sem movimentos para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r) => {
                    const meta = directionMeta(r.direction);
                    const Icon = meta.icon;
                    const u = r.user_id ? users[r.user_id] : null;
                    const userLabel =
                      u?.full_name || u?.email || (r.user_id ? "—" : "Sistema");
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd MMM yyyy, HH:mm", {
                            locale: pt,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4 shrink-0", meta.className)} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {actionLabel[r.action_key] || r.action_key}
                              </p>
                              {r.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {r.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.module ? (
                            <Badge variant="outline" className="text-[10px]">
                              {r.module}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-semibold tabular-nums", meta.className)}>
                            {meta.sign}
                            {r.credits_amount}
                          </span>
                          {r.status && r.status !== "completed" && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              {r.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm truncate" title={u?.email ?? ""}>
                            {userLabel}
                          </p>
                          {u?.email && u?.full_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.reference_type ? (
                            <div className="text-xs">
                              <span className="font-medium">{r.reference_type}</span>
                              {r.reference_id && (
                                <span className="block text-muted-foreground font-mono truncate max-w-[260px]">
                                  {r.reference_id}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Seguinte
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
