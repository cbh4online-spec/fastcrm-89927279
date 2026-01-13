import { ReactNode } from "react";
import { useWorkspaceInstance, WorkspaceStatus } from "@/contexts/WorkspaceInstanceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, XCircle, Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

const statusConfig: Record<
  "suspended" | "inactive",
  {
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    color: string;
  }
> = {
  suspended: {
    icon: Clock,
    title: "Workspace Suspenso",
    description:
      "Este workspace foi temporariamente suspenso. Por favor contacte o administrador para mais informações.",
    color: "text-yellow-500",
  },
  inactive: {
    icon: XCircle,
    title: "Workspace Inativo",
    description:
      "Este workspace está inativo. Por favor contacte o suporte para reativar a sua conta.",
    color: "text-red-500",
  },
};

export function WorkspaceStatusGuard({ children }: Props) {
  const { workspaceStatus, isLoading, error } = useWorkspaceInstance();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">A carregar workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle>Erro de Configuração</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workspaceStatus === "suspended" || workspaceStatus === "inactive") {
    const config = statusConfig[workspaceStatus];
    const Icon = config.icon;

    return (
      <div className="flex h-screen items-center justify-center p-4 bg-background">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Icon className={`h-16 w-16 ${config.color}`} />
            </div>
            <CardTitle className="text-2xl">{config.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {config.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Verificar estado
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/")}
              className="w-full"
            >
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
