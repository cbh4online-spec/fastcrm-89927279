import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRFQs } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { Toolbar } from "@/components/common/Toolbar";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";

const STATUS_KEYS = ["draft", "sent", "receiving_quotes", "evaluated", "awarded", "closed"] as const;

export default function RFQsPage() {
  const { t } = useTranslation("procurement");
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: rfqs, isLoading } = useRFQs(currentWorkspace?.id);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  const sortOptions = useMemo(() => [
    { value: "created_desc", label: t("sortCreatedDesc") },
    { value: "created_asc", label: t("sortCreatedAsc") },
    { value: "due_desc", label: t("sortDueDesc") },
    { value: "due_asc", label: t("sortDueAsc") },
  ], [t]);

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
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <PageHeader
          title={t("rfqsTitle")}
          count={filteredRFQs.length}
        />

        <Toolbar
          searchValue={search}
          searchPlaceholder={t("searchByTitleNumberProject")}
          onSearchChange={setSearch}
          showFilters={false}
          sortOptions={sortOptions}
          sortValue={sortBy}
          onSortChange={(v) => setSortBy(v)}
          leftActions={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm rounded-lg border-border/50 bg-background/50">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {STATUS_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>{t(`status${key.charAt(0).toUpperCase()}${key.slice(1).replace(/_./g, m => m[1].toUpperCase())}` as any, key)}</SelectItem>
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
              <ProcurementEmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title={hasFilters || search ? t("noRFQsFound") : t("noRFQs")}
                description={!hasFilters && !search ? t("noRFQsHint") : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("rfqNumber")}</TableHead>
                    <TableHead>{t("titleLabel")}</TableHead>
                    <TableHead>{t("project")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("deadline")}</TableHead>
                    <TableHead>{t("createdDate")}</TableHead>
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
                          <ProcurementStatusBadge status={rfq.status} />
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
                          <Button size="sm" variant="outline">{t("view")}</Button>
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
    </DashboardLayout>
  );
}