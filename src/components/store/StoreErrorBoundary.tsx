import { type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sentry } from "@/lib/sentry";

interface StoreErrorBoundaryProps {
  children: ReactNode;
  variant?: "page" | "section";
  workspaceSlug?: string;
}

function getWorkspaceSlug(fallback?: string) {
  if (fallback) return fallback;
  const match = window.location.pathname.match(/^\/store\/([^/]+)/);
  return match?.[1] || "";
}

function StoreErrorFallback({
  error,
  resetErrorBoundary,
  variant,
  workspaceSlug,
}: FallbackProps & Pick<StoreErrorBoundaryProps, "variant" | "workspaceSlug">) {
  if (variant === "section") {
    return (
      <div className="my-6 border-y py-6 text-center" role="alert">
        <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">Não foi possível apresentar esta secção</p>
        <Button variant="ghost" size="sm" onClick={resetErrorBoundary} className="mt-2 gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const slug = getWorkspaceSlug(workspaceSlug);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6" role="alert">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Não foi possível abrir esta página</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um problema temporário ao apresentar o produto. Tente novamente.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={resetErrorBoundary} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          {slug && (
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/store/${slug}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar à loja
              </Link>
            </Button>
          )}
        </div>
        {import.meta.env.DEV && error instanceof Error && (
          <p className="mt-4 text-xs text-muted-foreground">{error.message}</p>
        )}
      </div>
    </main>
  );
}

export function StoreErrorBoundary({
  children,
  variant = "page",
  workspaceSlug,
}: StoreErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={(props) => (
        <StoreErrorFallback {...props} variant={variant} workspaceSlug={workspaceSlug} />
      )}
      onError={(error, info) => {
        Sentry.captureException(error, {
          tags: { surface: "public-store", boundary: variant },
          extra: { componentStack: info.componentStack },
        });
      }}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}