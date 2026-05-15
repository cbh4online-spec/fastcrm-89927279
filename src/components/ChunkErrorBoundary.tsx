import { Component, ReactNode } from "react";

const isStaleChunkError = (err: unknown): boolean => {
  const message =
    (typeof err === "string" ? err : (err as Error)?.message) || "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    message,
  );
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reloading: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reloading: false };

  static getDerivedStateFromError(error: Error): State | null {
    if (isStaleChunkError(error)) {
      return { hasError: true, reloading: false };
    }
    // Not a chunk error — don't claim it; let it bubble.
    return null;
  }

  handleManualReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            {this.state.reloading ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  A atualizar a aplicação…
                </p>
                <p className="text-xs text-muted-foreground">
                  Estamos a carregar a versão mais recente.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Não foi possível carregar este ecrã
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique a sua ligação e tente novamente.
                </p>
                <button
                  onClick={this.handleManualReload}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Tentar novamente
                </button>
              </>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
