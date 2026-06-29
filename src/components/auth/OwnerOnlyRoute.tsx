import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isOwnerWorkspace } from "@/config/ownerOnlyRoutes";
import { Lock } from "lucide-react";

interface OwnerOnlyRouteProps {
  children: ReactNode;
  /** Quando true, redireciona para /dashboard em vez de mostrar mensagem */
  redirect?: boolean;
}

/**
 * Bloqueia rotas que só podem ser usadas pelo workspace dono do produto
 * (apresentação comercial interna FastCRM / METODOPARE).
 */
export function OwnerOnlyRoute({ children, redirect = false }: OwnerOnlyRouteProps) {
  const { currentWorkspace, loading } = useWorkspace();

  if (loading) return null;
  if (isOwnerWorkspace(currentWorkspace?.slug)) return <>{children}</>;

  if (redirect) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex flex-col items-center justify-center text-center p-10 min-h-[60vh] max-w-xl mx-auto">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Indisponível neste workspace</h1>
      <p className="text-muted-foreground">
        Esta apresentação comercial está reservada ao workspace interno do FastCRM
        (METODOPARE). Para gerar propostas e apresentações no teu workspace, usa
        <span className="font-medium text-foreground"> Propostas</span> em
        Vendas &amp; Financeiro.
      </p>
    </div>
  );
}
