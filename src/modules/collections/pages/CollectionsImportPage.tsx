import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, ArrowLeft, FileText, CheckCircle2, AlertCircle, RotateCw, Trash2, Wand2 } from "lucide-react";
import {
  useCollectionImports,
  useCollectionImportItems,
  useUploadAndAnalyze,
  useApplyImport,
  useAutoCreateAndApply,
  useDeleteImport,
} from "../hooks/useCollectionImports";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Carregado",
  analyzing: "A analisar",
  review: "Pré-visualização",
  importing: "A importar",
  completed: "Concluído",
  failed: "Falhou",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  review: "secondary",
  analyzing: "outline",
  importing: "secondary",
  failed: "destructive",
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function CollectionsImportPage() {
  const { data: imports = [], isLoading } = useCollectionImports();
  const upload = useUploadAndAnalyze();
  const apply = useApplyImport();
  const autoApply = useAutoCreateAndApply();
  const del = useDeleteImport();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = imports.find((i) => i.id === selectedId) || null;
  const { data: items = [] } = useCollectionImportItems(selectedId);

  const itemStats = useMemo(() => {
    const by: Record<string, number> = {};
    for (const it of items as any[]) by[it.action] = (by[it.action] || 0) + 1;
    return by;
  }, [items]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    const id = await upload.mutateAsync(f);
    if (id) setSelectedId(id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard/collections">
                <ArrowLeft className="h-4 w-4 mr-1" /> Cobranças
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Importar extrato (ARTSOFT)</h1>
              <p className="text-sm text-muted-foreground">
                Carrega o PDF "Extrato de Clientes C/C — Documentos por saldar" para criar/atualizar faturas e abrir casos de cobrança.
              </p>
            </div>
          </div>
          <div>
            <input id="cim-file" type="file" accept="application/pdf" className="hidden" onChange={onFile} />
            <Button asChild disabled={upload.isPending}>
              <label htmlFor="cim-file" className="cursor-pointer">
                {upload.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A analisar…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-1" /> Carregar PDF</>
                )}
              </label>
            </Button>
          </div>
        </header>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Histórico de importações</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem importações ainda. Carrega um PDF para começar.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Ficheiro</th>
                    <th className="text-left p-2">Data ref.</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-right p-2">Clientes</th>
                    <th className="text-right p-2">Documentos</th>
                    <th className="text-right p-2">Total em aberto</th>
                    <th className="text-right p-2">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => {
                    const s = imp.stats || {};
                    const isSelected = selectedId === imp.id;
                    return (
                      <tr key={imp.id} className={`border-b cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-muted/40" : ""}`} onClick={() => setSelectedId(imp.id)}>
                        <td className="p-2 flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {imp.file_name}</td>
                        <td className="p-2">{imp.reference_date || "—"}</td>
                        <td className="p-2"><Badge variant={STATUS_VARIANT[imp.status] || "outline"}>{STATUS_LABEL[imp.status] || imp.status}</Badge></td>
                        <td className="p-2 text-right">{s.total_clients ?? "—"}</td>
                        <td className="p-2 text-right">{s.total_docs ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{fmtEur(s.total_due || 0)}</td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            {(imp.status === "review" || imp.status === "completed" || imp.status === "failed") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={autoApply.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(imp.id);
                                  if (confirm("Vai criar automaticamente todas as empresas/contactos em falta e aplicar a importação. Continuar?")) {
                                    autoApply.mutate(imp.id);
                                  }
                                }}
                                title="Auto-criar empresas em falta e aplicar"
                              >
                                {autoApply.isPending && selectedId === imp.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wand2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Eliminar esta importação?")) del.mutate(imp.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {selected && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selected.file_name}</h2>
                <p className="text-xs text-muted-foreground">Importação {selected.id.slice(0, 8)} · {STATUS_LABEL[selected.status]}</p>
              </div>
              <div className="flex gap-2">
                {(itemStats.needs_mapping || 0) > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm(`Vai criar automaticamente ${itemStats.needs_mapping} empresas/contactos em falta e aplicar. Continuar?`)) {
                        autoApply.mutate(selected.id);
                      }
                    }}
                    disabled={autoApply.isPending}
                  >
                    {autoApply.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A criar e aplicar…</> : <><Wand2 className="h-4 w-4 mr-1" /> Auto-criar {itemStats.needs_mapping} e aplicar</>}
                  </Button>
                )}
                {(selected.status === "review" || selected.status === "failed") && (
                  <Button onClick={() => apply.mutate(selected.id)} disabled={apply.isPending}>
                    {apply.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A aplicar…</> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Aplicar importação</>}
                  </Button>
                )}
                {selected.status === "completed" && (
                  <Button variant="outline" onClick={() => apply.mutate(selected.id)}>
                    <RotateCw className="h-4 w-4 mr-1" /> Reaplicar
                  </Button>
                )}
              </div>
            </div>

            {selected.error_message && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{selected.error_message}</span>
              </div>
            )}

            {selected.status === "importing" && <Progress value={undefined as any} className="h-2" />}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Pendentes", value: itemStats.pending || 0 },
                { label: "Por mapear", value: itemStats.needs_mapping || 0 },
                { label: "Criadas", value: itemStats.create_invoice || 0 },
                { label: "Atualizadas", value: itemStats.update_invoice || 0 },
                { label: "Falhadas", value: itemStats.failed || 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Documento</th>
                    <th className="text-left p-2">Venc.</th>
                    <th className="text-right p-2">Saldo</th>
                    <th className="text-left p-2">Acção</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as any[]).slice(0, 200).map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="p-2">#{it.client_number} {it.client_name}</td>
                      <td className="p-2 font-mono">{it.doc_third_no || it.doc_no}</td>
                      <td className="p-2">{it.due_date}</td>
                      <td className="p-2 text-right font-mono">{fmtEur(Number(it.balance) || 0)}</td>
                      <td className="p-2">
                        <Badge variant={it.action === "failed" ? "destructive" : it.action === "needs_mapping" ? "outline" : "secondary"}>
                          {it.action}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 200 && (
                <p className="p-2 text-xs text-muted-foreground text-center">A mostrar 200 de {items.length} linhas.</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
