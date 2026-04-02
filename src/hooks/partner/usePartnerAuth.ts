import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { PartnerUser } from "@/types/partner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

interface UsePartnerAuthConfig {
  workspaceId?: string;
}

interface UsePartnerAuthReturn {
  user: User | null;
  partnerUser: PartnerUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoPartner: boolean;
}

export function usePartnerAuth(config?: UsePartnerAuthConfig): UsePartnerAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerChecked, setPartnerChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<PartnerUser | null>(null);

  const fetchPartnerUser = useCallback(async (userId: string) => {
    setPartnerLoading(true);
    setPartnerChecked(false);

    try {
      let query = supabase
        .from("partner_users")
        .select("*")
        .eq("auth_user_id", userId)
        .eq("is_active", true);

      if (config?.workspaceId) {
        query = query.eq("workspace_id", config.workspaceId);
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Partner user query timeout")), 8000)
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
  }, [config?.workspaceId]);

  useEffect(() => {
    let isMounted = true;

    const loadingTimeout = setTimeout(() => {
      if (isMounted && (authLoading || partnerLoading)) {
        setAuthLoading(false);
        setPartnerLoading(false);
        setPartnerChecked(true);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchPartnerUser(session.user.id);
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
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchPartnerUser(session.user.id);
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

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setPartnerChecked(false);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setAuthLoading(false);
        setPartnerChecked(true);
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        await fetchPartnerUser(data.user.id);
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

  const loading = authLoading || (!!user && partnerLoading);
  const hasAuthButNoPartner = !!user && !partnerUser && !loading && partnerChecked && !error;

  return {
    user,
    partnerUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!partnerUser,
    hasAuthButNoPartner,
  };
}
