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
import { SafTPaymentsReport } from "@/components/imports/saft/SafTPaymentsReport";

import { SafTStageIndicator } from "@/components/imports/saft/SafTStageIndicator";
import { SafTHistoryTable } from "@/components/imports/saft/SafTHistoryTable";
import {
  useUploadSaft,
  useSaftImport,
  useAnalyzeSaft,
  useRunSaftImport,
} from "@/hooks/imports/useSaftImport";

export default function SafTImportPage() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [autoAnalyzeId, setAutoAnalyzeId] = useState<string | null>(null);
  const [opts, setOpts] = useState<SafTImportOpts>({
    create_customers: true,
    create_products: true,
    import_payments: true,
  });

  const upload = useUploadSaft();
  const analyze = useAnalyzeSaft();
  const run = useRunSaftImport();
  const { data: imp } = useSaftImport(currentId ?? undefined);

  useEffect(() => {
    if (imp?.status === "uploaded" && autoAnalyzeId !== imp.id && !analyze.isPending) {
      setAutoAnalyzeId(imp.id);
      analyze.mutate(imp.id);
    }
  }, [imp?.id, imp?.status, autoAnalyzeId, analyze.isPending]);

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
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Importar histórico de vendas (SAF-T PT)</h1>
            <p className="text-sm text-muted-foreground">
              Importa o ficheiro SAF-T PT do teu software de gestão (PHC, Primavera, Sage, Moloni, InvoiceXpress, Toconline, …).
              Os documentos são desduplicados por número de fatura e ficam disponíveis em Faturas e KPIs financeiros.
            </p>
          </div>
          {currentId && (
            <Button onClick={() => setCurrentId(null)} className="shrink-0">
              Nova importação
            </Button>
          )}
        </header>

        {currentId && imp && (
          <SafTStageIndicator status={imp.status} errorMessage={imp.error_message} />
        )}

        {phase === "upload" && (
          <>
            <SafTUploader onFile={async (f) => {
              const id = await upload.mutateAsync(f);
              setCurrentId(id);
            }} uploading={upload.isPending} />
          </>
        )}

        {phase === "analyzing" && (
          <AnalyzingCard
            startedAt={imp?.started_at ?? imp?.created_at}
            status={imp?.status}
            progress={(imp?.stats as any)?.progress}
            error={
              analyze.error instanceof Error
                ? analyze.error.message
                : (imp?.status === "failed" ? imp?.error_message ?? undefined : undefined)
            }
            onRetry={() => {
              if (!imp) return;
              setAutoAnalyzeId(null);
              analyze.mutate(imp.id);
            }}
          />
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
            <SafTPaymentsReport importId={imp.id} isLive={imp.status === "importing"} />
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

interface AnalyzeProgress {
  customers?: number;
  products?: number;
  invoices?: number;
  payments?: number;
}

function AnalyzingCard({
  startedAt,
  status,
  error,
  progress,
  onRetry,
}: {
  startedAt?: string;
  status?: string;
  error?: string;
  progress?: AnalyzeProgress;
  onRetry?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - t0) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Progresso estimado: análise dura tipicamente 5–60s. Subida assintótica até 95%.
  const pct = error
    ? 0
    : status === "uploaded"
    ? Math.min(25, Math.round((1 - Math.exp(-elapsed / 10)) * 100))
    : Math.min(95, Math.round((1 - Math.exp(-elapsed / 15)) * 100));

  const counts = progress
    ? [
        progress.invoices ? `${progress.invoices.toLocaleString("pt-PT")} faturas` : null,
        progress.customers ? `${progress.customers.toLocaleString("pt-PT")} clientes` : null,
        progress.products ? `${progress.products.toLocaleString("pt-PT")} artigos` : null,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <Card className="p-8 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="flex-1">
          <p className="font-medium">{error ? "Não foi possível analisar o ficheiro" : status === "uploaded" ? "A iniciar análise…" : "A analisar o ficheiro…"}</p>
          <p className="text-sm text-muted-foreground">
            {error
              ? error
              : counts
              ? `Lidos ${counts}. Decorrido: ${elapsed}s`
              : `Validação do header AT e contagem de documentos. Decorrido: ${elapsed}s`}
          </p>
        </div>

        <span className="font-mono text-sm text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      {error && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Repetir análise
        </Button>
      )}
    </Card>
  );
}
