import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTicketTimeTracking } from "@/hooks/helpdesk/useTicketTimeTracking";
import { useTicketExpenses, EXPENSE_TYPE_LABELS } from "@/hooks/helpdesk/useTicketExpenses";
import { Play, Square, Clock, Plus, Trash2, Euro, Timer, Receipt, DollarSign } from "lucide-react";
import { toast } from "sonner";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  ticketId: string;
}

export function TicketTimeCosts({ ticketId }: Props) {
  const {
    entries, addEntry, deleteEntry, isRunning, elapsed, startTimer, pauseTimer, saveTimerEntry,
    totalMinutes, totalCost: timeCost,
  } = useTicketTimeTracking(ticketId);
  const { expenses, addExpense, deleteExpense, totalExpenses } = useTicketExpenses(ticketId);

  // Manual time form
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualRate, setManualRate] = useState("");

  // Expense form
  const [expType, setExpType] = useState("outro");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");

  // Timer save
  const [timerDesc, setTimerDesc] = useState("");
  const [timerRate, setTimerRate] = useState("");

  const handleAddManual = () => {
    const mins = parseInt(manualMinutes);
    if (!mins || mins <= 0) { toast.error("Duração inválida"); return; }
    addEntry.mutate({
      duration_minutes: mins,
      description: manualDesc || undefined,
      hourly_rate: parseFloat(manualRate) || 0,
      entry_type: "manual",
    }, {
      onSuccess: () => { setManualMinutes(""); setManualDesc(""); setManualRate(""); toast.success("Tempo registado"); },
      onError: () => toast.error("Erro ao registar tempo"),
    });
  };

  const handleSaveTimer = async () => {
    try {
      await saveTimerEntry(timerDesc || undefined, parseFloat(timerRate) || 0);
      setTimerDesc("");
      setTimerRate("");
      toast.success("Tempo do timer guardado");
    } catch {
      toast.error("Erro ao guardar timer");
    }
  };

  const handleAddExpense = () => {
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) { toast.error("Valor inválido"); return; }
    addExpense.mutate({
      expense_type: expType,
      description: expDesc || undefined,
      amount: amt,
    }, {
      onSuccess: () => { setExpType("outro"); setExpDesc(""); setExpAmount(""); toast.success("Despesa registada"); },
      onError: () => toast.error("Erro ao registar despesa"),
    });
  };

  const grandTotal = timeCost + totalExpenses;

  return (
    <div className="p-4 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Tempo Total</p>
              <p className="text-lg font-bold">{formatDuration(totalMinutes)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Custo M.O.</p>
              <p className="text-lg font-bold">€{timeCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Despesas</p>
              <p className="text-lg font-bold">€{totalExpenses.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Euro className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Custo Total</p>
              <p className="text-lg font-bold text-green-600">€{grandTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Timer className="h-4 w-4" />
            Cronómetro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`font-mono text-2xl tabular-nums ${isRunning ? "text-primary" : "text-muted-foreground"}`}>
              {formatElapsed(elapsed)}
            </span>
            {!isRunning ? (
              <Button size="sm" variant="default" onClick={startTimer} className="gap-1">
                <Play className="h-3.5 w-3.5" /> Iniciar
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={pauseTimer} className="gap-1">
                <Square className="h-3.5 w-3.5" /> Parar
              </Button>
            )}
          </div>
          {!isRunning && elapsed >= 60 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={timerDesc} onChange={(e) => setTimerDesc(e.target.value)} placeholder="O que fez?" className="h-8 text-xs" />
              </div>
              <div className="w-24">
                <Label className="text-xs">€/hora</Label>
                <Input value={timerRate} onChange={(e) => setTimerRate(e.target.value)} type="number" min="0" step="0.01" placeholder="0" className="h-8 text-xs" />
              </div>
              <Button size="sm" onClick={handleSaveTimer} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Guardar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Time Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Registo Manual de Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="w-20">
              <Label className="text-xs">Minutos</Label>
              <Input value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} type="number" min="1" placeholder="30" className="h-8 text-xs" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Descrição..." className="h-8 text-xs" />
            </div>
            <div className="w-24">
              <Label className="text-xs">€/hora</Label>
              <Input value={manualRate} onChange={(e) => setManualRate(e.target.value)} type="number" min="0" step="0.01" placeholder="0" className="h-8 text-xs" />
            </div>
            <Button size="sm" onClick={handleAddManual} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      {entries.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agente</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Duração</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">€/h</TableHead>
                <TableHead className="text-xs">Custo</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.agent_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {e.entry_type === "timer" ? "Timer" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{formatDuration(e.duration_minutes)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{e.description || "—"}</TableCell>
                  <TableCell className="text-xs">€{(e.hourly_rate || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs font-medium">€{(e.cost || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteEntry.mutate(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Separator />

      {/* Expenses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="w-32">
              <Label className="text-xs">Tipo</Label>
              <Select value={expType} onValueChange={setExpType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Descrição..." className="h-8 text-xs" />
            </div>
            <div className="w-24">
              <Label className="text-xs">Valor €</Label>
              <Input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="h-8 text-xs" />
            </div>
            <Button size="sm" onClick={handleAddExpense} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agente</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Valor</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.agent_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{e.description || "—"}</TableCell>
                  <TableCell className="text-xs font-medium">€{(e.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteExpense.mutate(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
