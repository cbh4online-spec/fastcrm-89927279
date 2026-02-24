import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartContactsTable } from "@/components/contacts/SmartContactsTable";
import { SmartLeadsTable } from "@/components/leads/SmartLeadsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Building2, Kanban } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const CompaniesContent = lazy(() => import("@/components/objects/CompaniesTab"));

export default function ObjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "contacts";

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Objects</h1>
            <p className="text-sm text-muted-foreground">
              Manage your contacts, companies, and deals in one place.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setSearchParams({ tab: v })}
          >
            <TabsList>
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
          </Tabs>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
