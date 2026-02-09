import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvoices,
  useInvoiceStats,
  useMarkInvoicePaid,
  useSendInvoice,
  useDeleteInvoice,
  type InvoiceStatus,
} from "@/hooks/useInvoices";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { InvoiceSettingsTab } from "@/components/invoices/InvoiceSettingsTab";
import { RecurringInvoicesTab } from "@/components/invoices/RecurringInvoicesTab";
import { FiscalSettingsTab } from "@/components/invoices/FiscalSettingsTab";
import { SaftExportTab } from "@/components/invoices/SaftExportTab";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Send,
  CheckCircle,
  Trash2,
  Eye,
  Download,
  Clock,
  AlertTriangle,
  DollarSign,
  FileCheck,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  FileX,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileText }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: FileText },
  sent: { label: "Enviada", variant: "default", icon: Send },
  paid: { label: "Paga", variant: "outline", icon: CheckCircle },
  overdue: { label: "Vencida", variant: "destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelada", variant: "secondary", icon: FileText },
};

const pageTabs = [
  { id: "invoices", label: "Faturas" },
  { id: "recurring", label: "Recorrentes" },
  { id: "fiscal", label: "Fiscalidade" },
  { id: "saft", label: "SAF-T" },
  { id: "settings", label: "Configurações" },
];

const sortOptions = [
  { value: "date_desc", label: "Mais recentes" },
  { value: "date_asc", label: "Mais antigas" },
  { value: "value_desc", label: "Maior valor" },
  { value: "value_asc", label: "Menor valor" },
  { value: "due_asc", label: "Vencimento próximo" },
  { value: "number_asc", label: "Número (A-Z)" },
];

const filterGroups: FilterGroup[] = [
  {
    id: "status",
    label: "Estado",
    icon: <FileText className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "status_draft", label: "Rascunho", icon: <FileText className="h-4 w-4" /> },
      { id: "status_sent", label: "Enviada", icon: <Send className="h-4 w-4 text-blue-500" /> },
      { id: "status_paid", label: "Paga", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
      { id: "status_overdue", label: "Vencida", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
      { id: "status_cancelled", label: "Cancelada", icon: <FileX className="h-4 w-4" /> },
    ],
  },
  {
    id: "value",
    label: "Valor",
    icon: <CircleDollarSign className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "value_high", label: "Alto (>5.000€)" },
      { id: "value_medium", label: "Médio (1.000-5.000€)" },
      { id: "value_low", label: "Baixo (<1.000€)" },
    ],
  },
  {
    id: "timing",
    label: "Período",
    icon: <Calendar className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "timing_today", label: "Hoje" },
      { id: "timing_week", label: "Esta semana" },
      { id: "timing_month", label: "Este mês" },
      { id: "timing_quarter", label: "Este trimestre" },
    ],
  },
  {
    id: "smart",
    label: "Filtros Inteligentes",
    icon: <TrendingUp className="h-4 w-4" />,
    defaultOpen: false,
    items: [
      { id: "smart_due_soon", label: "Vence em 7 dias" },
      { id: "smart_high_value", label: "Alto valor pendente" },
      { id: "smart_recurring", label: "Clientes recorrentes" },
    ],
  },
];

export default function Invoices() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // New state for reorganized UI
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("invoices");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date_desc");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();

  const { data: invoices, isLoading, refetch } = useInvoices(
    statusFilter ? { status: statusFilter } : undefined
  );
  const stats = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  // Filter and search
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (!searchValue) return invoices;
    const lower = searchValue.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.client_name.toLowerCase().includes(lower) ||
        inv.invoice_number.toLowerCase().includes(lower)
    );
  }, [invoices, searchValue]);

  // Pagination
  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.ceil(totalInvoices / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredInvoices]);

  const filtersActive = !!statusFilter || !!activeFilterId;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    if (filterId.startsWith("status_")) {
      setStatusFilter(filterId.replace("status_", "") as InvoiceStatus);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedInvoices.map((inv) => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkExport = () => {
    const selected = invoices?.filter((inv) => selectedIds.includes(inv.id)) || [];
    if (selected.length === 0) return;
    const csv = [
      ["Número", "Cliente", "Email", "Data Emissão", "Vencimento", "Total", "Estado"].join(","),
      ...selected.map((inv) =>
        [
          inv.invoice_number,
          inv.client_name,
          inv.client_email || "",
          format(new Date(inv.issue_date), "dd/MM/yyyy"),
          format(new Date(inv.due_date), "dd/MM/yyyy"),
          inv.total,
          statusConfig[inv.status].label,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturas_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success(`${selected.length} faturas exportadas`);
  };

  return (
    <DashboardLayout>
      <div className="flex h-full -m-6">
        {/* Filter Sidebar */}
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={() => {
            setActiveFilterId(undefined);
            setStatusFilter(undefined);
          }}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 p-6">
          {/* Page Header */}
          <PageHeader
            title="Faturas"
            count={totalInvoices}
            description={`Total: ${formatCurrency(totalValue)}`}
            tabs={pageTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            actions={[
              {
                label: "Nova Fatura",
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              },
            ]}
          />

          {/* Render content based on active tab */}
          {activeTab === "settings" ? (
            <InvoiceSettingsTab />
          ) : activeTab === "recurring" ? (
            <RecurringInvoicesTab />
          ) : activeTab === "fiscal" ? (
            <FiscalSettingsTab />
          ) : activeTab === "saft" ? (
            <SaftExportTab />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rascunho</p>
                      <p className="text-2xl font-bold">{stats.totalDraft}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountDraft)}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Enviadas</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalSent}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountSent)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pagas</p>
                      <p className="text-2xl font-bold text-green-600">{stats.totalPaid}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountPaid)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Vencidas</p>
                      <p className="text-2xl font-bold text-destructive">{stats.totalOverdue}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountOverdue)}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive/50" />
                  </div>
                </Card>
              </div>

          {/* Toolbar */}
          <Toolbar
            searchValue={searchValue}
            searchPlaceholder="Pesquisar faturas..."
            onSearchChange={setSearchValue}
            showFilters={true}
            filtersActive={filtersActive}
            onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
            onClearFilters={() => {
              setActiveFilterId(undefined);
              setStatusFilter(undefined);
            }}
            sortOptions={sortOptions}
            sortValue={sortValue}
            onSortChange={setSortValue}
            leftActions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                className="gap-2"
              >
                {showFilterSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            }
            rightActions={
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          />

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          )}

          {/* Table */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : paginatedInvoices && paginatedInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            paginatedInvoices.length > 0 &&
                            paginatedInvoices.every((inv) => selectedIds.includes(inv.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(invoice.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(invoice.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.client_name}</p>
                            {invoice.client_email && (
                              <p className="text-xs text-muted-foreground">
                                {invoice.client_email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "dd MMM yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Eye className="h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Download className="h-4 w-4" />
                                Descarregar PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.status === "draft" && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => sendInvoice.mutate(invoice.id)}
                                >
                                  <Send className="h-4 w-4" />
                                  Marcar como enviada
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === "sent" || invoice.status === "overdue") && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => markPaid.mutate({ id: invoice.id })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Marcar como paga
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive"
                                onClick={() => {
                                  if (confirm("Tem a certeza que pretende eliminar esta fatura?")) {
                                    deleteInvoice.mutate(invoice.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Sem faturas</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    Crie a sua primeira fatura para começar a gerir recebimentos.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Fatura
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">por página</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </DashboardLayout>
  );
}
