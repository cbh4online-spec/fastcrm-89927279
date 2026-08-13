import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageElementGate } from "@/components/shared/PageElementGate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useCollectionCases } from "../hooks/useCollectionCases";
import { useRunAutoExecutor } from "../hooks/useDunningSequences";
import { CollectionsFilters } from "../components/CollectionsFilters";
import { CollectionsTable } from "../components/CollectionsTable";
import type { CollectionCaseListFilters } from "../types/collections";
import { MoreHorizontal, Play, Upload, Workflow } from "lucide-react";

export default function CollectionsInboxPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CollectionCaseListFilters>({ orderBy: "total_due" });
  const { data, isLoading, error } = useCollectionCases(filters);
  const runExecutor = useRunAutoExecutor();

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cobranças</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Casos de cobrança ativos e histórico de interações por devedor.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PageElementGate kind="action" id="run-dunning" routeKey="collections">
            <Button
              onClick={() => runExecutor.mutate()}
              disabled={runExecutor.isPending}
              className="h-10 gap-2 rounded-full px-5 font-semibold"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Executar dunning</span>
            </Button>
            </PageElementGate>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border bg-card"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <PageElementGate kind="action" id="import-statement" routeKey="collections">
                  <DropdownMenuItem onClick={() => navigate("/dashboard/collections/import")}>
                    <Upload className="h-4 w-4 mr-2" /> Importar extrato
                  </DropdownMenuItem>
                </PageElementGate>
                <PageElementGate kind="action" id="sequences" routeKey="collections">
                  <DropdownMenuItem onClick={() => navigate("/dashboard/collections/sequences")}>
                    <Workflow className="h-4 w-4 mr-2" /> Sequências
                  </DropdownMenuItem>
                </PageElementGate>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <IXCard contentClassName="p-0 px-0 pb-0">
          <div className="p-4">
            <CollectionsFilters value={filters} onChange={setFilters} />
          </div>
        </IXCard>

        {error ? (
          <IXCard>
            <p className="text-sm text-destructive">
              Erro ao carregar casos: {(error as Error).message}
            </p>
          </IXCard>
        ) : (
          <IXCard contentClassName="p-0">
            <CollectionsTable cases={data ?? []} isLoading={isLoading} />
          </IXCard>
        )}
      </div>
    </DashboardLayout>
  );
}
