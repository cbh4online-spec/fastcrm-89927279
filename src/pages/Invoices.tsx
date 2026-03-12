import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { RegisterPaymentDialog } from "@/components/invoices/RegisterPaymentDialog";
import { CreditCard } from "lucide-react";
import { InvoiceSettingsTab } from "@/components/invoices/InvoiceSettingsTab";
import { RecurringInvoicesTab } from "@/components/invoices/RecurringInvoicesTab";
import { FiscalSettingsTab } from "@/components/invoices/FiscalSettingsTab";
import { SaftExportTab } from "@/components/invoices/SaftExportTab";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/formatters";
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

export default function Invoices() {
  const { t } = useTranslation("invoices");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentInvoice, setPaymentInvoice] = useState<{ id: string; total: number; amount_paid: number; currency: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("invoices");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date_desc");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();

  const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileText }> = useMemo(() => ({
    draft: { label: t("statusDraft"), variant: "secondary", icon: FileText },
    sent: { label: t("statusSent"), variant: "default", icon: Send },
    paid: { label: t("statusPaid"), variant: "outline", icon: CheckCircle },
    partially_paid: { label: t("statusPartiallyPaid"), variant: "default", icon: CircleDollarSign },
    overdue: { label: t("statusOverdue"), variant: "destructive", icon: AlertTriangle },
    cancelled: { label: t("statusCancelled"), variant: "secondary", icon: FileText },
  }), [t]);

  const pageTabs = useMemo(() => [
    { id: "invoices", label: t("tabInvoices") },
    { id: "recurring", label: t("tabRecurring") },
    { id: "fiscal", label: t("tabFiscal") },
    { id: "saft", label: t("tabSaft") },
    { id: "settings", label: t("tabSettings") },
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: "date_desc", label: t("sortNewest") },
    { value: "date_asc", label: t("sortOldest") },
    { value: "value_desc", label: t("sortHighestValue") },
    { value: "value_asc", label: t("sortLowestValue") },
    { value: "due_asc", label: t("sortDueSoon") },
    { value: "number_asc", label: t("sortNumberAsc") },
  ], [t]);

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "status",
      label: t("filterStatus"),
      icon: <FileText className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: "status_draft", label: t("statusDraft"), icon: <FileText className="h-4 w-4" /> },
        { id: "status_sent", label: t("statusSent"), icon: <Send className="h-4 w-4 text-blue-500" /> },
        { id: "status_paid", label: t("statusPaid"), icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
        { id: "status_overdue", label: t("statusOverdue"), icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
        { id: "status_cancelled", label: t("statusCancelled"), icon: <FileX className="h-4 w-4" /> },
      ],
    },
    {
      id: "value",
      label: t("filterValue"),
      icon: <CircleDollarSign className="h-4 w-4" />,
      defaultOpen: false,
      items: [
        { id: "value_high", label: t("valueHigh") },
        { id: "value_medium", label: t("valueMedium") },
        { id: "value_low", label: t("valueLow") },
      ],
    },
    {
      id: "timing",
      label: t("filterPeriod"),
      icon: <Calendar className="h-4 w-4" />,
      defaultOpen: false,
      items: [
        { id: "timing_today", label: t("timingToday") },
        { id: "timing_week", label: t("timingWeek") },
        { id: "timing_month", label: t("timingMonth") },
        { id: "timing_quarter", label: t("timingQuarter") },
      ],
    },
    {
      id: "smart",
      label: t("filterSmart"),
      icon: <TrendingUp className="h-4 w-4" />,
      defaultOpen: false,
      items: [
        { id: "smart_due_soon", label: t("dueSoon7") },
        { id: "smart_high_value", label: t("highValuePending") },
        { id: "smart_recurring", label: t("recurringClients") },
      ],
    },
  ], [t]);

  const { data: invoices, isLoading, refetch } = useInvoices(
    statusFilter ? { status: statusFilter } : undefined
  );
  const stats = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

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

  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.ceil(totalInvoices / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const totalValue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredInvoices]);

  const filtersActive = !!statusFilter || !!activeFilterId;

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
      [t("csvNumber"), t("csvClient"), t("csvEmail"), t("csvIssueDate"), t("csvDueDate"), t("csvTotal"), t("csvStatus")].join(","),
      ...selected.map((inv) =>
        [
          inv.invoice_number,
          inv.client_name,
          inv.client_email || "",
          formatDate(inv.issue_date, "dd/MM/yyyy"),
          formatDate(inv.due_date, "dd/MM/yyyy"),
          inv.total,
          statusConfig[inv.status].label,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success(t("invoicesExported", { count: selected.length }));
  };

  return (
    <DashboardLayout>
      <div className="flex h-full -m-6">
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

        <div className="flex-1 flex flex-col min-w-0 p-6">
          <PageHeader
            title={t("title")}
            count={totalInvoices}
            description={`${t("total")}: ${formatCurrency(totalValue)}`}
            tabs={pageTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            actions={[
              {
                label: t("newInvoice"),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateDialogOpen(true),
              },
            ]}
          />

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
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("kpiDraft")}</p>
                      <p className="text-2xl font-bold">{stats.totalDraft}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountDraft)}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("kpiSent")}</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalSent}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountSent)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("kpiPaid")}</p>
                      <p className="text-2xl font-bold text-green-600">{stats.totalPaid}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountPaid)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500/50" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("kpiOverdue")}</p>
                      <p className="text-2xl font-bold text-destructive">{stats.totalOverdue}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.amountOverdue)}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive/50" />
                  </div>
                </Card>
              </div>

          <Toolbar
            searchValue={searchValue}
            searchPlaceholder={t("searchInvoices")}
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

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
              <span className="text-sm text-muted-foreground">
                {t("selectedCount", { count: selectedIds.length })}
              </span>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const draftIds = invoices?.filter(inv => selectedIds.includes(inv.id) && inv.status === "draft").map(inv => inv.id) || [];
                  if (draftIds.length === 0) { toast.info(t("noDraftToSend")); return; }
                  draftIds.forEach(id => sendInvoice.mutate(id));
                  toast.success(t("bulkSent", { count: draftIds.length }));
                  setSelectedIds([]);
                }}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {t("bulkSend")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const payableIds = invoices?.filter(inv => selectedIds.includes(inv.id) && (inv.status === "sent" || inv.status === "overdue")).map(inv => inv.id) || [];
                  if (payableIds.length === 0) { toast.info(t("noInvoicesToPay")); return; }
                  payableIds.forEach(id => markPaid.mutate({ id }));
                  toast.success(t("bulkPaid", { count: payableIds.length }));
                  setSelectedIds([]);
                }}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {t("bulkMarkPaid")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
                <Download className="h-4 w-4" />
                {t("export")}
              </Button>
            </div>
          )}

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
                      <TableHead>{t("colNumber")}</TableHead>
                      <TableHead>{t("colClient")}</TableHead>
                      <TableHead>{t("colIssueDate")}</TableHead>
                      <TableHead>{t("colDueDate")}</TableHead>
                      <TableHead className="text-right">{t("colTotal")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
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
                          {formatDate(invoice.issue_date)}
                        </TableCell>
                        <TableCell>
                          {formatDate(invoice.due_date)}
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
                                {t("viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Download className="h-4 w-4" />
                                {t("downloadPdf")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.status === "draft" && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => sendInvoice.mutate(invoice.id)}
                                >
                                  <Send className="h-4 w-4" />
                                  {t("markAsSent")}
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === "sent" || invoice.status === "overdue" || invoice.status === "partially_paid") && (
                                <>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => setPaymentInvoice({
                                      id: invoice.id,
                                      total: invoice.total,
                                      amount_paid: invoice.amount_paid || 0,
                                      currency: invoice.currency || "EUR",
                                    })}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                    {t("registerPayment")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => markPaid.mutate({ id: invoice.id })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    {t("markAsPaid")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive"
                                onClick={() => {
                                  if (confirm(t("confirmDelete"))) {
                                    deleteInvoice.mutate(invoice.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("deleteInvoice")}
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
                  <h3 className="text-lg font-medium text-foreground">{t("noInvoices")}</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    {t("noInvoicesDesc")}
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("createFirstInvoice")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {totalPages > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("show")}</span>
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
                <span className="text-sm text-muted-foreground">{t("perPage")}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("pageOf", { current: currentPage, total: totalPages })}
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

      {paymentInvoice && (
        <RegisterPaymentDialog
          open={!!paymentInvoice}
          onOpenChange={(open) => !open && setPaymentInvoice(null)}
          invoiceId={paymentInvoice.id}
          invoiceTotal={paymentInvoice.total}
          amountPaid={paymentInvoice.amount_paid}
          currency={paymentInvoice.currency}
        />
      )}
    </DashboardLayout>
  );
}
