import { useState, useEffect } from "react";

// Resolve taxa anual (%) a partir de PV, PMT, n períodos e periods/ano via Newton-Raphson
function solveAnnualRate(pv: number, pmt: number, nPeriods: number, periodsPerYear: number): number | null {
  if (!(pv > 0) || !(pmt > 0) || !(nPeriods > 0)) return null;
  const totalPaid = pmt * nPeriods;
  // Se a soma das rendas é inferior ao PV, taxa seria negativa → não auto-preencher
  if (totalPaid < pv) return null;
  if (totalPaid === pv) return 0;
  let i = 0.01; // chute inicial (1% por período)
  for (let k = 0; k < 100; k++) {
    const f = pmt * (1 - Math.pow(1 + i, -nPeriods)) / i - pv;
    const df =
      pmt *
      ((nPeriods * Math.pow(1 + i, -nPeriods - 1)) / i -
        (1 - Math.pow(1 + i, -nPeriods)) / (i * i));
    if (Math.abs(df) < 1e-12) break;
    const next = i - f / df;
    if (!isFinite(next) || next <= 0) {
      i = i / 2;
      continue;
    }
    if (Math.abs(next - i) < 1e-8) {
      i = next;
      break;
    }
    i = next;
  }
  const annual = i * periodsPerYear * 100;
  if (!isFinite(annual) || annual < 0 || annual > 200) return null;
  return Math.round(annual * 100) / 100;
}

function addMonthsISO(startISO: string, months: number): string {
  const d = new Date(startISO);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Wallet, FileCheck2, FileWarning } from "lucide-react";
import {
  useCompanyFinancing,
  type FinancingRating,
  type DocumentationStatus,
  type FinancingSimulation,
  type PaymentFrequency,
  type SimulationStatus,
} from "@/hooks/useCompanyFinancing";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
  companyName: string;
}

const RATING_STYLES: Record<FinancingRating, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-teal-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
};

const STATUS_STYLES: Record<SimulationStatus, string> = {
  simulacao: "bg-muted text-muted-foreground",
  activo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  concluido: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  cancelado: "bg-destructive/15 text-destructive",
};

