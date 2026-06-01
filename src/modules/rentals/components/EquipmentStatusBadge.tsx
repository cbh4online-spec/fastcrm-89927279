import { Badge } from "@/components/ui/badge";
import type { EquipmentStatus } from "../types";

const MAP: Record<EquipmentStatus, { label: string; cls: string }> = {
  in_stock: { label: "Em stock", cls: "bg-slate-100 text-slate-700" },
  assigned: { label: "Atribuído", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Devolvido", cls: "bg-blue-100 text-blue-700" },
  broken: { label: "Avariado", cls: "bg-amber-100 text-amber-700" },
  retired: { label: "Retirado", cls: "bg-rose-100 text-rose-700" },
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const v = MAP[status] ?? MAP.in_stock;
  return <Badge variant="secondary" className={v.cls}>{v.label}</Badge>;
}

const C_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-slate-100 text-slate-700" },
  active: { label: "Ativo", cls: "bg-emerald-100 text-emerald-700" },
  ended: { label: "Terminado", cls: "bg-blue-100 text-blue-700" },
  renewed: { label: "Renovado", cls: "bg-violet-100 text-violet-700" },
  cancelled: { label: "Cancelado", cls: "bg-rose-100 text-rose-700" },
  defaulted: { label: "Incumprimento", cls: "bg-red-100 text-red-700" },
};
export function ContractStatusBadge({ status }: { status: string }) {
  const v = C_MAP[status] ?? C_MAP.draft;
  return <Badge variant="secondary" className={v.cls}>{v.label}</Badge>;
}
