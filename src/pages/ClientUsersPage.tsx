import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientUsersList } from "@/components/client-users/ClientUsersList";
import { ClientUserStats } from "@/components/client-users/ClientUserStats";
import { InviteClientDialog } from "@/components/client-users/InviteClientDialog";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function ClientUsersPage() {
  const { currentWorkspace } = useWorkspace();
  
  const portalUrl = currentWorkspace?.slug 
    ? `${window.location.origin}/client/login?workspace=${currentWorkspace.slug}`
    : `${window.location.origin}/client/login`;

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

        <ClientUserStats />

        <ClientUsersList />
      </div>
    </DashboardLayout>
  );
}
