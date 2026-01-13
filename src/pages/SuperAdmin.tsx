import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceInstancesTable } from "@/components/admin/WorkspaceInstancesTable";
import { WorkspaceInstanceForm } from "@/components/admin/WorkspaceInstanceForm";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { UserRolesPanel } from "@/components/admin/UserRolesPanel";
import { WorkspaceInstance } from "@/hooks/useWorkspaceInstances";
import { Plus, Settings, Database, Users, ShieldCheck, Loader2 } from "lucide-react";

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const [formOpen, setFormOpen] = useState(false);
  const [editInstance, setEditInstance] = useState<WorkspaceInstance | null>(null);

  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Super Admin</h1>
          </div>
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="instances" className="space-y-6">
          <TabsList>
            <TabsTrigger value="instances" className="gap-2">
              <Database className="h-4 w-4" />
              Instâncias
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Users className="h-4 w-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instances" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Instâncias de Workspace</h2>
                <p className="text-muted-foreground">
                  Configure as instâncias Supabase para cada workspace
                </p>
              </div>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Instância
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <WorkspaceInstancesTable onEdit={handleEdit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Configurações Globais</h2>
              <p className="text-muted-foreground">
                Gerir configurações do sistema e integrações
              </p>
            </div>
            <AdminSettingsPanel />
          </TabsContent>

          <TabsContent value="roles">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Gestão de Roles</h2>
              <p className="text-muted-foreground">
                Atribuir roles de administrador aos utilizadores
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <UserRolesPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <WorkspaceInstanceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editInstance={editInstance}
      />
    </div>
  );
}
