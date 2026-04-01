import { SalesCoreRoutes } from "@/routes/sales/SalesCoreRoutes";
import { PipelineRoutes } from "@/routes/sales/PipelineRoutes";
import { SalesAssetsRoutes } from "@/routes/sales/SalesAssetsRoutes";
import { ProspectingRoutes } from "@/routes/sales/ProspectingRoutes";
import { CommunicationRoutes } from "@/routes/sales/CommunicationRoutes";
import { RevenueOpsRoutes } from "@/routes/sales/RevenueOpsRoutes";
import { SalesMarketingRoutes } from "@/routes/sales/MarketingRoutes";
import { SalesMiscRoutes } from "@/routes/sales/MiscRoutes";

export function SalesCRMRoutes() {
  return (
    <>
      {SalesCoreRoutes()}
      {PipelineRoutes()}
      {SalesAssetsRoutes()}
      {ProspectingRoutes()}
      {CommunicationRoutes()}
      {RevenueOpsRoutes()}
      {SalesMarketingRoutes()}
      {SalesMiscRoutes()}
    </>
  );
}
