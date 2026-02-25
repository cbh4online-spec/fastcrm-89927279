import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ReportWidget, WidgetInput } from "@/hooks/useReportWidgets";
import { BarChart3, BarChart, LineChart, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WidgetInput) => void;
  dashboardId: string;
  editingWidget?: ReportWidget | null;
  isLoading?: boolean;
}

const CHART_TYPES = [
  { value: "bar", label: "Barras", icon: BarChart3 },
  { value: "bar_stacked", label: "Barras Empilhadas", icon: BarChart },
  { value: "line", label: "Linha", icon: LineChart },
  { value: "funnel", label: "Funil", icon: GitBranch },
];

const DATASETS = [
  { value: "deals", label: "Negócios" },
  { value: "leads", label: "Leads" },
  { value: "companies", label: "Empresas" },
  { value: "people", label: "Contactos" },
];

const METRICS = [
  { value: "count", label: "Contagem" },
  { value: "sum", label: "Soma" },
  { value: "avg", label: "Média" },
];

const GROUP_BY = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "source", label: "Fonte" },
  { value: "stage", label: "Etapa" },
  { value: "owner", label: "Responsável" },
];

const SIZES = [
  { value: "sm", label: "Pequeno (1/3)" },
  { value: "md", label: "Médio (1/3)" },
  { value: "lg", label: "Grande (2/3)" },
  { value: "full", label: "Largura total" },
];

export function CreateWidgetModal({ open, onOpenChange, onSubmit, dashboardId, editingWidget, isLoading }: CreateWidgetModalProps) {
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [dataset, setDataset] = useState("deals");
  const [metric, setMetric] = useState("count");
  const [valueField, setValueField] = useState("");
  const [groupBy, setGroupBy] = useState("month");
  const [layoutSize, setLayoutSize] = useState("md");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (editingWidget) {
      setTitle(editingWidget.title);
      setChartType(editingWidget.chart_type);
      setDataset(editingWidget.dataset);
      setMetric(editingWidget.metric);
      setValueField(editingWidget.value_field || "");
      setGroupBy(editingWidget.group_by);
      setLayoutSize(editingWidget.layout_size);
      setStatusFilter((editingWidget.filters as any)?.status || "");
    } else {
      setTitle("");
      setChartType("bar");
      setDataset("deals");
      setMetric("count");
      setValueField("");
      setGroupBy("month");
      setLayoutSize("md");
      setStatusFilter("");
    }
  }, [editingWidget, open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const filters: Record<string, any> = {};
    if (statusFilter) filters.status = statusFilter;

    onSubmit({
      dashboard_id: dashboardId,
      title: title.trim(),
      chart_type: chartType,
      dataset,
      metric,
      value_field: valueField || null,
      group_by: groupBy,
      filters,
      layout_order: editingWidget?.layout_order || 0,
      layout_size: layoutSize,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingWidget ? "Editar Widget" : "Novo Widget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Receita por Mês" />
          </div>

          {/* Chart type picker */}
          <div>
            <Label>Tipo de Gráfico</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setChartType(ct.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors",
                    chartType === ct.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <ct.icon className="h-5 w-5" />
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dataset</Label>
              <Select value={dataset} onValueChange={setDataset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATASETS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Métrica</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(metric === "sum" || metric === "avg") && (
            <div>
              <Label>Campo de Valor</Label>
              <Input value={valueField} onChange={e => setValueField(e.target.value)} placeholder="Ex: value, amount" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agrupar por</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_BY.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamanho</Label>
              <Select value={layoutSize} onValueChange={setLayoutSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Filtro de Status (opcional)</Label>
            <Input value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="Ex: closed_won, open" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {editingWidget ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
