import { ReactNode, useState } from "react";
import { SJSidebar } from "./SJSidebar";
import { SJCopilotDrawer } from "./SJCopilotDrawer";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Navigate } from "react-router-dom";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { Loader2, Lock, GraduationCap, Menu, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface SJLayoutProps {
  children: ReactNode;
}

export function SJLayout({ children }: SJLayoutProps) {
  const { currentWorkspace } = useWorkspace();
  const { installedModuleIds, isLoading } = useWorkspaceModules();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!currentWorkspace) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasModule = installedModuleIds.includes("student-journey");

  if (!hasModule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Módulo Não Instalado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O módulo <strong>Student Journey</strong> não está instalado neste
              workspace. Instale-o através do Marketplace para aceder a esta
              funcionalidade.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/dashboard">
                <Button variant="outline">Voltar ao Dashboard</Button>
              </Link>
              <Link to="/dashboard/marketplace">
                <Button className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Ir ao Marketplace
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <SJSidebar
        className="hidden md:flex sticky top-0 h-screen"
        onOpenAssistant={() => setCopilotOpen(true)}
      />
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-3 py-2">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu Student Journey">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 max-w-[85vw]">
            <SheetTitle className="sr-only">Menu Student Journey</SheetTitle>
            <SJSidebar
              className="w-full border-r-0"
              onNavigate={() => setMenuOpen(false)}
              onOpenAssistant={() => {
                setMenuOpen(false);
                setCopilotOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>
        <span className="flex-1 truncate font-semibold text-foreground">Student Journey</span>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setCopilotOpen(true)}>
          <Sparkles className="h-4 w-4" />
          Copilot
        </Button>
      </header>
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">{children}</main>
      <SJCopilotDrawer open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
