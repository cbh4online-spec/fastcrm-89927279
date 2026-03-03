import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRFQs } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { Toolbar } from "@/components/common/Toolbar";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  receiving_quotes: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  evaluated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  awarded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  receiving_quotes: "A receber cotações",
  evaluated: "Avaliado",
  awarded: "Adjudicado",
  closed: "Fechado",
};

const sortOptions = [
  { value: "created_desc", label: "Criação ↓" },
  { value: "created_asc", label: "Criação ↑" },
  { value: "due_desc", label: "Data Limite ↓" },
  { value: "due_asc", label: "Data Limite ↑" },
];

export default function RFQsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: rfqs, isLoading } = useRFQs(currentWorkspace?.id);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  const filteredRFQs = useMemo(() => {
    if (!rfqs) return [];
    let result = [...rfqs];

    if (statusFilter !== "all") {
      result = result.filter((r: any) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r: any) =>
        r.title?.toLowerCase().includes(q) ||
        r.rfq_number?.toLowerCase().includes(q) ||
        r.procurement_projects?.name?.toLowerCase().includes(q)
      );
    }

    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "due_asc":
          return (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1;
        case "due_desc":
          return (b.due_date || "") > (a.due_date || "") ? -1 : 1;
        default:
          return 0;
      }
    });

    return result;
  }, [rfqs, search, statusFilter, sortBy]);

  const hasFilters = statusFilter !== "all";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Pedidos de Cotação (RFQ)
          </h1>
        </div>
      </div>

      <Toolbar
        searchValue={search}
        searchPlaceholder="Pesquisar por título, nº RFQ ou projeto..."
        onSearchChange={setSearch}
        showFilters={false}
        sortOptions={sortOptions}
        sortValue={sortBy}
        onSortChange={(v) => setSortBy(v)}
        leftActions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-8 text-sm rounded-lg border-border/50 bg-background/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredRFQs.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasFilters || search ? "Nenhum RFQ encontrado com os filtros aplicados." : "Sem RFQs. Crie um a partir de um Projeto de Compras."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº RFQ</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRFQs.map((rfq: any) => {
                  const isOverdue = rfq.due_date && isPast(parseISO(rfq.due_date)) && !["awarded", "closed"].includes(rfq.status);
                  return (
                    <TableRow key={rfq.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/procurement/rfqs/${rfq.id}`)}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{rfq.rfq_number || "—"}</TableCell>
                      <TableCell className="font-medium">{rfq.title}</TableCell>
                      <TableCell>{rfq.procurement_projects?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[rfq.status] || ""} variant="secondary">
                          {statusLabels[rfq.status] || rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rfq.due_date ? (
                          <span className={isOverdue ? "text-destructive font-medium" : ""}>
                            {format(parseISO(rfq.due_date), "dd/MM/yyyy")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{format(new Date(rfq.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">Ver</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
