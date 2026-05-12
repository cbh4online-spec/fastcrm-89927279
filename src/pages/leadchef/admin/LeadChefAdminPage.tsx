import { Helmet } from "react-helmet-async";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefLandingEditor } from "@/components/leadchef/admin/LeadChefLandingEditor";
import { LeadChefAccessManager } from "@/components/leadchef/admin/LeadChefAccessManager";
import { LeadChefAppConfigEditor } from "@/components/leadchef/admin/LeadChefAppConfigEditor";
import { ArrowLeft } from "lucide-react";

export default function LeadChefAdminPage() {
  const { currentWorkspace, isSuperAdmin, loading } = useWorkspace();
  const navigate = useNavigate();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">A carregar…</div>;
  if (!currentWorkspace) return <div className="p-6 text-sm text-muted-foreground">Sem workspace ativo.</div>;

  const role = currentWorkspace.role;
  const canManage = isSuperAdmin || role === "owner" || role === "admin";
  if (!canManage) return <Navigate to="/dashboard/leadchef/today" replace />;

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/dashboard/leadchef/today");

  return (
    <LeadChefMobileShell
      title="Centro LeadChef"
      subtitle="Conteúdos, acessos e configuração da app."
      showFab={false}
    >
      <Helmet><title>Centro LeadChef</title></Helmet>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <Tabs defaultValue="landing">
        <TabsList className="flex-wrap h-auto">
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
    </LeadChefMobileShell>
  );
}
