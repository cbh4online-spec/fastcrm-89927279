import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ModuleGuardProps {
  moduleSlug: string;
  moduleName: string;
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Guard component that checks if a workspace has access to a specific module.
 * If not installed, shows a message to install from marketplace.
 */
export function ModuleGuard({ 
  moduleSlug, 
  moduleName, 
  children,
  fallbackPath = "/dashboard/marketplace"
}: ModuleGuardProps) {
  const { installedModuleIds, isLoading } = useWorkspaceModules();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const hasAccess = installedModuleIds.includes(moduleSlug);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh] p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Módulo não disponível</CardTitle>
              <CardDescription>
                O módulo <strong>{moduleName}</strong> não está instalado neste workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Para aceder a esta funcionalidade, instale o módulo através do Marketplace.
              </p>
              <Button 
                onClick={() => window.location.href = fallbackPath}
                className="w-full"
              >
                Ir para Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component for wrapping page components with module protection.
 */
export function withModuleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleSlug: string,
  moduleName: string
) {
  return function ModuleProtectedComponent(props: P) {
    return (
      <ModuleGuard moduleSlug={moduleSlug} moduleName={moduleName}>
        <WrappedComponent {...props} />
      </ModuleGuard>
    );
  };
}
