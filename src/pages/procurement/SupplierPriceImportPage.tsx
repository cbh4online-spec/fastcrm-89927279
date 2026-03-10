import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { SupplierPriceImportWizard } from "@/components/procurement/price-import/SupplierPriceImportWizard";
import { PriceImportHistory } from "@/components/procurement/price-import/PriceImportHistory";

const SupplierPriceImportPage = () => {
  const { t } = useTranslation("procurement");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t("importPriceTable")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("importPriceTableDesc")}
          </p>
        </div>

        <SupplierPriceImportWizard />
        <PriceImportHistory />
      </div>
    </DashboardLayout>
  );
};

export default SupplierPriceImportPage;