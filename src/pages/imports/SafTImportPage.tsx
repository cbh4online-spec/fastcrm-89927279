import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { SafTUploader } from "@/components/imports/saft/SafTUploader";
import { SafTPreviewPanel } from "@/components/imports/saft/SafTPreviewPanel";
import { SafTMappingPanel, type SafTImportOpts } from "@/components/imports/saft/SafTMappingPanel";
import { SafTProgressPanel } from "@/components/imports/saft/SafTProgressPanel";
import { SafTHistoryTable } from "@/components/imports/saft/SafTHistoryTable";
import {
  useUploadSaft,
  useSaftImport,
  useRunSaftImport,
} from "@/hooks/imports/useSaftImport";

export default function SafTImportPage() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [opts, setOpts] = useState<SafTImportOpts>({
    create_customers: true,
    create_products: true,
    import_payments: true,
  });

  const upload = useUploadSaft();
  const run = useRunSaftImport();
  const { data: imp } = useSaftImport(currentId ?? undefined);

  const phase = !currentId
    ? "upload"
    : imp?.status === "analyzing" || imp?.status === "uploaded"
    ? "analyzing"
    : imp?.status === "preview_ready"
    ? "preview"
    : imp?.status === "importing" || imp?.status === "completed" || imp?.status === "failed"
    ? "progress"
    : "upload";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <header>
          <h1 className="text-2xl font-semibold">Importar histórico de vendas (SAF-T PT)</h1>
          <p className="text-sm text-muted-foreground">
            Importa o ficheiro SAF-T PT do teu software de gestão (PHC, Primavera, Sage, Moloni, InvoiceXpress, Toconline, …).
            Os documentos são desduplicados por número de fatura e ficam disponíveis em Faturas e KPIs financeiros.
          </p>
        </header>

        {phase === "upload" && (
          <>
            <SafTUploader onFile={async (f) => {
              const id = await upload.mutateAsync(f);
              setCurrentId(id);
            }} uploading={upload.isPending} />
          </>
        )}

        {phase === "analyzing" && (
          <Card className="p-8 text-center">
            <p className="font-medium">A analisar o ficheiro…</p>
            <p className="text-sm text-muted-foreground">Validação do header AT e contagem de documentos.</p>
          </Card>
        )}

        {phase === "preview" && imp && (
          <>
            <SafTPreviewPanel imp={imp} />
            <SafTMappingPanel value={opts} onChange={setOpts} />
            <div className="flex gap-2">
              <Button
                onClick={() => run.mutate({ importId: imp.id, options: opts })}
                disabled={run.isPending}
              >
                {run.isPending ? "A importar…" : "Confirmar e importar"}
              </Button>
              <Button variant="outline" onClick={() => setCurrentId(null)}>
                Cancelar
              </Button>
            </div>
          </>
        )}

        {phase === "progress" && imp && (
          <>
            <SafTProgressPanel imp={imp} />
            <Button variant="outline" onClick={() => setCurrentId(null)}>
              Nova importação
            </Button>
          </>
        )}

        <Separator />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Histórico de importações</h2>
          <SafTHistoryTable onSelect={(id) => setCurrentId(id)} />
        </section>
      </div>
    </DashboardLayout>
  );
}
