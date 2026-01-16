import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { 
  SSOTokenResponse, 
  SSOContextPayload, 
  IntegrationMode,
  ModuleSessionStatus,
  SSOErrorCode,
  SSO_ERROR_MESSAGES
} from '@/types/sso';

interface UseModuleSSOOptions {
  moduleId: string;
  integrationMode?: IntegrationMode;
  onSuccess?: (context: SSOContextPayload, token: string) => void;
  onError?: (error: string, code?: SSOErrorCode) => void;
}

interface UseModuleSSOReturn {
  initiateSSO: () => Promise<SSOTokenResponse | null>;
  isLoading: boolean;
  error: string | null;
  errorCode: SSOErrorCode | null;
  sessionStatus: ModuleSessionStatus;
  context: SSOContextPayload | null;
  accessToken: string | null;
  nonce: string | null;
  reset: () => void;
}

export function useModuleSSO(options: UseModuleSSOOptions): UseModuleSSOReturn {
  const { moduleId, integrationMode = 'embed', onSuccess, onError } = options;
  const { session } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SSOErrorCode | null>(null);
  const [context, setContext] = useState<SSOContextPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<ModuleSessionStatus>({
    isActive: false,
    sessionId: null,
    expiresAt: null,
    moduleId: null,
    error: null
  });

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setErrorCode(null);
    setContext(null);
    setAccessToken(null);
    setNonce(null);
    setSessionStatus({
      isActive: false,
      sessionId: null,
      expiresAt: null,
      moduleId: null,
      error: null
    });
  }, []);

  const initiateSSO = useCallback(async (): Promise<SSOTokenResponse | null> => {
    if (!session?.access_token) {
      const err = 'Utilizador não autenticado';
      setError(err);
      setErrorCode('MISSING_AUTH');
      onError?.(err, 'MISSING_AUTH');
      return null;
    }

    if (!currentWorkspace?.id) {
      const err = 'Workspace não selecionado';
      setError(err);
      setErrorCode('INVALID_REQUEST');
      onError?.(err, 'INVALID_REQUEST');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SSOTokenResponse>(
        'module-sso-generate-token',
        {
          body: {
            module_id: moduleId,
            integration_mode: integrationMode,
            workspace_id: currentWorkspace.id
          }
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        const code = data?.code as SSOErrorCode || 'INTERNAL_ERROR';
        const message = data?.error || 'Erro desconhecido';
        setError(message);
        setErrorCode(code);
        setSessionStatus(prev => ({ ...prev, error: message }));
        onError?.(message, code);
        return data;
      }

      // Success - store the SSO data
      const { access_token, session_id, expires_at, context: ctx, nonce: n } = data.data!;

      setAccessToken(access_token);
      setNonce(n);
      setContext(ctx);
      setSessionStatus({
        isActive: true,
        sessionId: session_id,
        expiresAt: new Date(expires_at),
        moduleId,
        error: null
      });

      onSuccess?.(ctx, access_token);
      return data;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar SSO';
      setError(message);
      setErrorCode('INTERNAL_ERROR');
      setSessionStatus(prev => ({ ...prev, error: message }));
      onError?.(message, 'INTERNAL_ERROR');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session, currentWorkspace, moduleId, integrationMode, onSuccess, onError]);

  return {
    initiateSSO,
    isLoading,
    error,
    errorCode,
    sessionStatus,
    context,
    accessToken,
    nonce,
    reset
  };
}
