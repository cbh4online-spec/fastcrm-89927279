import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Lock } from 'lucide-react';
import { useModuleSSO } from '@/hooks/useModuleSSO';
import { ACCESS_DENIED_REASONS, type SSOContextPayload, type ModuleMessage, type IntegrationMode } from '@/types/sso';
import { cn } from '@/lib/utils';

interface ModuleFrameProps {
  moduleId: string;
  appUrl: string;
  integrationMode?: IntegrationMode;
  
  // Iframe settings
  allowFullscreen?: boolean;
  allowCamera?: boolean;
  allowMicrophone?: boolean;
  sandbox?: string[];
  
  // Styling
  className?: string;
  height?: string | number;
  
  // Callbacks
  onLoad?: () => void;
  onError?: (error: string) => void;
  onMessage?: (message: ModuleMessage) => void;
  onContextReady?: (context: SSOContextPayload) => void;
}

export function ModuleFrame({
  moduleId,
  appUrl,
  integrationMode = 'embed',
  allowFullscreen = true,
  allowCamera = false,
  allowMicrophone = false,
  sandbox = ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups'],
  className,
  height = '100%',
  onLoad,
  onError,
  onMessage,
  onContextReady
}: ModuleFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const {
    initiateSSO,
    isLoading,
    error,
    errorCode,
    context,
    accessToken,
    nonce,
    reset
  } = useModuleSSO({
    moduleId,
    integrationMode,
    onSuccess: (ctx) => {
      onContextReady?.(ctx);
    },
    onError: (err) => {
      onError?.(err);
    }
  });

  // Initiate SSO on mount
  useEffect(() => {
    initiateSSO();
    return () => reset();
  }, [moduleId]);

  // Build iframe URL with SSO token
  const buildIframeUrl = useCallback(() => {
    if (!accessToken || !nonce) return null;

    const url = new URL(appUrl);
    url.searchParams.set('sso_token', accessToken);
    url.searchParams.set('nonce', nonce);
    
    return url.toString();
  }, [appUrl, accessToken, nonce]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin matches app URL
      try {
        const appOrigin = new URL(appUrl).origin;
        if (event.origin !== appOrigin) return;
      } catch {
        return;
      }

      const message = event.data as ModuleMessage;
      if (!message?.type) return;

      switch (message.type) {
        case 'context_request':
          // App is requesting context - send it
          if (context && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'context_response',
              payload: context
            }, new URL(appUrl).origin);
          }
          break;
        
        case 'close':
          // App wants to close
          reset();
          break;
        
        default:
          onMessage?.(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [appUrl, context, onMessage, reset]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIframeError(null);
    onLoad?.();
  };

  // Handle iframe error
  const handleIframeError = () => {
    const err = 'Falha ao carregar aplicação';
    setIframeError(err);
    setIframeLoaded(false);
    onError?.(err);
  };

  // Build sandbox attribute
  const sandboxAttr = sandbox.join(' ');

  // Build allow attribute
  const allowAttr = [
    allowFullscreen ? 'fullscreen' : '',
    allowCamera ? 'camera' : '',
    allowMicrophone ? 'microphone' : ''
  ].filter(Boolean).join('; ');

  // Handle retry
  const handleRetry = () => {
    setIframeError(null);
    setIframeLoaded(false);
    reset();
    initiateSSO();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("flex items-center justify-center", className)} style={{ height }}>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">A iniciar sessão segura...</p>
            <p className="text-sm text-muted-foreground">A estabelecer ligação com o módulo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state - access denied
  if (error && errorCode === 'ACCESS_DENIED') {
    return (
      <Card className={cn("flex items-center justify-center", className)} style={{ height }}>
        <CardContent className="flex flex-col items-center gap-4 py-12 max-w-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Acesso Restrito</h3>
            <p className="text-muted-foreground mt-1">
              {ACCESS_DENIED_REASONS[(error as string)] || error}
            </p>
          </div>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state - other errors
  if (error || iframeError) {
    return (
      <Card className={cn("flex items-center justify-center", className)} style={{ height }}>
        <CardContent className="flex flex-col items-center gap-4 py-12 max-w-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Erro ao carregar módulo</h3>
            <p className="text-muted-foreground mt-1">{error || iframeError}</p>
          </div>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Redirect mode
  if (integrationMode === 'redirect' && accessToken && nonce) {
    const redirectUrl = buildIframeUrl();
    return (
      <Card className={cn("flex items-center justify-center", className)} style={{ height }}>
        <CardContent className="flex flex-col items-center gap-4 py-12 max-w-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ExternalLink className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Abrir Aplicação</h3>
            <p className="text-muted-foreground mt-1">
              Clique no botão abaixo para abrir a aplicação numa nova janela com sessão autenticada.
            </p>
          </div>
          <Button onClick={() => window.open(redirectUrl!, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir {context?.module_id || 'Aplicação'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Embed mode - render iframe
  const iframeUrl = buildIframeUrl();

  if (!iframeUrl) {
    return null;
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      {/* Loading overlay */}
      {!iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A carregar módulo...</p>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className={cn(
          "w-full h-full border-0 rounded-lg",
          !iframeLoaded && "opacity-0"
        )}
        sandbox={sandboxAttr}
        allow={allowAttr}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={`Module: ${moduleId}`}
      />
    </div>
  );
}
