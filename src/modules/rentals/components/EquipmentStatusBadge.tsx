import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EquipmentStatus } from "../types";

const MAP: Record<EquipmentStatus, { label: string; cls: string }> = {
  in_stock: { label: "Em stock", cls: "bg-muted text-muted-foreground" },
  assigned: { label: "Atribuído", cls: "bg-primary/10 text-primary" },
  returned: { label: "Devolvido", cls: "bg-muted text-foreground" },
  broken: { label: "Avariado", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  retired: { label: "Retirado", cls: "bg-muted text-muted-foreground line-through" },
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const v = MAP[status] ?? MAP.in_stock;
  return <Badge variant="secondary" className={cn("rounded-full font-medium", v.cls)}>{v.label}</Badge>;
}

const C_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", cls: "bg-primary/10 text-primary" },
  ended: { label: "Terminado", cls: "bg-muted text-foreground" },
  renewed: { label: "Renovado", cls: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
  defaulted: { label: "Incumprimento", cls: "bg-destructive/10 text-destructive" },
};
export function ContractStatusBadge({ status }: { status: string }) {
  const v = C_MAP[status] ?? C_MAP.draft;
  return <Badge variant="secondary" className={cn("rounded-full font-medium", v.cls)}>{v.label}</Badge>;
}
