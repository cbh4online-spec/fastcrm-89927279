import type { ReactNode } from "react";
import { useLeadChefPermissions } from "@/hooks/leadchef/useLeadChefPermissions";
import { Loader2, ShieldOff } from "lucide-react";

interface Props {
  children: ReactNode;
  requireManager?: boolean;
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export function LeadChefPermissionGate({ children, requireManager, requireAdmin, fallback }: Props) {
  const perms = useLeadChefPermissions();

  if (perms.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const ok = requireAdmin ? perms.isAdmin : requireManager ? perms.isManager : true;
  if (!ok) {
    return (
      fallback ?? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <ShieldOff className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">
            Esta área está disponível para líderes e administradores.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
