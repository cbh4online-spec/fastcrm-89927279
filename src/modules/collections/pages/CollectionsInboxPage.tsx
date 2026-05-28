import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useCollectionCases } from "../hooks/useCollectionCases";
import { useRunAutoExecutor } from "../hooks/useDunningSequences";
import { CollectionsFilters } from "../components/CollectionsFilters";
import { CollectionsTable } from "../components/CollectionsTable";
import type { CollectionCaseListFilters } from "../types/collections";
import { HandCoins, Workflow, Play, Upload } from "lucide-react";

export default function CollectionsInboxPage() {
  const [filters, setFilters] = useState<CollectionCaseListFilters>({ orderBy: "total_due" });
  const { data, isLoading, error } = useCollectionCases(filters);
  const runExecutor = useRunAutoExecutor();

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-accent p-2">
              <HandCoins className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Cobranças</h1>
              <p className="text-sm text-muted-foreground">
                Casos de cobrança ativos e histórico de interações por devedor.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard/collections/import">
                <Upload className="h-4 w-4 mr-1" /> Importar extrato
              </Link>
            </Button>
            <Button variant="outline" onClick={() => runExecutor.mutate()} disabled={runExecutor.isPending}>
              <Play className="h-4 w-4 mr-1" /> Executar dunning
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/collections/sequences">
                <Workflow className="h-4 w-4 mr-1" /> Sequências
              </Link>
            </Button>
          </div>
        </header>

        <CollectionsFilters value={filters} onChange={setFilters} />

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Erro ao carregar casos: {(error as Error).message}
          </div>
        ) : (
          <CollectionsTable cases={data ?? []} isLoading={isLoading} />
        )}
      </div>
    </DashboardLayout>
  );
}
