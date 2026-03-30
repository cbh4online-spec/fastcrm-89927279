import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function FallbackUI({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Algo correu mal</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error?.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </Button>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  fallback?: React.ComponentType<FallbackProps>;
}

export function AppErrorBoundary({ children, onReset, fallback }: AppErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ?? FallbackUI}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}
