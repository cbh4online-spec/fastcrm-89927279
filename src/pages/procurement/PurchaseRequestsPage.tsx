import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePurchaseRequests, useConvertRequestToPO } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X, FileOutput, Loader2, ClipboardList } from "lucide-react";
import { useState } from "react";
import { PurchaseRequestForm } from "@/components/procurement/PurchaseRequestForm";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";

export default function PurchaseRequestsPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: requests = [], isLoading, create, approve, reject } = usePurchaseRequests(currentWorkspace?.id);
  const convertMutation = useConvertRequestToPO();
  const [showForm, setShowForm] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleConvert = async (requestId: string) => {
    if (!currentWorkspace?.id) return;
    setConvertingId(requestId);
    try {
      await convertMutation.mutateAsync({ workspaceId: currentWorkspace.id, requestId });
    } catch {
      // error handled by hook
    }
    setConvertingId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("requests")}
          count={(requests as any[]).length}
          actions={[
            {
              label: t("newRequest"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowForm(true),
            },
          ]}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (requests as any[]).length === 0 ? (
          <ProcurementEmptyState
            icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
            title={t("noRequests")}
            actionLabel={t("newRequest")}
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("urgency")}</TableHead>
                <TableHead>{t("totalEstimated")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests as any[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.supplier?.name || "—"}</TableCell>
                  <TableCell>
                    <ProcurementStatusBadge status={r.urgency} />
                  </TableCell>
                  <TableCell>€{(Number(r.total_estimated) || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <ProcurementStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{r.items?.length || 0}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => approve({ id: r.id })}>
                          <Check className="h-3 w-3 mr-1" />{t("approve")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reject({ id: r.id })}>
                          <X className="h-3 w-3 mr-1" />{t("reject")}
                        </Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={convertingId === r.id}
                        onClick={() => handleConvert(r.id)}
                      >
                        {convertingId === r.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <FileOutput className="h-3 w-3 mr-1" />
                        )}
                        {t("generatePO")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <PurchaseRequestForm
          open={showForm}
          onOpenChange={setShowForm}
          workspaceId={currentWorkspace?.id}
          onSave={async (values) => {
            await create(values);
            setShowForm(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
