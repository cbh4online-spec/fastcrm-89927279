import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageElementGate } from "@/components/shared/PageElementGate";
import { usePageElementVisibility } from "@/hooks/usePageElementVisibility";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { EditInvoiceDatesDialog } from "@/components/invoices/EditInvoiceDatesDialog";
import { InvoiceSettingsTab } from "@/components/invoices/InvoiceSettingsTab";
import { RecurringInvoicesTab } from "@/components/invoices/RecurringInvoicesTab";
import { FiscalSettingsTab } from "@/components/invoices/FiscalSettingsTab";
import { SaftExportTab } from "@/components/invoices/SaftExportTab";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/formatters";
import {
  DocumentListLayout,
  DocumentFilterChip,
  DocumentListToolbar,
  DocumentSummaryCard,
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
  type SummaryItem,
} from "@/components/documents/listing";
import {
  Plus,
  Send,
  CheckCircle,
  Trash2,
  Eye,
  Download,
  CreditCard,
  FileText,
  MoreHorizontal,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_TONE: Record<InvoiceStatus, DocumentStatusTone> = {
  draft: "draft",
  sent: "sent",
  paid: "paid",
  partially_paid: "partial",
  overdue: "overdue",
  cancelled: "cancelled",
};

export default function Invoices() {
  const navigate = useNavigate();
  const { t } = useTranslation("invoices");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentInvoice, setPaymentInvoice] = useState<{ id: string; total: number; amount_paid: number; currency: string } | null>(null);
  const [datesInvoice, setDatesInvoice] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("invoices");
  const { isElementVisible } = usePageElementVisibility("invoices");
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date_desc");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const statusLabel: Record<InvoiceStatus, string> = useMemo(() => ({
    draft: t("statusDraft"),
    sent: t("statusSent"),
    paid: t("statusPaid"),
    partially_paid: t("statusPartiallyPaid"),
    overdue: t("statusOverdue"),
    cancelled: t("statusCancelled"),
  }), [t]);

  const sortOptions = useMemo(() => [
    { value: "date_desc", label: t("sortNewest") },
    { value: "date_asc", label: t("sortOldest") },
    { value: "value_desc", label: t("sortHighestValue") },
    { value: "value_asc", label: t("sortLowestValue") },
    { value: "due_asc", label: t("sortDueSoon") },
    { value: "number_asc", label: t("sortNumberAsc") },
  ], [t]);

  const { data: invoices, isLoading } = useInvoices(
    statusFilter !== "all" ? { status: statusFilter as InvoiceStatus } : undefined,
  );
  const stats = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let result = invoices;
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.client_name.toLowerCase().includes(lower) ||
          inv.invoice_number.toLowerCase().includes(lower),
      );
    }
    // Sort
    const sorted = [...result].sort((a, b) => {
      switch (sortValue) {
        case "date_asc": return a.issue_date.localeCompare(b.issue_date);
        case "value_desc": return (b.total || 0) - (a.total || 0);
        case "value_asc": return (a.total || 0) - (b.total || 0);
        case "due_asc": return (a.due_date || "").localeCompare(b.due_date || "");
        case "number_asc": return a.invoice_number.localeCompare(b.invoice_number);
        case "date_desc":
        default: return b.issue_date.localeCompare(a.issue_date);
      }
    });
    return sorted;
  }, [invoices, searchValue, sortValue]);

  const totalInvoices = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // --- Summary card aggregates (apenas faturas ativas: exclui draft/cancelled)
  const summary = useMemo(() => {
    const active = (invoices || []).filter(
      (i) => i.status !== "draft" && i.status !== "cancelled",
    );
    let notDue = 0;
    let due = 0;
    let received = 0;
    let totalNet = 0;
    let totalVat = 0;
    let totalGross = 0;
    const today = new Date().toISOString().slice(0, 10);
    active.forEach((inv) => {
      const gross = inv.total || 0;
      const paid = (inv as any).amount_paid || 0;
      const net = (inv as any).subtotal || 0;
      const vat = Math.max(0, gross - net);
      totalNet += net;
      totalVat += vat;
      totalGross += gross;
      received += paid;
      const outstanding = Math.max(0, gross - paid);
      if (outstanding > 0) {
        if ((inv.due_date || "") < today) due += outstanding;
        else notDue += outstanding;
      }
    });
    const drafts = (invoices || []).filter((i) => i.status === "draft");
    const cancelled = (invoices || []).filter((i) => i.status === "cancelled");
    const draftsGross = drafts.reduce((s, i) => s + (i.total || 0), 0);
    const draftsNet = drafts.reduce((s, i) => s + ((i as any).subtotal || 0), 0);
    const cancelledGross = cancelled.reduce((s, i) => s + (i.total || 0), 0);
    const cancelledNet = cancelled.reduce((s, i) => s + ((i as any).subtotal || 0), 0);
    return {
      notDue,
      due,
      received,
      adjustments: 0,
      totalNet,
      totalVat,
      totalGross,
      draftsGross,
      draftsNet,
      cancelledGross,
      cancelledNet,
    };
  }, [invoices]);

  const summaryItems: SummaryItem[] = [
    { label: "Não Vencido", value: formatCurrency(summary.notDue), tone: "default" },
    { label: "Vencido", value: formatCurrency(summary.due), tone: summary.due > 0 ? "destructive" : "default" },
    { label: "Recebido", value: formatCurrency(summary.received), tone: "success" },
    { label: "Acertos", value: formatCurrency(summary.adjustments), tone: "muted" },
    { label: "Total sem IVA", value: formatCurrency(summary.totalNet), tone: "primary" },
    { label: "IVA", value: formatCurrency(summary.totalVat), tone: "default" },
    { label: "Total", value: formatCurrency(summary.totalGross), tone: "primary" },
  ];
  const summarySeparators: Array<"+" | "=" | null> = ["+", "+", "+", "=", "+", "="];

  const filtersActive = statusFilter !== "all" || !!searchValue;

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginatedInvoices.map((inv) => inv.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchValue("");
  };

  return (
    <DashboardLayout>
      <DocumentListLayout
        title={t("title")}
        searchValue={searchValue}
        onSearchChange={(v) => {
          setSearchValue(v);
          setCurrentPage(1);
        }}
        primaryAction={
          <PageElementGate kind="action" id="new-invoice">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              {t("newInvoice")}
            </Button>
          </PageElementGate>
        }
        secondaryAction={
          <PageElementGate kind="action" id="create-others">
            <Button variant="outline" onClick={() => setActiveTab("recurring")} className="rounded-full">
              Criar Outros
            </Button>
          </PageElementGate>
        }
        chips={
          <>
            <DocumentFilterChip
              label="Estado"
              value={statusFilter === "all" ? "Todos" : statusLabel[statusFilter]}
              active={statusFilter !== "all"}
            >
              <DropdownMenuItem onSelect={() => setStatusFilter("all")}>Todos</DropdownMenuItem>
              <DropdownMenuSeparator />
              {(Object.keys(statusLabel) as InvoiceStatus[]).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setStatusFilter(s)}>
                  {statusLabel[s]}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip label="Ordenação" value={sortOptions.find((o) => o.value === sortValue)?.label || "Data"}>
              {sortOptions.map((o) => (
                <DropdownMenuItem key={o.value} onSelect={() => setSortValue(o.value)}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
            <DocumentFilterChip label="Resultados" value={`${pageSize}/página`}>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => { setPageSize(s); setCurrentPage(1); }}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DocumentFilterChip>
          </>
        }
        summary={
          activeTab === "invoices" ? (
            <DocumentSummaryCard
              items={summaryItems}
              separators={summarySeparators}
              footer={
                <>
                  <span className="text-amber-700">
                    <strong>Rascunhos:</strong> {formatCurrency(summary.draftsGross)} (
                    {formatCurrency(summary.draftsNet)} S/IVA)
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="text-muted-foreground">
                    <strong>Cancelados:</strong> {formatCurrency(summary.cancelledGross)} (
                    {formatCurrency(summary.cancelledNet)} S/IVA)
                  </span>
                </>
              }
            />
          ) : undefined
        }
        toolbar={
          activeTab === "invoices" ? (
            <DocumentListToolbar
              selectAllChecked={paginatedInvoices.length > 0 && paginatedInvoices.every((inv) => selectedIds.includes(inv.id))}
              onSelectAll={handleSelectAll}
              sortOptions={sortOptions}
              sortValue={sortValue}
              onSortChange={setSortValue}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(v) => { setPageSize(v); setCurrentPage(1); }}
              totalCount={totalInvoices}
              countLabel="Documentos"
              onClearFilters={clearFilters}
              clearFiltersDisabled={!filtersActive}
            />
          ) : undefined
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2 bg-transparent p-0 gap-1">
            {[
              { id: "invoices", label: t("tabInvoices") },
              { id: "recurring", label: t("tabRecurring") },
              { id: "fiscal", label: t("tabFiscal") },
              { id: "saft", label: t("tabSaft") },
              { id: "settings", label: t("tabSettings") },
            ].filter((tab) => isElementVisible("tab", tab.id)).map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
                <span className="text-sm text-foreground">
                  {t("selectedCount", { count: selectedIds.length })}
                </span>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const draftIds = invoices?.filter((inv) => selectedIds.includes(inv.id) && inv.status === "draft").map((inv) => inv.id) || [];
                    if (draftIds.length === 0) { toast.info(t("noDraftToSend")); return; }
                    draftIds.forEach((id) => sendInvoice.mutate(id));
                    toast.success(t("bulkSent", { count: draftIds.length }));
                    setSelectedIds([]);
                  }}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" /> {t("bulkSend")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const payableIds = invoices?.filter((inv) => selectedIds.includes(inv.id) && (inv.status === "sent" || inv.status === "overdue")).map((inv) => inv.id) || [];
                    if (payableIds.length === 0) { toast.info(t("noInvoicesToPay")); return; }
                    payableIds.forEach((id) => markPaid.mutate({ id }));
                    toast.success(t("bulkPaid", { count: payableIds.length }));
                    setSelectedIds([]);
                  }}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" /> {t("bulkMarkPaid")}
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : paginatedInvoices.length > 0 ? (
              <div className="flex flex-col gap-3">
                {paginatedInvoices.map((invoice) => {
                  const gross = invoice.total || 0;
                  const net = (invoice as any).subtotal || gross;
                  const today = new Date().toISOString().slice(0, 10);
                  const isOverdue =
                    (invoice.status === "sent" || invoice.status === "partially_paid") &&
                    (invoice.due_date || "") < today;
                  return (
                    <DocumentRow
                      key={invoice.id}
                      selected={selectedIds.includes(invoice.id)}
                      onSelectedChange={(c) => handleSelectOne(invoice.id, c)}
                      statusBadge={
                        <DocumentStatusBadge
                          label={statusLabel[invoice.status]}
                          tone={STATUS_TONE[invoice.status]}
                        />
                      }
                      number={invoice.invoice_number}
                      subtitle="FATURA"
                      clientName={invoice.client_name}
                      clientSubtitle={invoice.client_email ?? undefined}
                      issueDate={formatDate(invoice.issue_date)}
                      dueDate={formatDate(invoice.due_date)}
                      dueDateTone={isOverdue ? "overdue" : "default"}
                      totalPrimary={formatCurrency(gross)}
                      totalSecondary={`${formatCurrency(net)} S/IVA`}
                      onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                      action={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:bg-primary/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem className="gap-2" onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}>
                              <Eye className="h-4 w-4" /> {t("viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Download className="h-4 w-4" /> {t("downloadPdf")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => setDatesInvoice(invoice)}>
                              <CalendarDays className="h-4 w-4" /> Editar datas
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {invoice.status === "draft" && (
                              <DropdownMenuItem className="gap-2" onClick={() => sendInvoice.mutate(invoice.id)}>
                                <Send className="h-4 w-4" /> {t("markAsSent")}
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
                                  <CreditCard className="h-4 w-4" /> {t("registerPayment")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => markPaid.mutate({ id: invoice.id })}>
                                  <CheckCircle className="h-4 w-4" /> {t("markAsPaid")}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive"
                              onClick={() => {
                                if (confirm(t("confirmDelete"))) deleteInvoice.mutate(invoice.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> {t("deleteInvoice")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground">{t("noInvoices")}</h3>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("noInvoicesDesc")}</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> {t("createFirstInvoice")}
                </Button>
              </div>
            )}

            {totalInvoices > pageSize && (
              <div className="flex items-center justify-end gap-2 pt-2">
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
            )}
          </>
        )}
      </DocumentListLayout>

      <CreateInvoiceDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {datesInvoice && (
        <EditInvoiceDatesDialog
          open={!!datesInvoice}
          onOpenChange={(o) => !o && setDatesInvoice(null)}
          invoice={datesInvoice}
        />
      )}

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
