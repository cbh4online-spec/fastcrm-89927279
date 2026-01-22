import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import {
  SuperAdminSidebar,
  OverviewSection,
  WorkspacesSection,
  BillingSection,
  AlertsSection,
  LogsSection,
  AIUsageSection,
  PlansSection,
  UsersSection,
  MenuPermissionsSection,
  FunctionalAuditSection,
} from "@/components/super-admin";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { UserRolesPanel } from "@/components/admin/UserRolesPanel";
import { WorkspaceInstancesTable } from "@/components/admin/WorkspaceInstancesTable";
import { WorkspaceInstanceForm } from "@/components/admin/WorkspaceInstanceForm";
import { WorkspaceInstance } from "@/hooks/useWorkspaceInstances";

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const [activeSection, setActiveSection] = useState("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [editInstance, setEditInstance] = useState<WorkspaceInstance | null>(null);

  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-destructive" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Não tem permissões de Super Admin para aceder a esta área.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleEdit = (instance: WorkspaceInstance) => {
    setEditInstance(instance);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditInstance(null);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "workspaces":
        return <WorkspacesSection />;
      case "users":
        return <UsersSection />;
      case "plans":
        return <PlansSection />;
      case "limits":
        return <PlansSection />; // Same component, different focus
      case "ai-usage":
        return <AIUsageSection />;
      case "subscriptions":
      case "payments":
      case "stripe-sync":
        return <BillingSection />;
      case "alerts":
      case "incidents":
        return <AlertsSection />;
      case "blocks":
        return <WorkspacesSection />; // Filter for suspended
      case "logs":
        return <LogsSection />;
      case "audit":
        return <FunctionalAuditSection />;
      case "permissions":
        return <MenuPermissionsSection />;
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações Globais</h1>
              <p className="text-muted-foreground">
                Gerir configurações do sistema e instâncias
              </p>
            </div>
            <AdminSettingsPanel />
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Gestão de Roles</h2>
              <UserRolesPanel />
            </div>
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Instâncias de Workspace</h2>
              <WorkspaceInstancesTable onEdit={handleEdit} />
            </div>
          </div>
        );
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>

      <WorkspaceInstanceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editInstance={editInstance}
      />
    </div>
  );
}
