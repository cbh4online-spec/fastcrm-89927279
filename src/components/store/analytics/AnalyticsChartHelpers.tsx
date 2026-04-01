import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

export const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
];

export const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))"];

export const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export function DualTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{format(parseISO(d.date), "dd MMM yyyy", { locale: pt })}</p>
      <p className="text-primary font-semibold">Receita: €{d.revenue?.toFixed(2)}</p>
      <p className="text-warning font-medium">Encomendas: {d.orders}</p>
      <p className="text-muted-foreground">Unidades: {d.units}</p>
    </div>
  );
}

export function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{format(parseISO(d.date), "dd MMM yyyy", { locale: pt })}</p>
      {d.paid > 0 && <p className="text-primary">Pago: {d.paid}</p>}
      {d.processing > 0 && <p className="text-info">Processamento: {d.processing}</p>}
      {d.shipped > 0 && <p className="text-warning">Enviado: {d.shipped}</p>}
      {d.delivered > 0 && <p className="text-success">Entregue: {d.delivered}</p>}
    </div>
  );
}
