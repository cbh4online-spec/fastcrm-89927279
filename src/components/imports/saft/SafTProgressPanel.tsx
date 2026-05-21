import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSaftImportItems } from "@/hooks/imports/useSaftImport";
import type { SaftImport } from "@/hooks/imports/useSaftImport";

const actionVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  created: "default",
  updated: "secondary",
  skipped_duplicate: "outline",
  merged: "secondary",
  failed: "destructive",
};

export function SafTProgressPanel({ imp }: { imp: SaftImport }) {
  const { data: items = [] } = useSaftImportItems(imp.id);

  const summary = imp.stats?.summary ?? {};

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold">Estado: {imp.status}</p>
            {imp.error_message && (
              <p className="text-sm text-destructive">{imp.error_message}</p>
            )}
          </div>
        </div>

        {Object.keys(summary).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(summary).map(([entity, counts]: any) => (
              <div key={entity} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground capitalize">{entity}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(counts).map(([action, count]: any) => (
                    <Badge key={action} variant={actionVariant[action] ?? "outline"}>
                      {action.replace("_", " ")}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="font-medium mb-2">Últimos registos ({items.length})</p>
        <div className="max-h-96 overflow-auto text-sm">
          <table className="w-full">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Chave</th>
                <th className="text-left p-2">Acção</th>
                <th className="text-left p-2">Erro</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 100).map((it: any) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.entity_type}</td>
                  <td className="p-2 font-mono text-xs">{it.source_key}</td>
                  <td className="p-2">
                    <Badge variant={actionVariant[it.action] ?? "outline"}>{it.action}</Badge>
                  </td>
                  <td className="p-2 text-destructive text-xs">{it.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
