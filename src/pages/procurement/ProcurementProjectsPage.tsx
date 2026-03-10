import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProcurementProjects } from "@/hooks/useProcurementProjects";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";

export default function ProcurementProjectsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { projects, isLoading } = useProcurementProjects(currentWorkspace?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <PageHeader
          title={t("procurementProjects")}
          count={projects.length}
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !projects.length ? (
              <ProcurementEmptyState
                icon={<FolderOpen className="h-8 w-8 text-muted-foreground" />}
                title={t("noProjects")}
                description={t("noProjectsHint")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("origin")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/procurement/projects/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.source_type}</TableCell>
                      <TableCell>
                        <ProcurementStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">{t("view")}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
