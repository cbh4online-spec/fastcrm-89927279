import { useNavigate } from "react-router-dom";
import { useProcurementProjects } from "@/hooks/useProcurementProjects";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  waiting_procurement: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-muted text-muted-foreground",
};

export default function ProcurementProjectsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { projects, isLoading } = useProcurementProjects(currentWorkspace?.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" /> Projetos de Compras
        </h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !projects.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Sem projetos de compras. Aceite uma proposta com produtos para criar um.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/procurement/projects/${p.id}`)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.source_type}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[p.status] || ""} variant="secondary">{p.status}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Ver</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
