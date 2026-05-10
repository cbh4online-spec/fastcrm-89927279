import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarClock,
  Loader2,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  useScheduledWhatsAppMessages,
  useCancelScheduledMessage,
  useDeleteScheduledMessage,
  type ScheduleStatusFilter,
} from "@/hooks/useWhatsAppScheduled";
import { ScheduleWhatsAppMessageDialog } from "@/components/whatsapp-pro/ScheduleWhatsAppMessageDialog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: "Agendada", cls: "bg-blue-500 hover:bg-blue-500", icon: Clock },
    sent: { label: "Enviada", cls: "bg-emerald-500 hover:bg-emerald-500", icon: CheckCircle2 },
    failed: { label: "Falhou", cls: "bg-destructive hover:bg-destructive", icon: AlertTriangle },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground hover:bg-muted", icon: X },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.icon;
  return (
    <Badge className={`text-[10px] gap-1 ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

export default function WhatsAppScheduledPage() {
  const [tab, setTab] = useState<ScheduleStatusFilter>("pending");
  const { data: list, isLoading } = useScheduledWhatsAppMessages(tab);
  const cancelMut = useCancelScheduledMessage();
  const deleteMut = useDeleteScheduledMessage();

  const counts = useMemo(() => {
    const c = { total: list?.length ?? 0 };
    return c;
  }, [list]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1400px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" />
              Mensagens WhatsApp agendadas
            </h1>
            <p className="text-sm text-muted-foreground">
              Programa envios pontuais para contactos individuais. Para envios massivos usa Campanhas; para fluxos automáticos usa Sequências.
            </p>
          </div>
          <ScheduleWhatsAppMessageDialog />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{counts.total} entrada(s)</CardTitle>
              <Tabs value={tab} onValueChange={(v) => setTab(v as ScheduleStatusFilter)}>
                <TabsList>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="sent">Enviadas</TabsTrigger>
                  <TabsTrigger value="failed">Falhadas</TabsTrigger>
                  <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !list || list.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Sem mensagens nesta categoria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-sm">{m.to_phone}</TableCell>
                      <TableCell className="max-w-[380px]">
                        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                          {m.body}
                        </p>
                        {m.last_error && (
                          <p className="text-[10px] text-destructive mt-1 line-clamp-1">
                            Erro: {m.last_error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(m.scheduled_at), "dd MMM yyyy HH:mm", { locale: pt })}
                        <div className="text-[10px] text-muted-foreground">{m.timezone}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                        {m.attempts > 0 && m.status !== "sent" && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {m.attempts} tentativa(s)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {m.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Cancelar"
                              onClick={() => cancelMut.mutate(m.id)}
                              disabled={cancelMut.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {m.status !== "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Eliminar"
                              onClick={() => deleteMut.mutate(m.id)}
                              disabled={deleteMut.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
