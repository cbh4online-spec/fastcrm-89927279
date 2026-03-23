import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cpu, Brain, Zap, CheckCircle, XCircle, Target, MessageSquare } from "lucide-react";
import { useAIAgentJobs } from "@/hooks/useAIAgentJobs";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function AIAgentExecutionsPage() {
  const { data: jobs, isLoading } = useAIAgentJobs();
  const navigate = useNavigate();

  const completedJobs = (jobs ?? []).filter(j => ['completed', 'failed', 'timeout'].includes(j.status));

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6 text-primary" />
          Execuções de Agentes
        </h1>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !completedJobs.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Sem execuções concluídas.
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedJobs.map(job => {
                const duration = job.completed_at && job.started_at
                  ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                  : null;
                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/ai-agents/${job.id}`)}
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {job.name || job.task?.substring(0, 40) || job.agent_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{job.agent_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={job.status === 'completed' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {job.status === 'completed' ? '✓' : '✗'} {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {job.result_summary || job.error_message || '—'}
                    </TableCell>
                    <TableCell>{duration ? `${duration}s` : '—'}</TableCell>
                    <TableCell className="text-xs">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
