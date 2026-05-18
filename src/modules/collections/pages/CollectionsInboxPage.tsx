import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCollectionCases } from "../hooks/useCollectionCases";
import { CollectionsFilters } from "../components/CollectionsFilters";
import { CollectionsTable } from "../components/CollectionsTable";
import type { CollectionCaseListFilters } from "../types/collections";
import { HandCoins } from "lucide-react";

export default function CollectionsInboxPage() {
  const [filters, setFilters] = useState<CollectionCaseListFilters>({ orderBy: "total_due" });
  const { data, isLoading, error } = useCollectionCases(filters);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex items-start gap-3">
          <div className="rounded-md bg-accent p-2">
            <HandCoins className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cobranças</h1>
            <p className="text-sm text-muted-foreground">
              Casos de cobrança ativos e histórico de interações por devedor.
            </p>
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
