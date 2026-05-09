import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppMode } from "@/hooks/useAppMode";
import { LEADCHEF_MODE_WHITELIST, LEADCHEF_HOME_PATH } from "@/config/appModes";

interface AppModeGuardProps {
  children: ReactNode;
}

/**
 * Guard que aplica o modo de interface activo:
 * - Em modo 'leadchef', restringe a navegação aos paths permitidos.
 * - Tentativas de aceder a outras áreas redirecionam para /dashboard/leadchef/today
 *   com toast informativo.
 * - Aplica o atributo `data-app-mode` no wrapper para o CSS scoped funcionar.
 */
export function AppModeGuard({ children }: AppModeGuardProps) {
  const { mode, isLoading } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Atualiza o <title> conforme o modo
  useEffect(() => {
    if (isLoading) return;
    const base = mode === "leadchef" ? "LeadChef" : "FastCRM";
    if (!document.title.startsWith(base)) {
      document.title = base;
    }
  }, [mode, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (mode !== "leadchef") return;

    const path = location.pathname;
    const allowed = LEADCHEF_MODE_WHITELIST.hrefPrefixes.some((p) =>
      path === p || path.startsWith(p + "/") || path.startsWith(p + "?")
    );
    // raiz e /dashboard exactos: redireciona silenciosamente
    if (path === "/" || path === "/dashboard") {
      navigate(LEADCHEF_HOME_PATH, { replace: true });
      return;
    }
    if (!allowed) {
      toast.info("Esta área não está disponível no seu plano.");
      navigate(LEADCHEF_HOME_PATH, { replace: true });
    }
  }, [mode, isLoading, location.pathname, navigate]);

  return (
    <div data-app-mode={mode} className="contents">
      {children}
    </div>
  );
}
