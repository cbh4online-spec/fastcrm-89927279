import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SaftImport } from "@/hooks/imports/useSaftImport";

export function SafTPreviewPanel({ imp }: { imp: SaftImport }) {
  const s = imp.stats ?? {};
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

  const cards = [
    { label: "Clientes", value: s.customers ?? 0 },
    { label: "Produtos", value: s.products ?? 0 },
    { label: "Faturas", value: s.invoices ?? 0 },
    { label: "Linhas", value: s.invoice_lines ?? 0 },
    { label: "Pagamentos", value: s.payments ?? 0 },
    { label: "Anuladas", value: s.cancelled ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline">{imp.saft_type ?? "—"}</Badge>
          <Badge variant="secondary">v{imp.saft_version ?? "?"}</Badge>
          {imp.software_company && <Badge variant="outline">{imp.software_company}</Badge>}
          {imp.tax_registration_number && (
            <span className="text-sm text-muted-foreground">NIF {imp.tax_registration_number}</span>
          )}
          {imp.period_start && imp.period_end && (
            <span className="text-sm text-muted-foreground">
              {imp.period_start} → {imp.period_end}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total líquido</p>
            <p className="text-lg font-semibold">{fmtEur(s.total_net ?? 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">IVA</p>
            <p className="text-lg font-semibold">{fmtEur(s.total_tax ?? 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total bruto</p>
            <p className="text-lg font-semibold">{fmtEur(s.total_gross ?? 0)}</p>
          </div>
        </div>

        {typeof s.existing_invoices === "number" && (
          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">Faturas novas a importar: </span>
            <span className="font-semibold">{s.new_invoices ?? 0}</span>
            <span className="text-muted-foreground"> · já existentes (serão ignoradas): </span>
            <span className="font-semibold">{s.existing_invoices ?? 0}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
