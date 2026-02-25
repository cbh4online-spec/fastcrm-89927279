import { useParams, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getObjectConfig } from "@/config/objectRegistry";
import { SmartContactsTable } from "@/components/contacts/SmartContactsTable";
import { SmartCompaniesTable } from "@/components/companies/SmartCompaniesTable";
import { OpportunitiesModule } from "@/components/opportunities/OpportunitiesModule";
import { AttioObjectListView } from "@/components/objects/AttioObjectListView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedViewsDropdown } from "@/components/objects/SavedViewsDropdown";
import { useCustomObjects } from "@/hooks/useCustomObjects";
import { Loader2 } from "lucide-react";

const LIST_COMPONENTS: Record<string, React.ComponentType> = {
  contacts: SmartContactsTable,
  companies: SmartCompaniesTable,
  deals: OpportunitiesModule,
};

export default function ObjectListPage() {
  const { type } = useParams<{ type: string }>();
  const config = type ? getObjectConfig(type) : undefined;
  const { data: customObjects, isLoading: loadingObjects } = useCustomObjects();

  // Core object — use specialized component
  if (config) {
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

  // Custom object — lookup by slug
  if (loadingObjects) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const customObj = customObjects?.find((o) => o.slug === type);
  if (!customObj) {
    return <Navigate to="/objects" replace />;
  }

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6">
          <AttioObjectListView
            objectId={customObj.id}
            objectSlug={customObj.slug}
            objectName={customObj.name}
            objectIcon={customObj.icon}
            objectColor={customObj.color}
          />
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
