import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { ClockInOutButton } from "@/components/hr/ClockInOutButton";
import { LocationMap } from "@/components/hr/LocationMap";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInMinutes } from "date-fns";
import { pt } from "date-fns/locale";
import { Clock, Users, MapPin, Timer } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  edited: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function TimeClockPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [dateFilter, setDateFilter] = useState(today);
  const { entries, isLoading } = useTimeEntries(dateFilter);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const activeCount = entries.filter((e) => e.status === "active").length;
  const completedToday = entries.filter((e) => e.status === "completed").length;
  const totalMinutes = entries.reduce((acc, e) => {
    if (e.clock_out) return acc + differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in));
    return acc;
  }, 0);

  const selected = entries.find((e) => e.id === selectedEntry);

  return (
    <ModuleGuard moduleSlug="hr-time-tracking" moduleName="Controlo de Ponto">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Controlo de Ponto</h1>
              <p className="text-muted-foreground">Registos de entrada e saída</p>
            </div>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ClockInOutButton />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Em Serviço</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{activeCount}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Registos Hoje</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{completedToday}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horas Totais</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span></div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Registos do Dia</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center">A carregar...</TableCell></TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem registos</TableCell></TableRow>
                    ) : entries.map((entry) => {
                      const duration = entry.clock_out
                        ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in))
                        : differenceInMinutes(new Date(), new Date(entry.clock_in));
                      return (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => setSelectedEntry(entry.id === selectedEntry ? null : entry.id)}
                        >
                          <TableCell className="font-medium">{entry.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>{format(new Date(entry.clock_in), "HH:mm", { locale: pt })}</TableCell>
                          <TableCell>{entry.clock_out ? format(new Date(entry.clock_out), "HH:mm", { locale: pt }) : "—"}</TableCell>
                          <TableCell>{Math.floor(duration / 60)}h {duration % 60}m</TableCell>
                          <TableCell>
                            {entry.clock_in_lat ? (
                              <a
                                href={`https://www.google.com/maps?q=${entry.clock_in_lat},${entry.clock_in_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <MapPin className="h-3 w-3" /> Ver Mapa
                              </a>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[entry.status] || ""}>{entry.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Localização</CardTitle></CardHeader>
              <CardContent>
                {selected ? (
                  <LocationMap
                    lat={selected.clock_in_lat}
                    lng={selected.clock_in_lng}
                    address={selected.clock_in_address}
                    label="Clock-in"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selecione um registo para ver a localização
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
