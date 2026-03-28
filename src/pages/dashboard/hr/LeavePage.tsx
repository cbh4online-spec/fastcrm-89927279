import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { LeaveCalendar } from "@/components/hr/LeaveCalendar";
import { LeaveRequestDialog } from "@/components/hr/LeaveRequestDialog";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarDays, Check, X } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Pendente", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Aprovado", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejeitado", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  cancelled: { label: "Cancelado", class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

const TYPE_LABELS: Record<string, string> = {
  vacation: "Férias", sick: "Doença", personal: "Pessoal", remote: "Remoto", other: "Outro",
};

export default function LeavePage() {
  const { user } = useAuth();
  const { requests, isLoading, reviewRequest } = useLeaveRequests();
  const { balances } = useLeaveBalances();

  const myBalance = balances.find((b) => b.user_id === user?.id);
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <ModuleGuard moduleSlug="hr-time-tracking" moduleName="Controlo de Ponto">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Férias & Ausências</h1>
              <p className="text-muted-foreground">Gestão de pedidos de ausência</p>
            </div>
            <LeaveRequestDialog />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo de Férias</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{myBalance ? myBalance.total_days - myBalance.used_days - myBalance.pending_days : 22}</span>
                  <span className="text-sm text-muted-foreground">dias disponíveis</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Usados</CardTitle></CardHeader>
              <CardContent><span className="text-2xl font-bold">{myBalance?.used_days ?? 0}</span><span className="text-sm text-muted-foreground ml-1">dias</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle></CardHeader>
              <CardContent><span className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</span><span className="text-sm text-muted-foreground ml-1">pedidos</span></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Pedidos de Ausência</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center">A carregar...</TableCell></TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem pedidos</TableCell></TableRow>
                    ) : requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{TYPE_LABELS[req.leave_type] || req.leave_type}</TableCell>
                        <TableCell>{format(parseISO(req.start_date), "dd/MM/yyyy", { locale: pt })}</TableCell>
                        <TableCell>{format(parseISO(req.end_date), "dd/MM/yyyy", { locale: pt })}</TableCell>
                        <TableCell>{req.days_count}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_MAP[req.status]?.class || ""}>{STATUS_MAP[req.status]?.label || req.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && req.user_id !== user?.id && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => reviewRequest.mutate({ id: req.id, status: "approved" })}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => reviewRequest.mutate({ id: req.id, status: "rejected" })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Calendário</CardTitle></CardHeader>
              <CardContent><LeaveCalendar /></CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
