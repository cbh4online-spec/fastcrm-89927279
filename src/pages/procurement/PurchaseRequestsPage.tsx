import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePurchaseRequests, useConvertRequestToPO } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, FileOutput, Loader2 } from "lucide-react";
import { useState } from "react";
import { PurchaseRequestForm } from "@/components/procurement/PurchaseRequestForm";

const urgencyColors: Record<string, string> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

const statusColors: Record<string, string> = {
  draft: "secondary",
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  converted: "secondary",
};

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("requests")}</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("newRequest")}
          </Button>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground">{t("noRequests")}</p>
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
                    <Badge variant={urgencyColors[r.urgency] as any}>{t(r.urgency)}</Badge>
                  </TableCell>
                  <TableCell>€{(Number(r.total_estimated) || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[r.status] as any}>{t(r.status)}</Badge>
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
