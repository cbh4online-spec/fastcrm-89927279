import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTicketSLARules, type SLARule } from "@/hooks/tickets/useTicketSLARules";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { Clock, Save, AlertTriangle, Shield, Info } from "lucide-react";
import { toast } from "sonner";
import Skeleton from "react-loading-skeleton";

const PRIORITIES = [
  { value: "urgent", label: "Urgente", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "high", label: "Alta", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "medium", label: "Média", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "low", label: "Baixa", color: "bg-muted text-muted-foreground border-border" },
];

interface EditableRow {
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  escalation_after_hours: number | null;
  escalate_to: string | null;
  is_active: boolean;
}

const DEFAULT_ROWS: EditableRow[] = [
  { priority: "urgent", first_response_hours: 1, resolution_hours: 4, escalation_after_hours: 2, escalate_to: null, is_active: true },
  { priority: "high", first_response_hours: 2, resolution_hours: 8, escalation_after_hours: 4, escalate_to: null, is_active: true },
  { priority: "medium", first_response_hours: 4, resolution_hours: 24, escalation_after_hours: 8, escalate_to: null, is_active: true },
  { priority: "low", first_response_hours: 8, resolution_hours: 48, escalation_after_hours: null, escalate_to: null, is_active: true },
];

export default function HelpdeskSLAPolicies() {
  const { rules, isLoading, upsert } = useTicketSLARules();
  const { data: agents } = useAgentMembers();
  const [editRows, setEditRows] = useState<EditableRow[] | null>(null);

  const displayRows = editRows || (rules.length > 0
    ? PRIORITIES.map((p) => {
        const existing = rules.find((r) => r.priority === p.value);
        return existing
          ? { priority: existing.priority, first_response_hours: existing.first_response_hours, resolution_hours: existing.resolution_hours, escalation_after_hours: existing.escalation_after_hours, escalate_to: existing.escalate_to, is_active: existing.is_active }
          : DEFAULT_ROWS.find((d) => d.priority === p.value)!;
      })
    : DEFAULT_ROWS);

  const updateRow = (idx: number, field: keyof EditableRow, value: any) => {
    const rows = [...displayRows];
    rows[idx] = { ...rows[idx], [field]: value };
    setEditRows(rows);
  };

  const handleSaveAll = async () => {
    const rows = editRows || displayRows;
    for (const row of rows) {
      await upsert.mutateAsync({
        priority: row.priority,
        first_response_hours: row.first_response_hours,
        resolution_hours: row.resolution_hours,
        escalation_after_hours: row.escalation_after_hours,
        escalate_to: row.escalate_to,
        is_active: row.is_active,
      });
    }
    setEditRows(null);
    toast.success("Políticas SLA guardadas com sucesso");
  };

  const getPriorityMeta = (p: string) => PRIORITIES.find((x) => x.value === p) || PRIORITIES[3];

  const formatPreview = (row: EditableRow) => {
    const p = getPriorityMeta(row.priority);
    return `Um ticket ${p.label.toLowerCase()} deve ser respondido em ${row.first_response_hours}h e resolvido em ${row.resolution_hours}h`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Políticas SLA</h1>
            <p className="text-muted-foreground text-sm">Configure os tempos de resposta e resolução por prioridade</p>
          </div>
          <Button onClick={handleSaveAll} disabled={upsert.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Tudo
          </Button>
        </div>

        {/* Business Hours Info */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Horário de trabalho</p>
              <p className="text-xs text-muted-foreground">
                Os cálculos de SLA consideram horário laboral: <strong>09:00 — 18:00</strong>, Segunda a Sexta (Europe/Lisbon).
                Fins de semana e feriados não são contabilizados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SLA Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Regras por Prioridade
            </CardTitle>
            <CardDescription>Defina os tempos máximos de 1ª resposta, resolução e escalação para cada nível de prioridade.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={48} />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Prioridade</TableHead>
                    <TableHead>1ª Resposta (h)</TableHead>
                    <TableHead>Resolução (h)</TableHead>
                    <TableHead>Escalação após (h)</TableHead>
                    <TableHead>Escalar para</TableHead>
                    <TableHead className="w-[80px]">Ativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((row, idx) => {
                    const meta = getPriorityMeta(row.priority);
                    return (
                      <TableRow key={row.priority}>
                        <TableCell>
                          <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-20 h-8 text-sm"
                            value={row.first_response_hours}
                            onChange={(e) => updateRow(idx, "first_response_hours", parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-20 h-8 text-sm"
                            value={row.resolution_hours}
                            onChange={(e) => updateRow(idx, "resolution_hours", parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-20 h-8 text-sm"
                            value={row.escalation_after_hours ?? ""}
                            placeholder="—"
                            onChange={(e) => updateRow(idx, "escalation_after_hours", e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.escalate_to || "none"}
                            onValueChange={(v) => updateRow(idx, "escalate_to", v === "none" ? null : v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[160px]">
                              <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {agents?.map((a) => (
                                <SelectItem key={a.user_id} value={a.user_id}>
                                  {a.profile?.full_name || a.profile?.email || "Agente"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(v) => updateRow(idx, "is_active", v)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Resumo das Políticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayRows.filter((r) => r.is_active).map((row) => {
                const meta = getPriorityMeta(row.priority);
                return (
                  <div key={row.priority} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                    <span className="text-muted-foreground">{formatPreview(row)}</span>
                    {row.escalation_after_hours && (
                      <span className="text-muted-foreground">
                        · Escala após {row.escalation_after_hours}h
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
