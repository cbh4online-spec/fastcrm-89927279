import { ReactNode, useEffect } from "react";

interface AppModeGuardProps {
  children: ReactNode;
}

/**
 * Guard simplificado: apenas mantém o título FastCRM.
 * O modo LeadChef foi removido.
 */
export function AppModeGuard({ children }: AppModeGuardProps) {
  useEffect(() => {
    if (!document.title.startsWith("FastCRM")) {
      document.title = "FastCRM";
    }
  }, []);

  return (
    <div data-app-mode="fastcrm" className="contents">
      {children}
    </div>
  );
}
