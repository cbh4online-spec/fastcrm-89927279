import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientUsersList } from "@/components/client-users/ClientUsersList";
import { ClientAnalyticsDashboard } from "@/components/client-users/ClientAnalyticsDashboard";
import { ClientCommercialInsights } from "@/components/client-users/ClientCommercialInsights";
import { InviteClientDialog } from "@/components/client-users/InviteClientDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ExternalLink, Settings, BarChart3, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

export default function ClientUsersPage() {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState("overview");

  const portalUrl = currentWorkspace?.slug
    ? `${getPublicBaseUrl()}/client/login?workspace=${currentWorkspace.slug}`
    : `${getPublicBaseUrl()}/client/login`;

  const openPortal = () => {
    window.open(portalUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Clientes B2B
            </h1>
            <p className="text-muted-foreground">
              Gerir clientes profissionais e seus acessos ao portal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Portal
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/b2b-portal">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Link>
            </Button>
            <InviteClientDialog />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="commercial" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Comercial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ClientAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <ClientUsersList />
          </TabsContent>

          <TabsContent value="commercial" className="mt-6">
            <ClientCommercialInsights />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