const STATUS_LABELS: Record<SimulationStatus, string> = {
  simulacao: "Simulação",
  activo: "Activo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const fmtEUR = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

export function CompanyFinancingSection({ companyId, companyName }: Props) {
  const {
    financing,
    simulations,
    isLoading,
    upsertFinancing,
    createSimulation,
    updateSimulation,
    deleteSimulation,
  } = useCompanyFinancing(companyId);

  const [editingPlafond, setEditingPlafond] = useState(false);
  const [plafondDraft, setPlafondDraft] = useState({
    plafond_amount: "",
    rating: "" as FinancingRating | "",
    documentation_status: "pendente" as DocumentationStatus,
    documentation_notes: "",
    request_date: "",
    notes: "",
  });

  const openPlafondEditor = () => {
    setPlafondDraft({
      plafond_amount: financing?.plafond_amount?.toString() ?? "",
      rating: (financing?.rating ?? "") as FinancingRating | "",
      documentation_status: financing?.documentation_status ?? "pendente",
      documentation_notes: financing?.documentation_notes ?? "",
      request_date: financing?.request_date ?? "",
      notes: financing?.notes ?? "",
    });
    setEditingPlafond(true);
  };

  const savePlafond = async () => {
    await upsertFinancing({
      plafond_amount: plafondDraft.plafond_amount ? Number(plafondDraft.plafond_amount) : null,
      rating: (plafondDraft.rating || null) as FinancingRating | null,
      documentation_status: plafondDraft.documentation_status,
      documentation_notes: plafondDraft.documentation_notes || null,
      request_date: plafondDraft.request_date || null,
      notes: plafondDraft.notes || null,
    });
    setEditingPlafond(false);
  };

  // Simulation dialog
  const [simDialogOpen, setSimDialogOpen] = useState(false);
  const [editingSim, setEditingSim] = useState<FinancingSimulation | null>(null);
  const [simDraft, setSimDraft] = useState({
    label: "",
    operation_value: "",
    payment_frequency: "mensal" as PaymentFrequency,
    duration_months: "36",
    installment_value: "",
    interest_rate: "",
    status: "simulacao" as SimulationStatus,
    start_date: "",
    end_date: "",
    notes: "",
  });

  // Flags para não sobrescrever edições manuais
  const [manualRate, setManualRate] = useState(false);
  const [manualStart, setManualStart] = useState(false);
  const [manualEnd, setManualEnd] = useState(false);

  const openNewSim = () => {
    setEditingSim(null);
    setManualRate(false);
    setManualStart(false);
    setManualEnd(false);
    setSimDraft({
      label: "",
      operation_value: "",
      payment_frequency: "mensal",
      duration_months: "36",
      installment_value: "",
      interest_rate: "",
      status: "simulacao",
      start_date: todayISO(),
      end_date: "",
      notes: "",
    });
    setSimDialogOpen(true);
  };

  const openEditSim = (sim: FinancingSimulation) => {
    setEditingSim(sim);
    setManualRate(!!sim.interest_rate);
    setManualStart(!!sim.start_date);
    setManualEnd(!!sim.end_date);
    setSimDraft({
      label: sim.label ?? "",
      operation_value: sim.operation_value.toString(),
      payment_frequency: sim.payment_frequency,
      duration_months: sim.duration_months.toString(),
      installment_value: sim.installment_value.toString(),
      interest_rate: sim.interest_rate?.toString() ?? "",
      status: sim.status,
      start_date: sim.start_date ?? "",
      end_date: sim.end_date ?? "",
      notes: sim.notes ?? "",
    });
    setSimDialogOpen(true);
  };

  // Auto-calc taxa sempre que valor da operação / renda / duração / frequência mudam
  useEffect(() => {
    if (manualRate) return;
    const pv = Number(simDraft.operation_value);
    const pmt = Number(simDraft.installment_value);
    const months = Number(simDraft.duration_months);
    if (!(pv > 0) || !(pmt > 0) || !(months > 0)) return;
    const periodsPerYear = simDraft.payment_frequency === "trimestral" ? 4 : 12;
    const nPeriods = simDraft.payment_frequency === "trimestral" ? months / 3 : months;
    const rate = solveAnnualRate(pv, pmt, nPeriods, periodsPerYear);
    if (rate != null) {
      const str = rate.toFixed(2);
      setSimDraft((p) => (p.interest_rate === str ? p : { ...p, interest_rate: str }));
    }
  }, [
    simDraft.operation_value,
    simDraft.installment_value,
    simDraft.duration_months,
    simDraft.payment_frequency,
    manualRate,
  ]);

  // Auto-calc fim quando início + duração existem
  useEffect(() => {
    if (manualEnd) return;
    const months = Number(simDraft.duration_months);
    if (!simDraft.start_date || !(months > 0)) return;
    const end = addMonthsISO(simDraft.start_date, months);
    if (end) {
      setSimDraft((p) => (p.end_date === end ? p : { ...p, end_date: end }));
    }
  }, [simDraft.start_date, simDraft.duration_months, manualEnd]);



  const saveSim = async () => {
    const payload = {
      label: simDraft.label || null,
      operation_value: Number(simDraft.operation_value || 0),
      payment_frequency: simDraft.payment_frequency,
      duration_months: Number(simDraft.duration_months || 0),
      installment_value: Number(simDraft.installment_value || 0),
      interest_rate: simDraft.interest_rate ? Number(simDraft.interest_rate) : null,
      status: simDraft.status,
      start_date: simDraft.start_date || null,
      end_date: simDraft.end_date || null,
      notes: simDraft.notes || null,
    };
    if (editingSim) {
      await updateSimulation({ id: editingSim.id, ...payload });
    } else {
      await createSimulation(payload);
    }
    setSimDialogOpen(false);
  };

  const [simToDelete, setSimToDelete] = useState<string | null>(null);

  // KPIs activos
  const activos = simulations.filter((s) => s.status === "activo");
  const totalMensalActivo = activos.reduce((acc, s) => {
    const monthly = s.payment_frequency === "trimestral" ? s.installment_value / 3 : s.installment_value;
    return acc + monthly;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Card Plafond + documentação */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Plafond &amp; Documentação
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Capacidade de financiamento aprovada para {companyName}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={openPlafondEditor}>
            <Pencil className="w-4 h-4 mr-2" />
            {financing ? "Editar" : "Definir"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">A carregar…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Plafond</div>
                <div className="text-2xl font-semibold mt-1">{fmtEUR(financing?.plafond_amount)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Rating</div>
                <div className="mt-1">
                  {financing?.rating ? (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-9 h-9 rounded-full text-base font-bold",
                        RATING_STYLES[financing.rating]
                      )}
                    >
                      {financing.rating}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Documentação</div>
                <div className="mt-1">
                  {financing?.documentation_status === "ok" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      <FileCheck2 className="w-3 h-3 mr-1" /> OK
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <FileWarning className="w-3 h-3 mr-1" /> Pendente
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Data Pedido</div>
                <div className="text-sm font-medium mt-1">
                  {financing?.request_date
                    ? new Date(financing.request_date).toLocaleDateString("pt-PT")
                    : "—"}
                </div>
              </div>
              {financing?.documentation_notes && (
                <div className="sm:col-span-2 lg:col-span-4 rounded-md bg-muted/40 p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Notas de documentação
                  </div>
                  {financing.documentation_notes}
                </div>
              )}
              {financing?.notes && (
                <div className="sm:col-span-2 lg:col-span-4 rounded-md bg-muted/40 p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Notas</div>
                  {financing.notes}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Simulações / Mensalidades */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Simulações &amp; Mensalidades</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {activos.length} contrato(s) activo(s) · {fmtEUR(totalMensalActivo)} /mês
            </p>
          </div>
          <Button size="sm" onClick={openNewSim}>
            <Plus className="w-4 h-4 mr-2" /> Nova Simulação
          </Button>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Sem simulações. Crie a primeira para registar valor, duração e renda.
            </div>
          ) : (
            <div className="space-y-3">
              {simulations.map((sim) => (
                <div
                  key={sim.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {sim.label || `Simulação ${fmtEUR(sim.operation_value)}`}
                      </span>
                      <Badge className={cn("text-xs", STATUS_STYLES[sim.status])}>
                        {STATUS_LABELS[sim.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Operação</div>
                        <div className="font-medium text-sm text-foreground">
                          {fmtEUR(sim.operation_value)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Renda ({sim.payment_frequency})</div>
                        <div className="font-medium text-sm text-foreground">
                          {fmtEUR(sim.installment_value)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Duração</div>
                        <div className="font-medium text-sm text-foreground">
                          {sim.duration_months} meses
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Taxa</div>
                        <div className="font-medium text-sm text-foreground">
                          {sim.interest_rate != null ? `${sim.interest_rate}%` : "—"}
                        </div>
                      </div>
                    </div>
                    {(sim.start_date || sim.end_date) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {sim.start_date
                          ? new Date(sim.start_date).toLocaleDateString("pt-PT")
                          : "—"}
                        {" → "}
                        {sim.end_date
                          ? new Date(sim.end_date).toLocaleDateString("pt-PT")
                          : "—"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button variant="ghost" size="sm" onClick={() => openEditSim(sim)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSimToDelete(sim.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog editar plafond */}
      <Dialog open={editingPlafond} onOpenChange={setEditingPlafond}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Plafond &amp; Documentação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plafond (€)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={plafondDraft.plafond_amount}
                  onChange={(e) =>
                    setPlafondDraft((p) => ({ ...p, plafond_amount: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Rating</Label>
                <Select
                  value={plafondDraft.rating || undefined}
                  onValueChange={(v) =>
                    setPlafondDraft((p) => ({ ...p, rating: v as FinancingRating }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {(["A", "B", "C", "D"] as FinancingRating[]).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Documentação</Label>
                <Select
                  value={plafondDraft.documentation_status}
                  onValueChange={(v) =>
                    setPlafondDraft((p) => ({ ...p, documentation_status: v as DocumentationStatus }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data do pedido</Label>
                <Input
                  type="date"
                  value={plafondDraft.request_date}
                  onChange={(e) => setPlafondDraft((p) => ({ ...p, request_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Notas de documentação</Label>
              <Textarea
                rows={2}
                value={plafondDraft.documentation_notes}
                onChange={(e) =>
                  setPlafondDraft((p) => ({ ...p, documentation_notes: e.target.value }))
                }
                placeholder="Ex.: Submeter último IRC (Anexo B ou C), IRS ou relatório e contas."
              />
            </div>
            <div>
              <Label>Notas gerais</Label>
              <Textarea
                rows={2}
                value={plafondDraft.notes}
                onChange={(e) => setPlafondDraft((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlafond(false)}>Cancelar</Button>
            <Button onClick={savePlafond}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog simulação */}
      <Dialog open={simDialogOpen} onOpenChange={setSimDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSim ? "Editar Simulação" : "Nova Simulação"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Designação (opcional)</Label>
              <Input
                value={simDraft.label}
                onChange={(e) => setSimDraft((p) => ({ ...p, label: e.target.value }))}
                placeholder="Ex.: AP-246463"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor da operação (€)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={simDraft.operation_value}
                  onChange={(e) =>
                    setSimDraft((p) => ({ ...p, operation_value: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Valor da renda (€)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={simDraft.installment_value}
                  onChange={(e) =>
                    setSimDraft((p) => ({ ...p, installment_value: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Frequência</Label>
                <Select
                  value={simDraft.payment_frequency}
                  onValueChange={(v) =>
                    setSimDraft((p) => ({ ...p, payment_frequency: v as PaymentFrequency }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração (meses)</Label>
                <Select
                  value={simDraft.duration_months}
                  onValueChange={(v) => setSimDraft((p) => ({ ...p, duration_months: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["12", "24", "36", "48", "60", "72", "84"].map((m) => (
                      <SelectItem key={m} value={m}>{m} meses</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center justify-between">
                  <span>Taxa (%)</span>
                  {!manualRate && simDraft.interest_rate && (
                    <span className="text-[10px] text-muted-foreground">auto</span>
                  )}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="auto"
                  value={simDraft.interest_rate}
                  onChange={(e) => {
                    setManualRate(true);
                    setSimDraft((p) => ({ ...p, interest_rate: e.target.value }));
                  }}
                />
                {manualRate && (
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline mt-1"
                    onClick={() => {
                      setManualRate(false);
                      setSimDraft((p) => ({ ...p, interest_rate: "" }));
                    }}
                  >
                    Recalcular automaticamente
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Estado</Label>
                <Select
                  value={simDraft.status}
                  onValueChange={(v) => setSimDraft((p) => ({ ...p, status: v as SimulationStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simulacao">Simulação</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início</Label>
                <Input
                  type="date"
                  value={simDraft.start_date}
                  onChange={(e) => {
                    setManualStart(true);
                    setSimDraft((p) => ({ ...p, start_date: e.target.value }));
                  }}
                />
              </div>
              <div>
                <Label className="flex items-center justify-between">
                  <span>Fim</span>
                  {!manualEnd && simDraft.end_date && (
                    <span className="text-[10px] text-muted-foreground">auto</span>
                  )}
                </Label>
                <Input
                  type="date"
                  value={simDraft.end_date}
                  onChange={(e) => {
                    setManualEnd(true);
                    setSimDraft((p) => ({ ...p, end_date: e.target.value }));
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={simDraft.notes}
                onChange={(e) => setSimDraft((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveSim}>{editingSim ? "Guardar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação eliminar */}
      <AlertDialog open={!!simToDelete} onOpenChange={(o) => !o && setSimToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção remove permanentemente a simulação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (simToDelete) await deleteSimulation(simToDelete);
                setSimToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
