import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartContactsTable } from "@/components/contacts/SmartContactsTable";
import { SmartLeadsTable } from "@/components/leads/SmartLeadsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Building2, Kanban, Box } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { lazy, Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { SavedViewsDropdown } from "@/components/objects/SavedViewsDropdown";
import { CustomObjectsManager } from "@/components/objects/CustomObjectsManager";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { getExtensionObjectTabs } from "@/config/extensionRegistry";

const CompaniesContent = lazy(() => import("@/components/objects/CompaniesTab"));

export default function ObjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "contacts";
  const { installedModuleIds } = useWorkspaceModules();

  const extensionTabs = useMemo(
    () => getExtensionObjectTabs(installedModuleIds),
    [installedModuleIds]
  );

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Objects</h1>
              <p className="text-sm text-muted-foreground">
                Manage your contacts, companies, deals, and custom objects.
              </p>
            </div>
            <SavedViewsDropdown entityType={activeTab === "deals" ? "opportunities" : activeTab} />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              // If extension tab has a route, navigate there
              const extTab = extensionTabs.find(t => t.key === v);
              if (extTab?.route) {
                navigate(extTab.route);
                return;
              }
              setSearchParams({ tab: v });
            }}
          >
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="contacts" className="gap-1.5">
                <Users className="h-4 w-4" />
                Contacts
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-1.5">
                <Building2 className="h-4 w-4" />
                Companies
              </TabsTrigger>
              <TabsTrigger value="deals" className="gap-1.5">
                <Kanban className="h-4 w-4" />
                Deals
              </TabsTrigger>

              {/* Extension object tabs */}
              {extensionTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}

              <TabsTrigger value="custom" className="gap-1.5">
                <Box className="h-4 w-4" />
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts">
              <SmartContactsTable />
            </TabsContent>

            <TabsContent value="companies">
              <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <CompaniesContent />
              </Suspense>
            </TabsContent>

            <TabsContent value="deals">
              <SmartLeadsTable />
            </TabsContent>

            <TabsContent value="custom">
              <CustomObjectsManager />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
