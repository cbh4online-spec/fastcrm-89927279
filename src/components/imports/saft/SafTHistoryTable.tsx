import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSaftImports } from "@/hooks/imports/useSaftImport";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  failed: "destructive",
  cancelled: "destructive",
  preview_ready: "secondary",
  importing: "secondary",
  analyzing: "secondary",
  uploaded: "outline",
};

export function SafTHistoryTable({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: list = [], isLoading } = useSaftImports();

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (!list.length) return <p className="text-sm text-muted-foreground">Sem importações ainda.</p>;

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            <th className="text-left p-3">Ficheiro</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Período</th>
            <th className="text-left p-3">Faturas</th>
            <th className="text-left p-3">Estado</th>
            <th className="text-left p-3">Data</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="border-t cursor-pointer hover:bg-muted/40"
            >
              <td className="p-3 font-medium">{r.file_name}</td>
              <td className="p-3">{r.saft_type ?? "—"}</td>
              <td className="p-3">
                {r.period_start ? `${r.period_start} → ${r.period_end}` : "—"}
              </td>
              <td className="p-3">{r.stats?.invoices ?? "—"}</td>
              <td className="p-3">
                <Badge variant={statusVariant[r.status] ?? "outline"}>{r.status}</Badge>
              </td>
              <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
