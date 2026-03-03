import { useNavigate } from "react-router-dom";
import { useRFQs } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  receiving_quotes: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  evaluated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  awarded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-muted text-muted-foreground",
};

export default function RFQsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: rfqs, isLoading } = useRFQs(currentWorkspace?.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Pedidos de Cotação (RFQ)
        </h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !(rfqs || []).length ? (
            <div className="text-center py-12 text-muted-foreground">
              Sem RFQs. Crie um a partir de um Projeto de Compras.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rfqs || []).map((rfq: any) => (
                  <TableRow key={rfq.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/procurement/rfqs/${rfq.id}`)}>
                    <TableCell className="font-medium">{rfq.title}</TableCell>
                    <TableCell>{rfq.procurement_projects?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[rfq.status] || ""} variant="secondary">{rfq.status}</Badge>
                    </TableCell>
                    <TableCell>{rfq.due_date || "—"}</TableCell>
                    <TableCell>{format(new Date(rfq.created_at), "dd/MM/yyyy")}</TableCell>
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
