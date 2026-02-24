import { useParams, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getObjectConfig } from "@/config/objectRegistry";
import { SmartContactsTable } from "@/components/contacts/SmartContactsTable";
import { SmartCompaniesTable } from "@/components/companies/SmartCompaniesTable";
import { OpportunitiesModule } from "@/components/opportunities/OpportunitiesModule";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedViewsDropdown } from "@/components/objects/SavedViewsDropdown";

const LIST_COMPONENTS: Record<string, React.ComponentType> = {
  contacts: SmartContactsTable,
  companies: SmartCompaniesTable,
  deals: OpportunitiesModule,
};

export default function ObjectListPage() {
  const { type } = useParams<{ type: string }>();
  const config = type ? getObjectConfig(type) : undefined;

  if (!config) {
    return <Navigate to="/objects" replace />;
  }

  const ListComponent = LIST_COMPONENTS[config.slug];

  if (!ListComponent) {
    return <Navigate to="/objects" replace />;
  }

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{config.labelPt}</h1>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
            <SavedViewsDropdown entityType={config.slug === "deals" ? "opportunities" : config.slug} />
          </div>
          <ListComponent />
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
