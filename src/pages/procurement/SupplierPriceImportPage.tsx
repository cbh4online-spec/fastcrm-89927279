import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SupplierPriceImportWizard } from "@/components/procurement/price-import/SupplierPriceImportWizard";
import { PriceImportHistory } from "@/components/procurement/price-import/PriceImportHistory";

const SupplierPriceImportPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Importar Tabela de Preços</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Importe ficheiros Excel ou CSV com preços de fornecedores e atualize o catálogo automaticamente.
          </p>
        </div>

        <SupplierPriceImportWizard />
        <PriceImportHistory />
      </div>
    </DashboardLayout>
  );
};

export default SupplierPriceImportPage;
