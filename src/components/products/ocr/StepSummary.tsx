import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ProductContentData, ProductSheetData, SalesSupportData } from "./types";

interface Props {
  sheet: ProductSheetData;
  content: ProductContentData;
  sales: SalesSupportData;
  pendingFields: string[];
  creating: boolean;
  onCreate: () => void;
}

export function StepSummary({ sheet, content, sales, pendingFields, creating, onCreate }: Props) {
  const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value || <em className="text-muted-foreground/60">Pendente</em>}</span>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" />Resumo antes de criar</CardTitle>
          <CardDescription>Revê tudo antes de gravar o produto em rascunho.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h4 className="font-semibold text-sm mb-2">Dados principais</h4>
            <Row label="Nome" value={sheet.name} />
            <Row label="Marca" value={sheet.brand} />
            <Row label="Linha" value={sheet.line} />
            <Row label="Categoria" value={sheet.category} />
            <Row label="Volume" value={sheet.volume_text} />
            <Row label="EAN" value={sheet.barcode} />
            <Row label="País" value={sheet.origin_country} />
          </section>
          <section>
            <h4 className="font-semibold text-sm mb-2">Comercial</h4>
            <Row label="PVP" value={sheet.base_price ? `${sheet.base_price} €` : null} />
            <Row label="Custo" value={sheet.direct_cost ? `${sheet.direct_cost} €` : null} />
            <Row label="IVA" value={sheet.tax_rate_estimate_pct ? `${sheet.tax_rate_estimate_pct} %` : null} />
            <Row label="Stock" value={sheet.stock_quantity} />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo gerado</CardTitle>
          <CardDescription>Loja, catálogo e atendimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Descrição curta</p>
            <p>{content.short_description || <em className="text-muted-foreground/60">Pendente</em>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Posicionamento</p>
            <p>{sales.positioning || <em className="text-muted-foreground/60">Pendente</em>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">FAQs geradas</p>
            <p>{sales.faqs.length} pergunta(s) · {sales.objections.length} objeção(ões)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Experiência sensorial / olfativa</p>
            <p className="text-xs">{content.sensory_experience || "—"}{content.olfactory_experience ? ` · ${content.olfactory_experience}` : ""}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" />Campos pendentes de validação manual</CardTitle>
          <CardDescription>Serão criadas tarefas de validação para cada um destes campos.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem campos pendentes 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pendingFields.map((f) => (
                <Badge key={f} variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-700">{f}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button size="lg" onClick={onCreate} disabled={creating || !sheet.name.trim()}>
          {creating ? "A criar…" : "Criar Produto em Rascunho"}
        </Button>
      </div>
    </div>
  );
}
