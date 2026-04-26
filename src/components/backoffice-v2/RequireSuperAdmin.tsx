import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Guard para rotas /super-admin-v2/*. Bloqueia acesso a:
 * - utilizadores não autenticados (redireciona /login)
 * - utilizadores sem role super_admin (mostra ecrã "Acesso restrito")
 *
 * Componente puramente client-side — a proteção real continua a ser feita
 * pelas RLS policies do Supabase. Este wrapper apenas evita render/queries
 * desnecessárias e dá feedback visual ao utilizador.
 */
export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isSuperAdmin) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-rose-50">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Acesso restrito</h1>
          <p className="mt-1 text-sm text-slate-500">
            Esta área está reservada a Super Administradores do FastCRM.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
