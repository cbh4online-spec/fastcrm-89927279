import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { PartnerUser } from "@/types/partner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

interface PartnerAuthContextValue {
  user: User | null;
  partnerUser: PartnerUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string, workspaceId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoPartner: boolean;
}

const PartnerAuthContext = createContext<PartnerAuthContextValue | undefined>(undefined);

/**
 * Provider único que centraliza autenticação do Partner Center.
 * Substitui múltiplas instâncias de usePartnerAuth — agora há 1 só listener
 * de auth e 1 só fetch a partner_users por sessão de browser.
 */
export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerChecked, setPartnerChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<PartnerUser | null>(null);

  const fetchPartnerUser = useCallback(async (userId: string, workspaceId?: string) => {
    setPartnerLoading(true);
    setPartnerChecked(false);

    try {
      let query = supabase
        .from("partner_users")
        .select("*")
        .eq("auth_user_id", userId)
        .eq("is_active", true);

      const wsId = workspaceId || localStorage.getItem("partner_workspace_id") || undefined;
      if (wsId) query = query.eq("workspace_id", wsId);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Partner user query timeout")), 6000)
      );

      const queryPromise = query.limit(1).maybeSingle();
      const { data, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]);

      if (fetchError) {
        console.error("[PARTNER-AUTH] Error fetching partner user:", fetchError);
        setError("Erro ao carregar perfil de parceiro");
        setPartnerUser(null);
      } else {
        setPartnerUser(data as PartnerUser | null);
        if (data) {
          prevRef.current = data as PartnerUser;
          localStorage.setItem("partner_workspace_id", (data as PartnerUser).workspace_id);
        }
        setError(null);
      }
    } catch (err) {
      console.error("[PARTNER-AUTH] Exception:", err);
      setError("Erro ao carregar perfil");
      setPartnerUser(null);
    } finally {
      setPartnerLoading(false);
      setPartnerChecked(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadingTimeout = setTimeout(() => {
      if (!isMounted) return;
      setAuthLoading(false);
      setPartnerLoading((wasLoading) => {
        if (wasLoading) {
          // Falhou a obter perfil dentro do tempo razoável → erro explícito
          setError("Não foi possível verificar a sessão. Verifique a sua ligação e tente novamente.");
        }
        return false;
      });
      setPartnerChecked(true);
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer fetch to avoid running async work inside the auth callback
        setTimeout(() => {
          if (isMounted) fetchPartnerUser(session.user.id);
        }, 0);
      } else {
        if (prevRef.current) {
          emitKernelEvent({
            workspace_id: prevRef.current.workspace_id,
            type: 'PARTNER.SESSION_EXPIRED',
            entity_kind: 'partner_user',
            entity_id: prevRef.current.id,
            source_module: 'partner-center',
            payload: { event },
          });
          prevRef.current = null;
        }
        setPartnerUser(null);
        setPartnerChecked(true);
        setError(null);
      }
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPartnerUser(session.user.id);
      } else {
        setPartnerChecked(true);
      }
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchPartnerUser]);

  const signIn = async (email: string, password: string, workspaceId?: string) => {
    setAuthLoading(true);
    setPartnerChecked(false);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setAuthLoading(false);
        setPartnerChecked(true);
        return { error: signInError };
      }

      if (data?.user) {
        setUser(data.user);
        await fetchPartnerUser(data.user.id, workspaceId);
      } else {
        setPartnerChecked(true);
      }

      setAuthLoading(false);
      return { error: null };
    } catch (err) {
      setError("Erro inesperado durante o login");
      setAuthLoading(false);
      setPartnerChecked(true);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPartnerUser(null);
    setPartnerChecked(false);
    setError(null);
    localStorage.removeItem("partner_workspace_id");
  };

  const loading = authLoading || (!!user && partnerLoading && !partnerChecked);
  const hasAuthButNoPartner = !!user && !partnerUser && !loading && partnerChecked && !error;

  return (
    <PartnerAuthContext.Provider
      value={{
        user,
        partnerUser,
        loading,
        error,
        signIn,
        signOut,
        isAuthenticated: !!user && !!partnerUser,
        hasAuthButNoPartner,
      }}
    >
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error("usePartnerAuth must be used within PartnerAuthProvider");
  return ctx;
}
