// v4.0 - Added Kernel V2 events + structured observability logging
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { ClientUser } from "@/types/client-user";
import { emitKernelEvent } from "@/lib/kernelEmitter";

interface UseClientAuthConfig {
  workspaceId?: string;
}

interface UseClientAuthReturn {
  user: User | null;
  clientUser: ClientUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoClient: boolean;
}

export function useClientAuth(config?: UseClientAuthConfig): UseClientAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientChecked, setClientChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevClientUserRef = useRef<ClientUser | null>(null);

  const fetchClientUser = useCallback(async (userId: string) => {
    setClientLoading(true);
    setClientChecked(false);
    
    try {
      let query = supabase
        .from("client_users")
        .select("*")
        .eq("auth_user_id", userId)
        .in("status", ["active", "pending"]);
      
      // Filter by workspace if provided
      if (config?.workspaceId) {
        query = query.eq("workspace_id", config.workspaceId);
      }
      
      // Add timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Client user query timeout")), 8000)
      );
      
      const queryPromise = config?.workspaceId 
        ? query.maybeSingle()
        : query.limit(1).maybeSingle();
      
      const { data, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (fetchError) {
        console.error("Error fetching client user:", fetchError);
        setError("Erro ao carregar perfil de cliente");
        setClientUser(null);
      } else {
        setClientUser(data as ClientUser | null);
        setError(null);
      }
    } catch (err) {
      console.error("Exception fetching client user:", err);
      setError("Erro ao carregar perfil");
      setClientUser(null);
    } finally {
      setClientLoading(false);
      setClientChecked(true);
    }
  }, [config?.workspaceId]);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout - never stay in loading state forever
    const loadingTimeout = setTimeout(() => {
      if (isMounted && (authLoading || clientLoading)) {
        console.warn("Client auth: Loading timeout reached, resetting all loading states");
        setAuthLoading(false);
        setClientLoading(false);
        setClientChecked(true);
      }
    }, 10000);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("Client auth state change:", event, session?.user?.email);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchClientUser(session.user.id);
        } else {
          // Emit B2B.SESSION_EXPIRED if we had a previous client session
          if (prevClientUserRef.current) {
            const prev = prevClientUserRef.current;
            console.warn(`[B2B-AUTH] SESSION_EXPIRED client_user_id=${prev.id} workspace_id=${prev.workspace_id}`);
            emitKernelEvent({
              workspace_id: prev.workspace_id,
              type: 'B2B.SESSION_EXPIRED',
              entity_kind: 'client_user',
              entity_id: prev.id,
              source_module: 'b2b-portal',
              payload: { event },
            });
            prevClientUserRef.current = null;
          }
          setClientUser(null);
          setClientChecked(true);
          setError(null);
        }
        
        setAuthLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      console.log("Client auth initial session:", session?.user?.email);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchClientUser(session.user.id);
      } else {
        setClientChecked(true);
      }
      
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchClientUser]);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setClientChecked(false);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.warn(`[B2B-AUTH] LOGIN_FAILED email=${email} reason=${error.message}`);
        setError(error.message);
        setAuthLoading(false);
        setClientChecked(true);
        return { error };
      }
      
      // Login bem sucedido - processar directamente
      if (data?.user) {
        console.log(`[B2B-AUTH] LOGIN_OK email=${data.user.email}`);
        setUser(data.user);
        await fetchClientUser(data.user.id);

        // Emit B2B.LOGIN after client user is resolved
        if (clientUser) {
          prevClientUserRef.current = clientUser;
          emitKernelEvent({
            workspace_id: clientUser.workspace_id,
            type: 'B2B.LOGIN',
            entity_kind: 'client_user',
            entity_id: clientUser.id,
            source_module: 'b2b-portal',
            payload: { email: data.user.email },
          });
        }
      } else {
        console.warn("[B2B-AUTH] LOGIN_FAILED email=" + email + " reason=no_user_data");
        setClientChecked(true);
      }
      
      setAuthLoading(false);
      return { error: null };
    } catch (err) {
      console.warn(`[B2B-AUTH] LOGIN_FAILED email=${email} reason=${(err as Error).message}`);
      setError("Erro inesperado durante o login");
      setAuthLoading(false);
      setClientChecked(true);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setClientUser(null);
    setClientChecked(false);
    setError(null);
  };

  // Loading is TRUE if:
  // - Auth is still loading OR
  // - We have user but client is still loading
  const loading = authLoading || (!!user && clientLoading);
  
  // hasAuthButNoClient is TRUE only when EVERYTHING has been verified:
  // 1. We have authenticated user
  // 2. We DON'T have clientUser
  // 3. We're NOT in general loading
  // 4. We've already checked for clientUser (fetchClientUser finished)
  // 5. There's no error
  const hasAuthButNoClient = !!user && !clientUser && !loading && clientChecked && !error;

  return {
    user,
    clientUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!clientUser,
    hasAuthButNoClient,
  };
}
