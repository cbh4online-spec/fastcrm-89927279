import { Helmet } from "react-helmet-async";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LeadChefLandingEditor } from "@/components/leadchef/admin/LeadChefLandingEditor";
import { LeadChefAccessManager } from "@/components/leadchef/admin/LeadChefAccessManager";
import { LeadChefAppConfigEditor } from "@/components/leadchef/admin/LeadChefAppConfigEditor";
import { ArrowLeft, ChefHat } from "lucide-react";

export default function LeadChefAdminPage() {
  const { currentWorkspace, isSuperAdmin, loading } = useWorkspace();
  const navigate = useNavigate();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">A carregar…</div>;
  if (!currentWorkspace) return <div className="p-6 text-sm text-muted-foreground">Sem workspace ativo.</div>;

  const role = currentWorkspace.role;
  const canManage = isSuperAdmin || role === "owner" || role === "admin";
  if (!canManage) return <Navigate to="/dashboard/leadchef/today" replace />;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Helmet><title>Centro LeadChef</title></Helmet>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/dashboard/leadchef/today"))}
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ChefHat className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Centro LeadChef</h1>
          <p className="text-sm text-muted-foreground">
            Conteúdos, acessos e configuração da app — geridos a partir deste workspace.
          </p>
        </div>
      </header>

      <Tabs defaultValue="landing">
        <TabsList>
          <TabsTrigger value="landing">Conteúdos da Landing</TabsTrigger>
          <TabsTrigger value="access">Acessos & Utilizadores</TabsTrigger>
          <TabsTrigger value="app">Configuração da App</TabsTrigger>
        </TabsList>

        <TabsContent value="landing" className="mt-6">
          <LeadChefLandingEditor workspaceId={currentWorkspace.id} />
        </TabsContent>
        <TabsContent value="access" className="mt-6">
          <LeadChefAccessManager workspaceId={currentWorkspace.id} />
        </TabsContent>
        <TabsContent value="app" className="mt-6">
          <LeadChefAppConfigEditor workspaceId={currentWorkspace.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
