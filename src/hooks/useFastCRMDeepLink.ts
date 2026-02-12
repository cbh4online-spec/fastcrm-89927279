import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useModuleSSO } from '@/hooks/useModuleSSO';
import { toast } from 'sonner';

interface UseFastCRMDeepLinkOptions {
  targetPath: string;
  moduleId?: string;
  fallbackBehavior?: 'navigate' | 'login';
}

export function useFastCRMDeepLink(options: UseFastCRMDeepLinkOptions) {
  const { targetPath, moduleId, fallbackBehavior = 'login' } = options;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const sso = useModuleSSO({
    moduleId: moduleId || '',
    onSuccess: (_ctx, token) => {
      const url = new URL(targetPath, window.location.origin);
      url.searchParams.set('sso_token', token);
      if (sso.nonce) url.searchParams.set('nonce', sso.nonce);
      navigate(url.pathname + url.search);
    },
    onError: (error) => {
      toast.error(error);
      if (fallbackBehavior === 'navigate') {
        navigate(targetPath);
      }
    },
  });

  const navigateToTarget = useCallback(async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(targetPath)}`);
      return;
    }

    if (moduleId && currentWorkspace?.id) {
      setIsLoading(true);
      try {
        await sso.initiateSSO();
      } finally {
        setIsLoading(false);
      }
    } else {
      navigate(targetPath);
    }
  }, [user, moduleId, currentWorkspace, targetPath, navigate, sso]);

  return {
    navigate: navigateToTarget,
    isLoading: isLoading || sso.isLoading,
  };
}
